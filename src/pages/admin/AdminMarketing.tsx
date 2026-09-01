import { useEffect, useState, FormEvent } from 'react'
import { comboApi, type ComboPayload } from '../../api/comboApi'
import { cupomApi, type CupomPayload } from '../../api/cupomApi'
import { promocaoApi, type PromocaoPayload } from '../../api/promocaoApi'
import { produtoApi } from '../../api/produtoApi'
import { clienteApi } from '../../api/clienteApi'
import { grupoClienteApi } from '../../api/grupoClienteApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Switch } from '../../components/ui/Switch'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import { comprimirImagem } from '../../utils/imageProcessing'
import type { Combo, Cliente, Cupom, GrupoCliente, Produto, Promocao, TipoAlvo, TipoDesconto } from '../../types'
import styles from './AdminMarketing.module.css'

type Tab = 'combos' | 'cupons' | 'promocoes'

// Margem de segurança abaixo do limite validado no backend
// (IMAGEM_MAX_CHARS = 1.400.000 em ProdutoService/ComboService).
const IMAGEM_MAX_CARACTERES = 1_200_000

// Feature de grupos de clientes desativada a pedido do usuário — opção de
// mirar cupom/promoção num grupo fica oculta para novos itens, mas itens já
// existentes com tipoAlvo GRUPO continuam sendo exibidos/editáveis normalmente.
const GRUPOS_CLIENTES_ATIVO = false

interface ComboGrupoForm {
  nome: string
  quantidade: number
  produtoIds: number[]
}

interface ComboForm {
  nome: string
  descricao: string
  preco: string
  imagemBase64: string | null
  // "" = combo não aparece no cardápio numerado do WhatsApp.
  numeroCardapio: string
  grupos: ComboGrupoForm[]
}

const COMBO_FORM_VAZIO: ComboForm = { nome: '', descricao: '', preco: '', imagemBase64: null, numeroCardapio: '', grupos: [] }

interface CupomForm {
  codigo: string
  tipoDesconto: TipoDesconto
  valorDesconto: string
  tipoAlvo: TipoAlvo
  grupoClienteId: string
  clienteId: string
  validoDe: string
  validoAte: string
}

const CUPOM_FORM_VAZIO: CupomForm = {
  codigo: '', tipoDesconto: 'PERCENTUAL', valorDesconto: '', tipoAlvo: 'TODOS',
  grupoClienteId: '', clienteId: '', validoDe: '', validoAte: ''
}

interface PromocaoForm {
  nome: string
  descricao: string
  tipoDesconto: TipoDesconto
  valorDesconto: string
  tipoAlvo: TipoAlvo
  grupoClienteId: string
  requisitoGastoMinimo: string
  validoDe: string
  validoAte: string
}

const PROMOCAO_FORM_VAZIO: PromocaoForm = {
  nome: '', descricao: '', tipoDesconto: 'PERCENTUAL', valorDesconto: '', tipoAlvo: 'TODOS',
  grupoClienteId: '', requisitoGastoMinimo: '', validoDe: '', validoAte: ''
}

function descricaoDesconto(tipoDesconto: TipoDesconto, valorDesconto: number) {
  return tipoDesconto === 'PERCENTUAL' ? `${valorDesconto}%` : formatCurrency(valorDesconto)
}

function descricaoAlvo(tipoAlvo: TipoAlvo, grupoNome?: string, clienteNome?: string) {
  if (tipoAlvo === 'TODOS') return 'Todos os clientes'
  if (tipoAlvo === 'GRUPO') return `Grupo: ${grupoNome ?? '—'}`
  return `Cliente: ${clienteNome ?? '—'}`
}

