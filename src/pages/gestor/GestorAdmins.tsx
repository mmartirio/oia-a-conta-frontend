import { useState, useEffect } from 'react'
import { usuarioApi } from '../../api/usuarioApi'
import { useAuth } from '../../contexts/AuthContext'
import type { Usuario } from '../../types'
import { Button } from '../../components/ui/Button'
import styles from './Gestor.module.css'

interface FormState {
  nome: string
  email: string
  senha: string
}

const emptyForm = (): FormState => ({ nome: '', email: '', senha: '' })

export function GestorAdmins() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const carregar = () =>
    usuarioApi.listarSuperAdmins()
      .then(r => setAdmins(r.data))
      .finally(() => setLoading(false))

  useEffect(() => { carregar() }, [])

  const abrirCriar = () => { setForm(emptyForm()); setFeedback(null); setModal(true) }

  const handleSalvar = async () => {
    setSaving(true); setFeedback(null)
    try {
      await usuarioApi.criarSuperAdmin(form)
      setFeedback({ tipo: 'ok', msg: 'Administrador criado com sucesso!' })
      setModal(false)
      carregar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFeedback({ tipo: 'erro', msg: msg ?? 'Erro ao criar administrador.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAlternarAtivo = async (admin: Usuario) => {
    const acao = admin.ativo ? 'desativar' : 'reativar'
    if (!confirm(`Quer mesmo ${acao} o acesso de ${admin.nome}?`)) return
    try {
      await usuarioApi.alternarAtivoSuperAdmin(admin.id, !admin.ativo)
      carregar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFeedback({ tipo: 'erro', msg: msg ?? `Erro ao ${acao} administrador.` })
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Administradores</h1>
        <Button onClick={abrirCriar}>+ Novo administrador</Button>
      </div>

      <p className={styles.loading} style={{ marginTop: 0 }}>
        Contas com acesso total ao painel Gestor (SUPER_ADMIN). Crie a sua e desative a conta
        provisória (<code>superadmin@comanda.digital</code>) assim que possível.
      </p>

      {feedback && (
        <div className={feedback.tipo === 'ok' ? styles.success : styles.alert}>{feedback.msg}</div>
      )}

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.nome}</strong></td>
                  <td>{a.email}</td>
                  <td>
                    <span className={`${styles.badge} ${a.ativo ? styles.statusATIVO : styles.statusCANCELADO}`}>
                      {a.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={a.id === user?.id}
                      title={a.id === user?.id ? 'Você não pode alterar seu próprio acesso' : undefined}
                      onClick={() => handleAlternarAtivo(a)}
                    >
                      {a.ativo ? 'Desativar' : 'Reativar'}
                    </Button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={4} className={styles.emptyRow}>Nenhum administrador cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Novo administrador</h2>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <label>Nome</label>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>Senha</label>
                <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
              <Button loading={saving} onClick={handleSalvar}>Salvar administrador</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
