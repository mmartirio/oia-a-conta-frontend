import { useState, useEffect } from 'react'
import { billingApi, type Contrato } from '../../api/billingApi'
import { gestorApi, type UsuarioAdmin } from '../../api/gestorApi'
import { Button } from '../../components/ui/Button'
import styles from './Gestor.module.css'

export function GestorEmpresas() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal reset senha
  const [resetModal, setResetModal] = useState<Contrato | null>(null)
  const [admins, setAdmins] = useState<UsuarioAdmin[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [resetResult, setResetResult] = useState<{ nome: string; novaSenha: string } | null>(null)
  const [resetting, setResetting] = useState(false)

  // Modal status
  const [statusModal, setStatusModal] = useState<Contrato | null>(null)
  const [novoStatus, setNovoStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => {
    billingApi.listarContratos()
      .then(r => setContratos(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = contratos.filter(c =>
    search === '' ||
    String(c.restauranteId).includes(search) ||
    c.plano?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.status.toLowerCase().includes(search.toLowerCase())
  )

  const abrirReset = async (c: Contrato) => {
    setResetModal(c)
    setResetResult(null)
    setLoadingAdmins(true)
    try {
      const r = await gestorApi.listarUsuariosPorRestaurante(c.restauranteId)
      setAdmins(r.data.filter(u => u.role === 'ADMIN'))
    } catch {
      setAdmins([])
    } finally {
      setLoadingAdmins(false)
    }
  }

  const handleResetSenha = async (admin: UsuarioAdmin) => {
    setResetting(true)
    try {
      const r = await gestorApi.resetSenha(admin.id)
      setResetResult({ nome: admin.nome, novaSenha: r.data.novaSenha })
    } finally {
      setResetting(false)
    }
  }

  const handleSalvarStatus = async () => {
    if (!statusModal || !novoStatus) return
    setSavingStatus(true)
    try {
      await billingApi.atualizarStatusContrato(statusModal.id, novoStatus)
      setContratos(prev => prev.map(c =>
        c.id === statusModal.id ? { ...c, status: novoStatus as Contrato['status'] } : c
      ))
      setStatusModal(null)
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Empresas cadastradas</h1>

      <div className={styles.toolbar}>
        <input className={styles.searchInput}
          placeholder="Buscar por ID, plano ou status..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Restaurante ID</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Início</th>
                <th>Próx. vencimento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id}>
                  <td><strong>#{c.restauranteId}</strong></td>
                  <td>{c.plano?.nome ?? '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[`status${c.status}`]}`}>{c.status}</span>
                  </td>
                  <td>{c.dataInicio ? new Date(c.dataInicio).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{c.dataProximoVencimento ? new Date(c.dataProximoVencimento).toLocaleDateString('pt-BR') : '—'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setStatusModal(c); setNovoStatus(c.status)
                    }}>
                      Status
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => abrirReset(c)}>
                      Reset senha
                    </Button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className={styles.emptyRow}>Nenhuma empresa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal reset senha */}
      {resetModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Reset de senha — Empresa #{resetModal.restauranteId}</h2>

            {loadingAdmins ? (
              <p className={styles.loading}>Carregando administradores...</p>
            ) : admins.length === 0 ? (
              <p style={{ color: '#64748b' }}>Nenhum administrador encontrado nesta empresa.</p>
            ) : (
              <div className={styles.tableWrapper} style={{ marginBottom: '1rem' }}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Nome</th><th>E-mail</th><th></th></tr>
                  </thead>
                  <tbody>
                    {admins.map(a => (
                      <tr key={a.id}>
                        <td>{a.nome}</td>
                        <td>{a.email}</td>
                        <td>
                          <Button size="sm" loading={resetting} onClick={() => handleResetSenha(a)}>
                            Resetar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {resetResult && (
              <div className={styles.resetResult}>
                <div className={styles.resetResultLabel}>Senha temporária enviada para {resetResult.nome}:</div>
                <div className={styles.resetResultPass}>{resetResult.novaSenha}</div>
                <p style={{ fontSize: '0.8125rem', color: '#16a34a', margin: '0.5rem 0 0' }}>
                  E-mail enviado com a nova senha. Anote-a agora — não será exibida novamente.
                </p>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => { setResetModal(null); setResetResult(null) }}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal status */}
      {statusModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Alterar status — Empresa #{statusModal.restauranteId}</h2>
            <div className={styles.formRow}>
              <label>Novo status</label>
              <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)}>
                {['ATIVO', 'TRIAL', 'INADIMPLENTE', 'BLOQUEADO', 'CANCELADO'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setStatusModal(null)}>Cancelar</Button>
              <Button loading={savingStatus} onClick={handleSalvarStatus}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
