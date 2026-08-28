import { useState, useEffect } from 'react'
import { usuarioApi } from '../../api/usuarioApi'
import { useAuth } from '../../contexts/AuthContext'
import type { Usuario } from '../../types'
import { Button } from '../../components/ui/Button'
import styles from './Gestor.module.css'

interface FormState {
  id?: number
  nome: string
  email: string
  senha: string
}

const emptyForm = (): FormState => ({ nome: '', email: '', senha: '' })

export function GestorAdmins() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const carregar = () =>
    usuarioApi.listarSuperAdmins()
      .then(r => setAdmins(r.data))
      .finally(() => setLoading(false))

  useEffect(() => { carregar() }, [])

  const abrirCriar = () => { setForm(emptyForm()); setFeedback(null); setModal('criar') }
  const abrirEditar = (a: Usuario) => { setForm({ id: a.id, nome: a.nome, email: a.email, senha: '' }); setFeedback(null); setModal('editar') }

  const handleSalvar = async () => {
    setSaving(true); setFeedback(null)
    try {
      if (modal === 'criar') {
        await usuarioApi.criarSuperAdmin(form)
        setFeedback({ tipo: 'ok', msg: 'Administrador criado com sucesso!' })
      } else if (form.id) {
        const payload = { nome: form.nome, email: form.email, ...(form.senha ? { senha: form.senha } : {}) }
        await usuarioApi.atualizarSuperAdmin(form.id, payload)
        setFeedback({ tipo: 'ok', msg: 'Administrador atualizado com sucesso!' })
      }
      setModal(null)
      carregar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFeedback({ tipo: 'erro', msg: msg ?? 'Erro ao salvar administrador.' })
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

  const handleExcluir = async (admin: Usuario) => {
    if (!confirm(`Excluir definitivamente o administrador ${admin.nome}? Essa ação não pode ser desfeita.`)) return
    try {
      await usuarioApi.excluirSuperAdmin(admin.id)
      carregar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFeedback({ tipo: 'erro', msg: msg ?? 'Erro ao excluir administrador.' })
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Administradores</h1>
        <Button onClick={abrirCriar}>+ Novo administrador</Button>
      </div>

      <p className={styles.loading} style={{ marginTop: 0 }}>
        Contas com acesso total ao painel Gestor (SUPER_ADMIN). Crie a sua e desative/exclua a conta
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
              {admins.map(a => {
                const isSelf = a.id === user?.id
                return (
                  <tr key={a.id}>
                    <td><strong>{a.nome}</strong></td>
                    <td>{a.email}</td>
                    <td>
                      <span className={`${styles.badge} ${a.ativo ? styles.statusATIVO : styles.statusCANCELADO}`}>
                        {a.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => abrirEditar(a)}>Editar</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSelf}
                        title={isSelf ? 'Você não pode alterar seu próprio acesso' : undefined}
                        onClick={() => handleAlternarAtivo(a)}
                      >
                        {a.ativo ? 'Desativar' : 'Reativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSelf}
                        title={isSelf ? 'Você não pode excluir sua própria conta' : undefined}
                        onClick={() => handleExcluir(a)}
                      >
                        Excluir
                      </Button>
                    </td>
                  </tr>
                )
              })}
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
            <h2 className={styles.modalTitle}>{modal === 'criar' ? 'Novo administrador' : 'Editar administrador'}</h2>

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
                <label>{modal === 'criar' ? 'Senha' : 'Nova senha (deixe em branco pra manter a atual)'}</label>
                <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
              <Button loading={saving} onClick={handleSalvar}>Salvar administrador</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
