import { useEffect, useState, FormEvent } from 'react'
import { usuarioApi } from '../../api/usuarioApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import type { Usuario, Role } from '../../types'
import styles from './AdminUsuarios.module.css'

interface UserForm { nome: string; email: string; senha: string; role: Role }

const ROLES: { value: Role; label: string }[] = [
  { value: 'GARCON', label: 'Garçom' },
  { value: 'COZINHA', label: 'Cozinha' },
  { value: 'ADMIN', label: 'Administrador' }
]

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  GARCON: 'Garçom',
  COZINHA: 'Cozinha'
}

export function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [form, setForm] = useState<UserForm>({ nome: '', email: '', senha: '', role: 'GARCON' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    usuarioApi.listar().then(r => setUsuarios(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ nome: '', email: '', senha: '', role: 'GARCON' })
    setError('')
    setModal(true)
  }

  const openEdit = (u: Usuario) => {
    setEditing(u)
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role })
    setError('')
    setModal(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editing) {
        const payload: Partial<UserForm> = { nome: form.nome, role: form.role }
        if (form.senha) payload.senha = form.senha
        await usuarioApi.atualizar(editing.id, payload)
      } else {
        await usuarioApi.criar(form)
      }
      setModal(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u: Usuario) => {
    if (!confirm(`Desativar usuário "${u.nome}"?`)) return
    try {
      await usuarioApi.desativar(u.id)
      load()
    } catch {
      alert('Erro ao desativar usuário')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Usuários</h1>
        <Button onClick={openCreate}>+ Novo Usuário</Button>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className={styles.list}>
          {usuarios.map(u => (
            <Card key={u.id} className={styles.row}>
              <div className={styles.info}>
                <span className={styles.nome}>{u.nome}</span>
                <span className={styles.email}>{u.email}</span>
              </div>
              <Badge
                variant={u.role === 'ADMIN' ? 'primary' : u.role === 'COZINHA' ? 'warning' : 'info'}
                size="sm"
              >
                {ROLE_LABEL[u.role]}
              </Badge>
              <Badge variant={u.ativo ? 'success' : 'default'} size="sm">
                {u.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              <div className={styles.actions}>
                <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!u.ativo || u.role === 'SUPER_ADMIN'}
                  onClick={() => handleDelete(u)}
                >
                  Desativar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar Usuário' : 'Novo Usuário'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button
              loading={saving}
              onClick={() => document.getElementById('user-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSave} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <Input
            label="Nome"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            disabled={!!editing}
          />
          <Input
            label={editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
            type="password"
            value={form.senha}
            onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
            required={!editing}
            minLength={editing ? 0 : 6}
          />

          <div className={styles.formField}>
            <label className={styles.label} htmlFor="user-role">Perfil</label>
            <select
              id="user-role"
              className={styles.select}
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  )
}
