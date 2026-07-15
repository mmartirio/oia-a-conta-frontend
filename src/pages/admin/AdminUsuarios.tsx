import { useEffect, useState, FormEvent } from 'react'
import { usuarioApi } from '../../api/usuarioApi'
import { grupoApi } from '../../api/grupoApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Tabs } from '../../components/ui/Tabs'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../contexts/ToastContext'
import { PERMISSAO_CONTAINERS, type PermissaoContainer } from '../../constants/permissoes'
import type { Usuario, Role, Grupo } from '../../types'
import styles from './AdminUsuarios.module.css'

type Aba = 'usuarios' | 'grupos'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'usuarios', label: 'Usuários' },
  { id: 'grupos', label: 'Grupos' },
]

interface UserForm { nome: string; email: string; senha: string; role: Role; grupoId: number | null }

interface GrupoForm { nome: string; permissoes: Set<string> }
const GRUPO_FORM_VAZIO: GrupoForm = { nome: '', permissoes: new Set() }

export function AdminUsuarios() {
  const [aba, setAba] = useState<Aba>('usuarios')
  const toast = useToast()

  // ── Usuários ──
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [form, setForm] = useState<UserForm>({ nome: '', email: '', senha: '', role: 'GARCON', grupoId: null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Grupos ──
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [modalGrupo, setModalGrupo] = useState(false)
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null)
  const [grupoForm, setGrupoForm] = useState<GrupoForm>(GRUPO_FORM_VAZIO)
  const [savingGrupo, setSavingGrupo] = useState(false)
  const [grupoError, setGrupoError] = useState('')
  const [confirmDeleteGrupo, setConfirmDeleteGrupo] = useState<Grupo | null>(null)
  const [deletingGrupo, setDeletingGrupo] = useState(false)

  const loadUsuarios = () =>
    usuarioApi.listar().then(r => setUsuarios(r.data)).finally(() => setLoading(false))

  const loadGrupos = () =>
    grupoApi.listar().then(r => setGrupos(r.data)).finally(() => setLoadingGrupos(false))

  useEffect(() => { loadUsuarios(); loadGrupos() }, [])

  // ── CRUD Usuários ──

  const openCreate = () => {
    setEditing(null)
    setForm({ nome: '', email: '', senha: '', role: 'GARCON', grupoId: null })
    setError('')
    setModal(true)
  }

  const openEdit = (u: Usuario) => {
    setEditing(u)
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role, grupoId: u.grupoId ?? null })
    setError('')
    setModal(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editing) {
        const payload: Partial<UserForm> = { nome: form.nome, email: form.email, role: form.role, grupoId: form.grupoId }
        if (form.senha) payload.senha = form.senha
        await usuarioApi.atualizar(editing.id, payload)
      } else {
        await usuarioApi.criar(form)
      }
      setModal(false)
      loadUsuarios()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await usuarioApi.desativar(confirmDelete.id)
      loadUsuarios()
    } catch {
      toast.error('Erro ao desativar usuário')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  // ── CRUD Grupos ──

  const openCreateGrupo = () => {
    setEditingGrupo(null)
    setGrupoForm({ nome: '', permissoes: new Set() })
    setGrupoError('')
    setModalGrupo(true)
  }

  const openEditGrupo = (g: Grupo) => {
    setEditingGrupo(g)
    setGrupoForm({ nome: g.nome, permissoes: new Set(g.permissoes) })
    setGrupoError('')
    setModalGrupo(true)
  }

  const isContainerChecked = (c: PermissaoContainer) =>
    c.filhos ? c.filhos.every(f => grupoForm.permissoes.has(f.chave)) : grupoForm.permissoes.has(c.chave)

  const isContainerIndeterminado = (c: PermissaoContainer) =>
    !!c.filhos
    && c.filhos.some(f => grupoForm.permissoes.has(f.chave))
    && !c.filhos.every(f => grupoForm.permissoes.has(f.chave))

  const toggleContainer = (c: PermissaoContainer) => {
    setGrupoForm(prev => {
      const next = new Set(prev.permissoes)
      if (c.filhos) {
        const todosMarcados = c.filhos.every(f => next.has(f.chave))
        c.filhos.forEach(f => { todosMarcados ? next.delete(f.chave) : next.add(f.chave) })
      } else if (next.has(c.chave)) {
        next.delete(c.chave)
      } else {
        next.add(c.chave)
      }
      return { ...prev, permissoes: next }
    })
  }

  const toggleFilho = (chave: string) => {
    setGrupoForm(prev => {
      const next = new Set(prev.permissoes)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return { ...prev, permissoes: next }
    })
  }

  const handleSaveGrupo = async (e: FormEvent) => {
    e.preventDefault()
    setGrupoError('')
    setSavingGrupo(true)
    try {
      const payload = { nome: grupoForm.nome, permissoes: Array.from(grupoForm.permissoes) }
      if (editingGrupo) {
        await grupoApi.atualizar(editingGrupo.id, payload)
      } else {
        await grupoApi.criar(payload)
      }
      setModalGrupo(false)
      loadGrupos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setGrupoError(msg ?? 'Erro ao salvar grupo')
    } finally {
      setSavingGrupo(false)
    }
  }

  const handleDeleteGrupo = async () => {
    if (!confirmDeleteGrupo) return
    setDeletingGrupo(true)
    try {
      const r = await grupoApi.excluir(confirmDeleteGrupo.id)
      if (r.data.usuariosDesatribuidos > 0) {
        toast.success(`Grupo excluído. ${r.data.usuariosDesatribuidos} usuário(s) voltaram a depender só do papel fixo.`)
      }
      loadGrupos()
      loadUsuarios()
    } catch {
      toast.error('Erro ao excluir grupo')
    } finally {
      setDeletingGrupo(false)
      setConfirmDeleteGrupo(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Usuários</h1>
        {aba === 'usuarios'
          ? <Button onClick={openCreate}>+ Novo Usuário</Button>
          : <Button onClick={openCreateGrupo}>+ Novo Grupo</Button>}
      </div>

      <Tabs tabs={ABAS} activeTab={aba} onChange={id => setAba(id as Aba)} />

      {aba === 'usuarios' && (
        loading ? <p>Carregando...</p> : (
          <div className={styles.list}>
            {usuarios.map(u => (
              <Card key={u.id} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.nome}>{u.nome}</span>
                  <span className={styles.email}>{u.email}</span>
                </div>
                {u.grupoNome && <Badge variant="default" size="sm">{u.grupoNome}</Badge>}
                <Badge variant={u.ativo ? 'success' : 'default'} size="sm">
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                <div className={styles.actions}>
                  <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!u.ativo || u.role === 'SUPER_ADMIN'}
                    onClick={() => setConfirmDelete(u)}
                  >
                    Desativar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {aba === 'grupos' && (
        loadingGrupos ? <p>Carregando...</p> : grupos.length === 0 ? (
          <EmptyState
            title="Nenhum grupo criado"
            description="Crie grupos para dar acesso restrito a partes específicas do admin, sem depender só do papel fixo do usuário."
          />
        ) : (
          <div className={styles.list}>
            {grupos.map(g => (
              <Card key={g.id} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.nome}>{g.nome}</span>
                  <span className={styles.email}>{g.permissoes.length} permissõe(s)</span>
                </div>
                {g.padrao && <Badge variant="info" size="sm">Padrão</Badge>}
                <Badge variant="default" size="sm">{g.totalUsuarios} usuário(s)</Badge>
                <div className={styles.actions}>
                  <Button variant="outline" size="sm" onClick={() => openEditGrupo(g)}>Editar</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={g.padrao}
                    title={g.padrao ? 'Grupos padrão não podem ser excluídos' : undefined}
                    onClick={() => setConfirmDeleteGrupo(g)}
                  >
                    Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── Modal Usuário ── */}
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
            <label className={styles.label} htmlFor="user-grupo">Grupo</label>
            <select
              id="user-grupo"
              className={styles.select}
              value={form.grupoId ?? ''}
              onChange={e => setForm(f => ({ ...f, grupoId: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">Nenhum — sem acesso ao admin</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Desativar usuário"
        message={`Desativar usuário "${confirmDelete?.nome}"?`}
        confirmLabel="Desativar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Modal Grupo ── */}
      <Modal
        isOpen={modalGrupo}
        onClose={() => setModalGrupo(false)}
        title={editingGrupo ? 'Editar Grupo' : 'Novo Grupo'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalGrupo(false)}>Cancelar</Button>
            <Button
              loading={savingGrupo}
              onClick={() => document.getElementById('grupo-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="grupo-form" onSubmit={handleSaveGrupo} className={styles.form}>
          {grupoError && <div className={styles.error}>{grupoError}</div>}

          <Input
            label="Nome do grupo"
            value={grupoForm.nome}
            onChange={e => setGrupoForm(f => ({ ...f, nome: e.target.value }))}
            required
          />

          <div className={styles.formField}>
            <span className={styles.label}>Permissões — o que esse grupo pode acessar no admin</span>
            <div className={styles.grupoTree}>
              {PERMISSAO_CONTAINERS.map(c => (
                <div key={c.chave} className={styles.grupoContainer}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={isContainerChecked(c)}
                      ref={el => { if (el) el.indeterminate = isContainerIndeterminado(c) }}
                      onChange={() => toggleContainer(c)}
                    />
                    <strong>{c.label}</strong>
                  </label>
                  {c.filhos && (
                    <div className={styles.grupoFilhos}>
                      {c.filhos.map(f => (
                        <label key={f.chave} className={styles.checkboxRow}>
                          <input
                            type="checkbox"
                            checked={grupoForm.permissoes.has(f.chave)}
                            onChange={() => toggleFilho(f.chave)}
                          />
                          {f.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDeleteGrupo}
        title="Excluir grupo"
        message={`Excluir o grupo "${confirmDeleteGrupo?.nome}"? Usuários atribuídos a ele voltam a depender só do papel fixo.`}
        confirmLabel="Excluir"
        danger
        loading={deletingGrupo}
        onConfirm={handleDeleteGrupo}
        onCancel={() => setConfirmDeleteGrupo(null)}
      />
    </div>
  )
}
