import { useEffect, useState, FormEvent } from 'react'
import { clienteApi, type ClientePayload } from '../../api/clienteApi'
import { grupoClienteApi } from '../../api/grupoClienteApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Switch } from '../../components/ui/Switch'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../contexts/ToastContext'
import type { Cliente, GrupoCliente, GrupoClienteMembro } from '../../types'
import styles from './AdminClientes.module.css'

type Tab = 'clientes' | 'grupos'

// Feature desativada a pedido do usuário ("clientes não precisa de grupo") — UI oculta,
// código e dados mantidos intactos para uma eventual reativação futura.
const GRUPOS_CLIENTES_ATIVO = false

interface ClienteForm {
  nome: string
  telefone: string
  email: string
  dataNascimento: string
  enderecoRua: string
  enderecoNumero: string
  enderecoBairro: string
  enderecoCidade: string
  enderecoComplemento: string
  enderecoCep: string
  observacoes: string
}

const CLIENTE_FORM_VAZIO: ClienteForm = {
  nome: '', telefone: '', email: '', dataNascimento: '',
  enderecoRua: '', enderecoNumero: '', enderecoBairro: '', enderecoCidade: '',
  enderecoComplemento: '', enderecoCep: '', observacoes: ''
}

interface GrupoForm { nome: string; descricao: string }