export function AdminMarketing() {
  const [tab, setTab] = useState<Tab>('combos')
  const toast = useToast()

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [grupos, setGrupos] = useState<GrupoCliente[]>([])

  // ── Combos ──────────────────────────────────────────────
  const [combos, setCombos] = useState<Combo[]>([])
  const [togglingCombo, setTogglingCombo] = useState<number | null>(null)
  const [comboModal, setComboModal] = useState(false)
  const [editCombo, setEditCombo] = useState<Combo | null>(null)
  const [comboForm, setComboForm] = useState<ComboForm>(COMBO_FORM_VAZIO)
  const [savingCombo, setSavingCombo] = useState(false)
  const [comboError, setComboError] = useState('')

  const loadCombos = () =>
    comboApi.listar(false).then(r => setCombos(r.data)).catch(() => {})

  // ── Cupons ──────────────────────────────────────────────
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [togglingCupom, setTogglingCupom] = useState<number | null>(null)
  const [cupomModal, setCupomModal] = useState(false)
  const [editCupom, setEditCupom] = useState<Cupom | null>(null)
  const [cupomForm, setCupomForm] = useState<CupomForm>(CUPOM_FORM_VAZIO)
  const [savingCupom, setSavingCupom] = useState(false)
  const [cupomError, setCupomError] = useState('')

  const loadCupons = () =>
    cupomApi.listar().then(r => setCupons(r.data)).catch(() => {})

  // ── Promoções ───────────────────────────────────────────
  const [promocoes, setPromocoes] = useState<Promocao[]>([])
  const [togglingPromocao, setTogglingPromocao] = useState<number | null>(null)
  const [promocaoModal, setPromocaoModal] = useState(false)
  const [editPromocao, setEditPromocao] = useState<Promocao | null>(null)
  const [promocaoForm, setPromocaoForm] = useState<PromocaoForm>(PROMOCAO_FORM_VAZIO)
  const [savingPromocao, setSavingPromocao] = useState(false)
  const [promocaoError, setPromocaoError] = useState('')

  const loadPromocoes = () =>
    promocaoApi.listar().then(r => setPromocoes(r.data)).catch(() => {})

  useEffect(() => {
    produtoApi.listar().then(r => setProdutos(r.data)).catch(() => {})
    clienteApi.listar(true).then(r => setClientes(r.data)).catch(() => {})
    grupoClienteApi.listar(true).then(r => setGrupos(r.data)).catch(() => {})
    loadCombos()
    loadCupons()
    loadPromocoes()
  }, [])

  // ── Combos: handlers ────────────────────────────────────
  const openCreateCombo = () => {
    setEditCombo(null)
    setComboForm(COMBO_FORM_VAZIO)
    setComboError('')
    setComboModal(true)
  }

  const openEditCombo = (c: Combo) => {
    setEditCombo(c)
    setComboForm({
      nome: c.nome,
      descricao: c.descricao ?? '',
      preco: String(c.preco),
      imagemBase64: c.imagemBase64 ?? null,
      numeroCardapio: c.numeroCardapio != null ? String(c.numeroCardapio) : '',
      grupos: c.grupos.map(g => ({ nome: g.nome, quantidade: g.quantidade, produtoIds: g.produtos.map(p => p.produtoId) }))
    })
    setComboError('')
    setComboModal(true)
  }

  const adicionarGrupo = () => {
    setComboForm(f => ({ ...f, grupos: [...f.grupos, { nome: '', quantidade: 1, produtoIds: [] }] }))
  }

  const removerGrupo = (grupoIndex: number) => {
    setComboForm(f => ({ ...f, grupos: f.grupos.filter((_, i) => i !== grupoIndex) }))
  }

  const atualizarNomeGrupo = (grupoIndex: number, nome: string) => {
    setComboForm(f => ({
      ...f,
      grupos: f.grupos.map((g, i) => i === grupoIndex ? { ...g, nome } : g)
    }))
  }

  const atualizarQuantidadeGrupo = (grupoIndex: number, quantidade: number) => {
    setComboForm(f => ({
      ...f,
      grupos: f.grupos.map((g, i) => i === grupoIndex ? { ...g, quantidade } : g)
    }))
  }

  const toggleProdutoNoGrupo = (grupoIndex: number, produtoId: number) => {
    setComboForm(f => ({
      ...f,
      grupos: f.grupos.map((g, i) => {
        if (i !== grupoIndex) return g
        const existe = g.produtoIds.includes(produtoId)
        return { ...g, produtoIds: existe ? g.produtoIds.filter(id => id !== produtoId) : [...g.produtoIds, produtoId] }
      })
    }))
  }

  const handleUploadImagemCombo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUri = await comprimirImagem(file, { maxCaracteres: IMAGEM_MAX_CARACTERES })
      setComboForm(f => ({ ...f, imagemBase64: dataUri }))
    } catch {
      toast.error('Não foi possível processar a imagem')
    }
  }

  const handleRemoverImagemCombo = () => {
    setComboForm(f => ({ ...f, imagemBase64: '' }))
  }

  const handleSaveCombo = async (e: FormEvent) => {
    e.preventDefault()
    setComboError('')
    if (comboForm.grupos.length === 0) {
      setComboError('Adicione pelo menos um grupo (ex: "2 Pastéis")')
      return
    }
    for (const g of comboForm.grupos) {
      if (!g.nome.trim()) {
        setComboError('Todo grupo precisa de um nome (ex: "Pastéis", "Refrigerante")')
        return
      }
      if (g.produtoIds.length === 0) {
        setComboError(`Selecione pelo menos um sabor elegível pro grupo "${g.nome}"`)
        return
      }
    }
    setSavingCombo(true)
    try {
      const payload: ComboPayload = {
        nome: comboForm.nome,
        descricao: comboForm.descricao || undefined,
        preco: parseFloat(comboForm.preco),
        imagemBase64: comboForm.imagemBase64,
        numeroCardapio: comboForm.numeroCardapio.trim() ? Number(comboForm.numeroCardapio) : undefined,
        grupos: comboForm.grupos.map(g => ({ nome: g.nome, quantidade: g.quantidade, produtoIds: g.produtoIds }))
      }
      if (editCombo) {
        await comboApi.atualizar(editCombo.id, payload)
      } else {
        await comboApi.criar(payload)
      }
      setComboModal(false)
      loadCombos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setComboError(msg ?? 'Erro ao salvar combo')
    } finally {
      setSavingCombo(false)
    }
  }

  const handleToggleAtivoCombo = async (c: Combo, ativo: boolean) => {
    setTogglingCombo(c.id)
    try {
      await comboApi.alterarAtivo(c.id, ativo)
      loadCombos()
    } catch {
      toast.error(`Erro ao ${ativo ? 'ativar' : 'desativar'} combo`)
    } finally {
      setTogglingCombo(null)
    }
  }

  // ── Cupons: handlers ────────────────────────────────────
  const openCreateCupom = () => {
    setEditCupom(null)
    setCupomForm(CUPOM_FORM_VAZIO)
    setCupomError('')
    setCupomModal(true)
  }

  const openEditCupom = (c: Cupom) => {
    setEditCupom(c)
    setCupomForm({
      codigo: c.codigo,
      tipoDesconto: c.tipoDesconto,
      valorDesconto: String(c.valorDesconto),
      tipoAlvo: c.tipoAlvo,
      grupoClienteId: c.grupoClienteId ? String(c.grupoClienteId) : '',
      clienteId: c.clienteId ? String(c.clienteId) : '',
      validoDe: c.validoDe,
      validoAte: c.validoAte
    })
    setCupomError('')
    setCupomModal(true)
  }

  const handleSaveCupom = async (e: FormEvent) => {
    e.preventDefault()
    setCupomError('')
    if (cupomForm.tipoAlvo === 'GRUPO' && !cupomForm.grupoClienteId) {
      setCupomError('Selecione o grupo de clientes')
      return
    }
    if (cupomForm.tipoAlvo === 'INDIVIDUAL' && !cupomForm.clienteId) {
      setCupomError('Selecione o cliente')
      return
    }
    setSavingCupom(true)
    try {
      const payload: CupomPayload = {
        codigo: cupomForm.codigo,
        tipoDesconto: cupomForm.tipoDesconto,
        valorDesconto: parseFloat(cupomForm.valorDesconto),
        tipoAlvo: cupomForm.tipoAlvo,
        grupoClienteId: cupomForm.tipoAlvo === 'GRUPO' ? Number(cupomForm.grupoClienteId) : undefined,
        clienteId: cupomForm.tipoAlvo === 'INDIVIDUAL' ? Number(cupomForm.clienteId) : undefined,
        validoDe: cupomForm.validoDe,
        validoAte: cupomForm.validoAte
      }
      if (editCupom) {
        await cupomApi.atualizar(editCupom.id, payload)
      } else {
        await cupomApi.criar(payload)
      }
      setCupomModal(false)
      loadCupons()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setCupomError(msg ?? 'Erro ao salvar cupom')
    } finally {
      setSavingCupom(false)
    }
  }

  const handleToggleAtivoCupom = async (c: Cupom, ativo: boolean) => {
    setTogglingCupom(c.id)
    try {
      await cupomApi.alterarAtivo(c.id, ativo)
      loadCupons()
    } catch {
      toast.error(`Erro ao ${ativo ? 'ativar' : 'desativar'} cupom`)
    } finally {
      setTogglingCupom(null)
    }
  }

  // ── Promoções: handlers ─────────────────────────────────
  const openCreatePromocao = () => {
    setEditPromocao(null)
    setPromocaoForm(PROMOCAO_FORM_VAZIO)
    setPromocaoError('')
    setPromocaoModal(true)
  }

  const openEditPromocao = (p: Promocao) => {
    setEditPromocao(p)
    setPromocaoForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      tipoDesconto: p.tipoDesconto,
      valorDesconto: String(p.valorDesconto),
      tipoAlvo: p.tipoAlvo,
      grupoClienteId: p.grupoClienteId ? String(p.grupoClienteId) : '',
      requisitoGastoMinimo: p.requisitoGastoMinimo != null ? String(p.requisitoGastoMinimo) : '',
      validoDe: p.validoDe,
      validoAte: p.validoAte
    })
    setPromocaoError('')
    setPromocaoModal(true)
  }

  const handleSavePromocao = async (e: FormEvent) => {
    e.preventDefault()
    setPromocaoError('')
    if (promocaoForm.tipoAlvo === 'GRUPO' && !promocaoForm.grupoClienteId) {
      setPromocaoError('Selecione o grupo de clientes')
      return
    }
    setSavingPromocao(true)
    try {
      const payload: PromocaoPayload = {
        nome: promocaoForm.nome,
        descricao: promocaoForm.descricao || undefined,
        tipoDesconto: promocaoForm.tipoDesconto,
        valorDesconto: parseFloat(promocaoForm.valorDesconto),
        tipoAlvo: promocaoForm.tipoAlvo,
        grupoClienteId: promocaoForm.tipoAlvo === 'GRUPO' ? Number(promocaoForm.grupoClienteId) : undefined,
        requisitoGastoMinimo: promocaoForm.requisitoGastoMinimo ? parseFloat(promocaoForm.requisitoGastoMinimo) : undefined,
        validoDe: promocaoForm.validoDe,
        validoAte: promocaoForm.validoAte
      }
      if (editPromocao) {
        await promocaoApi.atualizar(editPromocao.id, payload)
      } else {
        await promocaoApi.criar(payload)
      }
      setPromocaoModal(false)
      loadPromocoes()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setPromocaoError(msg ?? 'Erro ao salvar promoção')
    } finally {
      setSavingPromocao(false)
    }
  }

  const handleToggleAtivoPromocao = async (p: Promocao, ativo: boolean) => {
    setTogglingPromocao(p.id)
    try {
      await promocaoApi.alterarAtivo(p.id, ativo)
      loadPromocoes()
    } catch {
      toast.error(`Erro ao ${ativo ? 'ativar' : 'desativar'} promoção`)
    } finally {
      setTogglingPromocao(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Marketing</h1>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'combos' ? styles.tabActive : ''}`} onClick={() => setTab('combos')}>
            Combos
          </button>
          <button className={`${styles.tab} ${tab === 'cupons' ? styles.tabActive : ''}`} onClick={() => setTab('cupons')}>
            Cupons
          </button>
          <button className={`${styles.tab} ${tab === 'promocoes' ? styles.tabActive : ''}`} onClick={() => setTab('promocoes')}>
            Promoções
          </button>
        </div>
      </div>

      {/* ── Combos ─── */}
      {tab === 'combos' && (
        <>
          <div className={styles.toolbar}>
            <div />
            <Button onClick={openCreateCombo} disabled={produtos.filter(p => p.ativo).length < 2}>
              + Novo Combo
            </Button>
          </div>

          <div className={styles.grid}>
            {combos.map(c => (
              <Card key={c.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>{c.nome}</span>
                </div>
                {c.descricao && <p className={styles.cardDesc}>{c.descricao}</p>}
                <p className={styles.cardPreco}>{formatCurrency(c.preco)}</p>
                <p className={styles.cardItens}>
                  {c.grupos.map(g => `${g.quantidade}x ${g.nome}`).join(' + ')}
                </p>
                <div className={styles.cardActions}>
                  <Switch
                    checked={c.ativo}
                    disabled={togglingCombo === c.id}
                    onChange={ativo => handleToggleAtivoCombo(c, ativo)}
                    label={c.ativo ? 'Ativo' : 'Inativo'}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEditCombo(c)}>Editar</Button>
                </div>
              </Card>
            ))}
            {combos.length === 0 && (
              <p className={styles.empty}>Nenhum combo cadastrado.</p>
            )}
          </div>
        </>
      )}

      {/* ── Cupons ─── */}
      {tab === 'cupons' && (
        <>
          <div className={styles.toolbar}>
            <div />
            <Button onClick={openCreateCupom}>+ Novo Cupom</Button>
          </div>

          <div className={styles.list}>
            {cupons.map(c => (
              <Card key={c.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.rowNome}>{c.codigo}</span>
                  <span className={styles.rowSub}>
                    {descricaoDesconto(c.tipoDesconto, c.valorDesconto)} · {descricaoAlvo(c.tipoAlvo, c.grupoClienteNome, c.clienteNome)}
                    {' · '}válido {c.validoDe} a {c.validoAte}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Switch
                    checked={c.ativo}
                    disabled={togglingCupom === c.id}
                    onChange={ativo => handleToggleAtivoCupom(c, ativo)}
                    label={c.ativo ? 'Ativo' : 'Inativo'}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEditCupom(c)}>Editar</Button>
                </div>
              </Card>
            ))}
            {cupons.length === 0 && (
              <p className={styles.empty}>Nenhum cupom cadastrado.</p>
            )}
          </div>
        </>
      )}

      {/* ── Promoções ─── */}
      {tab === 'promocoes' && (
        <>
          <div className={styles.toolbar}>
            <div />
            <Button onClick={openCreatePromocao}>+ Nova Promoção</Button>
          </div>

          <div className={styles.list}>
            {promocoes.map(p => (
              <Card key={p.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.rowNome}>{p.nome}</span>
                  <span className={styles.rowSub}>
                    {descricaoDesconto(p.tipoDesconto, p.valorDesconto)} · {descricaoAlvo(p.tipoAlvo, p.grupoClienteNome)}
                    {p.requisitoGastoMinimo != null && (
                      <> <Badge variant="info" size="sm">Gasto mín. {formatCurrency(p.requisitoGastoMinimo)}</Badge></>
                    )}
                    {' · '}válida {p.validoDe} a {p.validoAte}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Switch
                    checked={p.ativo}
                    disabled={togglingPromocao === p.id}
                    onChange={ativo => handleToggleAtivoPromocao(p, ativo)}
                    label={p.ativo ? 'Ativa' : 'Inativa'}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEditPromocao(p)}>Editar</Button>
                </div>
              </Card>
            ))}
            {promocoes.length === 0 && (
              <p className={styles.empty}>Nenhuma promoção cadastrada.</p>
            )}
          </div>
        </>
      )}

      {/* Modal Combo */}
      <Modal
        isOpen={comboModal}
        onClose={() => setComboModal(false)}
        title={editCombo ? 'Editar Combo' : 'Novo Combo'}
        footer={
          <>
            <Button variant="outline" onClick={() => setComboModal(false)}>Cancelar</Button>
            <Button
              loading={savingCombo}
              onClick={() => document.getElementById('combo-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="combo-form" onSubmit={handleSaveCombo} className={styles.form}>
          {comboError && <div className={styles.formError}>{comboError}</div>}

          <Input
            label="Nome do Combo"
            value={comboForm.nome}
            onChange={e => setComboForm(f => ({ ...f, nome: e.target.value }))}
            required
            placeholder="Ex: Combo Casal, Combo Família..."
          />
          <Input
            label="Descrição (opcional)"
            value={comboForm.descricao}
            onChange={e => setComboForm(f => ({ ...f, descricao: e.target.value }))}
          />
          <Input
            label="Preço fixo do combo (R$)"
            type="number"
            step="0.01"
            min="0.01"
            value={comboForm.preco}
            onChange={e => setComboForm(f => ({ ...f, preco: e.target.value }))}
            required
          />
          <Input
            label="Nº no cardápio do WhatsApp (opcional)"
            type="number"
            min={1}
            value={comboForm.numeroCardapio}
            onChange={e => setComboForm(f => ({ ...f, numeroCardapio: e.target.value }))}
          />

          <div className={styles.formField}>
            <label className={styles.label}>
              Grupos do combo (ex: "2 Pastéis") — o cliente escolhe os sabores dentro de cada grupo, sem mudar o preço
            </label>
            <div className={styles.gruposList}>
              {comboForm.grupos.map((grupo, grupoIndex) => (
                <div key={grupoIndex} className={styles.grupoBox}>
                  <div className={styles.grupoHeader}>
                    <Input
                      className={styles.grupoNomeInput}
                      placeholder='Nome do grupo (ex: "Pastéis")'
                      value={grupo.nome}
                      onChange={e => atualizarNomeGrupo(grupoIndex, e.target.value)}
                    />
                    <Input
                      className={styles.grupoQtdInput}
                      type="number"
                      min={1}
                      title="Quantidade desse grupo no combo"
                      value={grupo.quantidade}
                      onChange={e => atualizarQuantidadeGrupo(grupoIndex, Math.max(1, Number(e.target.value)))}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => removerGrupo(grupoIndex)}>
                      Remover
                    </Button>
                  </div>
                  <div className={styles.itensList}>
                    {produtos.filter(p => p.ativo || grupo.produtoIds.includes(p.id)).map(p => (
                      <div key={p.id} className={styles.itemRow}>
                        <input
                          type="checkbox"
                          checked={grupo.produtoIds.includes(p.id)}
                          onChange={() => toggleProdutoNoGrupo(grupoIndex, p.id)}
                        />
                        <span className={styles.itemRowNome}>{p.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={adicionarGrupo}>
              + Adicionar grupo
            </Button>
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Foto do combo (opcional)</label>
            <div className={styles.imagemBox}>
              <div className={styles.imagemPreview}>
                {comboForm.imagemBase64
                  ? <img src={comboForm.imagemBase64} alt="Prévia do combo" className={styles.imagemImg} />
                  : <span className={styles.hint}>Sem foto</span>}
              </div>
              <div className={styles.imagemActions}>
                <label className={styles.btnUploadImagem}>
                  Enviar foto
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadImagemCombo}
                    hidden
                  />
                </label>
                {comboForm.imagemBase64 && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoverImagemCombo}>
                    Remover foto
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Cupom */}
      <Modal
        isOpen={cupomModal}
        onClose={() => setCupomModal(false)}
        title={editCupom ? 'Editar Cupom' : 'Novo Cupom'}
        footer={
          <>
            <Button variant="outline" onClick={() => setCupomModal(false)}>Cancelar</Button>
            <Button
              loading={savingCupom}
              onClick={() => document.getElementById('cupom-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="cupom-form" onSubmit={handleSaveCupom} className={styles.form}>
          {cupomError && <div className={styles.formError}>{cupomError}</div>}

          <Input
            label="Código do cupom"
            value={cupomForm.codigo}
            onChange={e => setCupomForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
            required
            placeholder="Ex: PROMO10"
          />

          <div className={styles.formGrid}>
            <Select
              label="Tipo de desconto"
              value={cupomForm.tipoDesconto}
              onChange={e => setCupomForm(f => ({ ...f, tipoDesconto: e.target.value as TipoDesconto }))}
            >
              <option value="PERCENTUAL">Percentual (%)</option>
              <option value="FIXO">Valor fixo (R$)</option>
            </Select>
            <Input
              label={cupomForm.tipoDesconto === 'PERCENTUAL' ? 'Desconto (%)' : 'Desconto (R$)'}
              type="number"
              step="0.01"
              min="0.01"
              value={cupomForm.valorDesconto}
              onChange={e => setCupomForm(f => ({ ...f, valorDesconto: e.target.value }))}
              required
            />
          </div>

          <Select
            label="Aplicar para"
            value={cupomForm.tipoAlvo}
            onChange={e => setCupomForm(f => ({ ...f, tipoAlvo: e.target.value as TipoAlvo }))}
          >
            <option value="TODOS">Todos os clientes</option>
            {(GRUPOS_CLIENTES_ATIVO || cupomForm.tipoAlvo === 'GRUPO') && (
              <option value="GRUPO">Um grupo de clientes</option>
            )}
            <option value="INDIVIDUAL">Um cliente específico</option>
          </Select>

          {cupomForm.tipoAlvo === 'GRUPO' && (
            <Select
              label="Grupo de clientes"
              value={cupomForm.grupoClienteId}
              onChange={e => setCupomForm(f => ({ ...f, grupoClienteId: e.target.value }))}
              required
            >
              <option value="">Selecione um grupo...</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </Select>
          )}

          {cupomForm.tipoAlvo === 'INDIVIDUAL' && (
            <Select
              label="Cliente"
              value={cupomForm.clienteId}
              onChange={e => setCupomForm(f => ({ ...f, clienteId: e.target.value }))}
              required
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.telefone})</option>)}
            </Select>
          )}

          <div className={styles.formGrid}>
            <Input
              label="Válido de"
              type="date"
              value={cupomForm.validoDe}
              onChange={e => setCupomForm(f => ({ ...f, validoDe: e.target.value }))}
              required
            />
            <Input
              label="Válido até"
              type="date"
              value={cupomForm.validoAte}
              onChange={e => setCupomForm(f => ({ ...f, validoAte: e.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Modal Promoção */}
      <Modal
        isOpen={promocaoModal}
        onClose={() => setPromocaoModal(false)}
        title={editPromocao ? 'Editar Promoção' : 'Nova Promoção'}
        footer={
          <>
            <Button variant="outline" onClick={() => setPromocaoModal(false)}>Cancelar</Button>
            <Button
              loading={savingPromocao}
              onClick={() => document.getElementById('promocao-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="promocao-form" onSubmit={handleSavePromocao} className={styles.form}>
          {promocaoError && <div className={styles.formError}>{promocaoError}</div>}

          <Input
            label="Nome da promoção"
            value={promocaoForm.nome}
            onChange={e => setPromocaoForm(f => ({ ...f, nome: e.target.value }))}
            required
            placeholder="Ex: Aniversário do cliente, Volta às aulas..."
          />
          <Input
            label="Descrição (opcional)"
            value={promocaoForm.descricao}
            onChange={e => setPromocaoForm(f => ({ ...f, descricao: e.target.value }))}
          />

          <div className={styles.formGrid}>
            <Select
              label="Tipo de desconto"
              value={promocaoForm.tipoDesconto}
              onChange={e => setPromocaoForm(f => ({ ...f, tipoDesconto: e.target.value as TipoDesconto }))}
            >
              <option value="PERCENTUAL">Percentual (%)</option>
              <option value="FIXO">Valor fixo (R$)</option>
            </Select>
            <Input
              label={promocaoForm.tipoDesconto === 'PERCENTUAL' ? 'Desconto (%)' : 'Desconto (R$)'}
              type="number"
              step="0.01"
              min="0.01"
              value={promocaoForm.valorDesconto}
              onChange={e => setPromocaoForm(f => ({ ...f, valorDesconto: e.target.value }))}
              required
            />
          </div>

          <Select
            label="Aplicar para"
            value={promocaoForm.tipoAlvo}
            onChange={e => setPromocaoForm(f => ({ ...f, tipoAlvo: e.target.value as TipoAlvo }))}
          >
            <option value="TODOS">Todos os clientes</option>
            {(GRUPOS_CLIENTES_ATIVO || promocaoForm.tipoAlvo === 'GRUPO') && (
              <option value="GRUPO">Um grupo de clientes</option>
            )}
          </Select>

          {promocaoForm.tipoAlvo === 'GRUPO' && (
            <>
              <Select
                label="Grupo de clientes"
                value={promocaoForm.grupoClienteId}
                onChange={e => setPromocaoForm(f => ({ ...f, grupoClienteId: e.target.value }))}
                required
              >
                <option value="">Selecione um grupo...</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </Select>
              <Input
                label="Requisito extra: gasto mínimo acumulado (opcional)"
                type="number"
                step="0.01"
                min="0"
                value={promocaoForm.requisitoGastoMinimo}
                onChange={e => setPromocaoForm(f => ({ ...f, requisitoGastoMinimo: e.target.value }))}
                placeholder="Deixe em branco para não exigir"
              />
            </>
          )}

          <div className={styles.formGrid}>
            <Input
              label="Válida de"
              type="date"
              value={promocaoForm.validoDe}
              onChange={e => setPromocaoForm(f => ({ ...f, validoDe: e.target.value }))}
              required
            />
            <Input
              label="Válida até"
              type="date"
              value={promocaoForm.validoAte}
              onChange={e => setPromocaoForm(f => ({ ...f, validoAte: e.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