export function AdminClientes() {
  const [tab, setTab] = useState<Tab>('clientes')
  const toast = useToast()

  // ── Clientes ────────────────────────────────────────────
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteModal, setClienteModal] = useState(false)
  const [editCliente, setEditCliente] = useState<Cliente | null>(null)
  const [clienteForm, setClienteForm] = useState<ClienteForm>(CLIENTE_FORM_VAZIO)
  const [savingCliente, setSavingCliente] = useState(false)
  const [clienteError, setClienteError] = useState('')
  const [togglingCliente, setTogglingCliente] = useState<number | null>(null)

  const loadClientes = () =>
    clienteApi.listar().then(r => setClientes(r.data)).catch(() => {})

  // ── Grupos ──────────────────────────────────────────────
  const [grupos, setGrupos] = useState<GrupoCliente[]>([])
  const [grupoModal, setGrupoModal] = useState(false)
  const [editGrupo, setEditGrupo] = useState<GrupoCliente | null>(null)
  const [grupoForm, setGrupoForm] = useState<GrupoForm>({ nome: '', descricao: '' })
  const [savingGrupo, setSavingGrupo] = useState(false)
  const [grupoError, setGrupoError] = useState('')
  const [togglingGrupo, setTogglingGrupo] = useState<number | null>(null)

  const [membrosModal, setMembrosModal] = useState<GrupoCliente | null>(null)
  const [membros, setMembros] = useState<GrupoClienteMembro[]>([])
  const [buscaMembro, setBuscaMembro] = useState('')
  const [addingMembro, setAddingMembro] = useState(false)

  const loadGrupos = () =>
    grupoClienteApi.listar().then(r => setGrupos(r.data)).catch(() => {})

  useEffect(() => {
    loadClientes()
    if (GRUPOS_CLIENTES_ATIVO) loadGrupos()
  }, [])

  // ── Clientes: handlers ──────────────────────────────────
  const openCreateCliente = () => {
    setEditCliente(null)
    setClienteForm(CLIENTE_FORM_VAZIO)
    setClienteError('')
    setClienteModal(true)
  }

  const openEditCliente = (c: Cliente) => {
    setEditCliente(c)
    setClienteForm({
      nome: c.nome, telefone: c.telefone, email: c.email ?? '',
      dataNascimento: c.dataNascimento ?? '',
      enderecoRua: c.enderecoRua ?? '', enderecoNumero: c.enderecoNumero ?? '',
      enderecoBairro: c.enderecoBairro ?? '', enderecoCidade: c.enderecoCidade ?? '',
      enderecoComplemento: c.enderecoComplemento ?? '', enderecoCep: c.enderecoCep ?? '',
      observacoes: c.observacoes ?? ''
    })
    setClienteError('')
    setClienteModal(true)
  }

  const handleSaveCliente = async (e: FormEvent) => {
    e.preventDefault()
    setClienteError('')
    setSavingCliente(true)
    try {
      const payload: ClientePayload = {
        nome: clienteForm.nome,
        telefone: clienteForm.telefone,
        email: clienteForm.email || undefined,
        dataNascimento: clienteForm.dataNascimento || undefined,
        enderecoRua: clienteForm.enderecoRua || undefined,
        enderecoNumero: clienteForm.enderecoNumero || undefined,
        enderecoBairro: clienteForm.enderecoBairro || undefined,
        enderecoCidade: clienteForm.enderecoCidade || undefined,
        enderecoComplemento: clienteForm.enderecoComplemento || undefined,
        enderecoCep: clienteForm.enderecoCep || undefined,
        observacoes: clienteForm.observacoes || undefined
      }
      if (editCliente) {
        await clienteApi.atualizar(editCliente.id, payload)
      } else {
        await clienteApi.criar(payload)
      }
      setClienteModal(false)
      loadClientes()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setClienteError(msg ?? 'Erro ao salvar cliente')
    } finally {
      setSavingCliente(false)
    }
  }

  const handleToggleAtivoCliente = async (c: Cliente, ativo: boolean) => {
    setTogglingCliente(c.id)
    try {
      await clienteApi.alterarAtivo(c.id, ativo)
      loadClientes()
    } catch {
      toast.error(`Erro ao ${ativo ? 'ativar' : 'desativar'} cliente`)
    } finally {
      setTogglingCliente(null)
    }
  }

  // ── Grupos: handlers ────────────────────────────────────
  const openCreateGrupo = () => {
    setEditGrupo(null)
    setGrupoForm({ nome: '', descricao: '' })
    setGrupoError('')
    setGrupoModal(true)
  }

  const openEditGrupo = (g: GrupoCliente) => {
    setEditGrupo(g)
    setGrupoForm({ nome: g.nome, descricao: g.descricao ?? '' })
    setGrupoError('')
    setGrupoModal(true)
  }

  const handleSaveGrupo = async (e: FormEvent) => {
    e.preventDefault()
    setGrupoError('')
    setSavingGrupo(true)
    try {
      const payload = { nome: grupoForm.nome, descricao: grupoForm.descricao || undefined }
      if (editGrupo) {
        await grupoClienteApi.atualizar(editGrupo.id, payload)
      } else {
        await grupoClienteApi.criar(payload)
      }
      setGrupoModal(false)
      loadGrupos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setGrupoError(msg ?? 'Erro ao salvar grupo')
    } finally {
      setSavingGrupo(false)
    }
  }

  const handleToggleAtivoGrupo = async (g: GrupoCliente, ativo: boolean) => {
    setTogglingGrupo(g.id)
    try {
      await grupoClienteApi.alterarAtivo(g.id, ativo)
      loadGrupos()
    } catch {
      toast.error(`Erro ao ${ativo ? 'ativar' : 'desativar'} grupo`)
    } finally {
      setTogglingGrupo(null)
    }
  }

  // ── Membros do grupo ────────────────────────────────────
  const openMembros = (g: GrupoCliente) => {
    setMembrosModal(g)
    setBuscaMembro('')
    grupoClienteApi.listarMembros(g.id).then(r => setMembros(r.data)).catch(() => {})
  }

  const candidatosMembro = clientes.filter(c =>
    c.ativo &&
    !membros.some(m => m.clienteId === c.id) &&
    buscaMembro.length >= 2 &&
    (c.nome.toLowerCase().includes(buscaMembro.toLowerCase()) || c.telefone.includes(buscaMembro))
  )

  const handleAdicionarMembro = async (clienteId: number) => {
    if (!membrosModal) return
    setAddingMembro(true)
    try {
      await grupoClienteApi.adicionarMembro(membrosModal.id, clienteId)
      const r = await grupoClienteApi.listarMembros(membrosModal.id)
      setMembros(r.data)
      setBuscaMembro('')
      loadGrupos()
    } catch {
      toast.error('Erro ao adicionar cliente ao grupo')
    } finally {
      setAddingMembro(false)
    }
  }

  const handleRemoverMembro = async (clienteId: number) => {
    if (!membrosModal) return
    try {
      await grupoClienteApi.removerMembro(membrosModal.id, clienteId)
      setMembros(membros.filter(m => m.clienteId !== clienteId))
      loadGrupos()
    } catch {
      toast.error('Erro ao remover cliente do grupo')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Clientes</h1>
        {GRUPOS_CLIENTES_ATIVO && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'clientes' ? styles.tabActive : ''}`}
              onClick={() => setTab('clientes')}
            >
              Clientes
            </button>
            <button
              className={`${styles.tab} ${tab === 'grupos' ? styles.tabActive : ''}`}
              onClick={() => setTab('grupos')}
            >
              Grupos
            </button>
          </div>
        )}
      </div>

      {/* ── Clientes ─── */}
      {tab === 'clientes' && (
        <>
          <div className={styles.toolbar}>
            <div />
            <Button onClick={openCreateCliente}>+ Novo Cliente</Button>
          </div>

          <div className={styles.list}>
            {clientes.map(c => (
              <Card key={c.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.rowNome}>{c.nome}</span>
                  <span className={styles.rowSub}>{c.telefone}{c.email ? ` · ${c.email}` : ''}</span>
                </div>
                <div className={styles.rowActions}>
                  <Switch
                    checked={c.ativo}
                    disabled={togglingCliente === c.id}
                    onChange={ativo => handleToggleAtivoCliente(c, ativo)}
                    label={c.ativo ? 'Ativo' : 'Inativo'}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEditCliente(c)}>Editar</Button>
                </div>
              </Card>
            ))}
            {clientes.length === 0 && (
              <p className={styles.empty}>Nenhum cliente cadastrado.</p>
            )}
          </div>
        </>
      )}

      {/* ── Grupos ─── */}
      {GRUPOS_CLIENTES_ATIVO && tab === 'grupos' && (
        <>
          <div className={styles.toolbar}>
            <div />
            <Button onClick={openCreateGrupo}>+ Novo Grupo</Button>
          </div>

          <div className={styles.list}>
            {grupos.map(g => (
              <Card key={g.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.rowNome}>{g.nome}</span>
                  <span className={styles.rowSub}>
                    {g.descricao ? `${g.descricao} · ` : ''}{g.totalMembros} cliente{g.totalMembros === 1 ? '' : 's'}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Switch
                    checked={g.ativo}
                    disabled={togglingGrupo === g.id}
                    onChange={ativo => handleToggleAtivoGrupo(g, ativo)}
                    label={g.ativo ? 'Ativo' : 'Inativo'}
                  />
                  <Button variant="outline" size="sm" onClick={() => openMembros(g)}>Membros</Button>
                  <Button variant="outline" size="sm" onClick={() => openEditGrupo(g)}>Editar</Button>
                </div>
              </Card>
            ))}
            {grupos.length === 0 && (
              <p className={styles.empty}>Nenhum grupo cadastrado.</p>
            )}
          </div>
        </>
      )}

      {/* Modal Cliente */}
      <Modal
        isOpen={clienteModal}
        onClose={() => setClienteModal(false)}
        title={editCliente ? 'Editar Cliente' : 'Novo Cliente'}
        footer={
          <>
            <Button variant="outline" onClick={() => setClienteModal(false)}>Cancelar</Button>
            <Button
              loading={savingCliente}
              onClick={() => document.getElementById('cliente-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="cliente-form" onSubmit={handleSaveCliente} className={styles.form}>
          {clienteError && <div className={styles.formError}>{clienteError}</div>}
          <div className={styles.formGrid}>
            <Input
              label="Nome"
              value={clienteForm.nome}
              onChange={e => setClienteForm(f => ({ ...f, nome: e.target.value }))}
              required
            />
            <Input
              label="Telefone"
              value={clienteForm.telefone}
              onChange={e => setClienteForm(f => ({ ...f, telefone: e.target.value }))}
              required
              placeholder="(11) 91234-5678"
            />
          </div>
          <div className={styles.formGrid}>
            <Input
              label="E-mail (opcional)"
              type="email"
              value={clienteForm.email}
              onChange={e => setClienteForm(f => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Data de nascimento (opcional)"
              type="date"
              value={clienteForm.dataNascimento}
              onChange={e => setClienteForm(f => ({ ...f, dataNascimento: e.target.value }))}
            />
          </div>
          <div className={styles.formGrid}>
            <Input
              label="Rua (opcional)"
              value={clienteForm.enderecoRua}
              onChange={e => setClienteForm(f => ({ ...f, enderecoRua: e.target.value }))}
            />
            <Input
              label="Número (opcional)"
              value={clienteForm.enderecoNumero}
              onChange={e => setClienteForm(f => ({ ...f, enderecoNumero: e.target.value }))}
            />
          </div>
          <div className={styles.formGrid}>
            <Input
              label="Bairro (opcional)"
              value={clienteForm.enderecoBairro}
              onChange={e => setClienteForm(f => ({ ...f, enderecoBairro: e.target.value }))}
            />
            <Input
              label="Cidade (opcional)"
              value={clienteForm.enderecoCidade}
              onChange={e => setClienteForm(f => ({ ...f, enderecoCidade: e.target.value }))}
            />
          </div>
          <div className={styles.formGrid}>
            <Input
              label="Complemento (opcional)"
              value={clienteForm.enderecoComplemento}
              onChange={e => setClienteForm(f => ({ ...f, enderecoComplemento: e.target.value }))}
            />
            <Input
              label="CEP (opcional)"
              value={clienteForm.enderecoCep}
              onChange={e => setClienteForm(f => ({ ...f, enderecoCep: e.target.value }))}
            />
          </div>
          <Input
            label="Observações (opcional)"
            value={clienteForm.observacoes}
            onChange={e => setClienteForm(f => ({ ...f, observacoes: e.target.value }))}
          />
        </form>
      </Modal>

      {/* Modal Grupo */}
      <Modal
        isOpen={grupoModal}
        onClose={() => setGrupoModal(false)}
        title={editGrupo ? 'Editar Grupo' : 'Novo Grupo'}
        footer={
          <>
            <Button variant="outline" onClick={() => setGrupoModal(false)}>Cancelar</Button>
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
          {grupoError && <div className={styles.formError}>{grupoError}</div>}
          <Input
            label="Nome do grupo"
            value={grupoForm.nome}
            onChange={e => setGrupoForm(f => ({ ...f, nome: e.target.value }))}
            required
            placeholder="Ex: VIP, Aniversariantes..."
          />
          <Input
            label="Descrição (opcional)"
            value={grupoForm.descricao}
            onChange={e => setGrupoForm(f => ({ ...f, descricao: e.target.value }))}
          />
        </form>
      </Modal>

      {/* Modal Membros */}
      <Modal
        isOpen={!!membrosModal}
        onClose={() => setMembrosModal(null)}
        title={`Membros de "${membrosModal?.nome}"`}
        footer={<Button variant="outline" onClick={() => setMembrosModal(null)}>Fechar</Button>}
      >
        <div className={styles.membrosBusca}>
          <Input
            label="Adicionar cliente (busque por nome ou telefone)"
            value={buscaMembro}
            onChange={e => setBuscaMembro(e.target.value)}
            placeholder="Digite ao menos 2 caracteres..."
          />
        </div>
        {candidatosMembro.length > 0 && (
          <div className={styles.membrosList}>
            {candidatosMembro.slice(0, 6).map(c => (
              <div key={c.id} className={styles.membroRow}>
                <span>{c.nome} · {c.telefone}</span>
                <Button size="sm" disabled={addingMembro} onClick={() => handleAdicionarMembro(c.id)}>
                  Adicionar
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.membrosList}>
          {membros.map(m => (
            <div key={m.clienteId} className={styles.membroRow}>
              <span>{m.clienteNome} · {m.clienteTelefone}</span>
              <Button variant="danger" size="sm" onClick={() => handleRemoverMembro(m.clienteId)}>
                Remover
              </Button>
            </div>
          ))}
          {membros.length === 0 && (
            <p className={styles.empty}>Nenhum cliente neste grupo ainda.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
