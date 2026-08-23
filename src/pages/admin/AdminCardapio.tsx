import { useEffect, useState, FormEvent } from 'react'
import { FiArrowUp, FiArrowDown, FiTrash2, FiGrid, FiList } from 'react-icons/fi'
import { categoriaApi } from '../../api/categoriaApi'
import { produtoApi } from '../../api/produtoApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Switch } from '../../components/ui/Switch'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import { comprimirImagem } from '../../utils/imageProcessing'
import type { Categoria, Produto } from '../../types'
import styles from './AdminCardapio.module.css'

type Tab = 'categorias' | 'produtos'

// Margem de segurança abaixo do limite validado no backend
// (IMAGEM_MAX_CHARS = 1.400.000 em ProdutoService/ComboService).
const IMAGEM_MAX_CARACTERES = 1_200_000

interface CatForm  { nome: string }
interface ProdForm {
  nome: string
  descricao: string
  preco: string
  categoriaId: string
  // null = sem foto; "" = remover a foto atual; data URI = foto nova ou já existente.
  imagemBase64: string | null
  // "" = produto não aparece no cardápio numerado do WhatsApp.
  numeroCardapio: string
}

export function AdminCardapio() {
  const [tab, setTab] = useState<Tab>('produtos')

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()
  const [visualizacaoProd, setVisualizacaoProd] = useState<'grade' | 'lista'>('grade')

  const [catModal, setCatModal] = useState(false)
  const [editCat, setEditCat] = useState<Categoria | null>(null)
  const [catForm, setCatForm] = useState<CatForm>({ nome: '' })
  const [savingCat, setSavingCat] = useState(false)
  const [catError, setCatError] = useState('')

  const [prodModal, setProdModal] = useState(false)
  const [editProd, setEditProd] = useState<Produto | null>(null)
  const [prodForm, setProdForm] = useState<ProdForm>({ nome: '', descricao: '', preco: '', categoriaId: '', imagemBase64: null, numeroCardapio: '' })
  const [savingProd, setSavingProd] = useState(false)
  const [prodError, setProdError] = useState('')

  const [togglingCat, setTogglingCat] = useState<number | null>(null)
  const [reordenandoCat, setReordenandoCat] = useState(false)
  const [togglingProd, setTogglingProd] = useState<number | null>(null)

  const [confirmRemoverCat, setConfirmRemoverCat] = useState<Categoria | null>(null)
  const [removendoCat, setRemovendoCat] = useState(false)
  const [confirmRemoverProd, setConfirmRemoverProd] = useState<Produto | null>(null)
  const [removendoProd, setRemovendoProd] = useState(false)

  const toast = useToast()

  const loadCategorias = () =>
    categoriaApi.listar(true).then(r => setCategorias(r.data)).catch(() => {})

  const loadProdutos = (catId?: number) =>
    produtoApi.listar(catId, true).then(r => setProdutos(r.data)).catch(() => {})

  useEffect(() => {
    loadCategorias()
    loadProdutos()
  }, [])

  // ── Categorias ──────────────────────────────────────────
  const openCreateCat = () => {
    setEditCat(null)
    setCatForm({ nome: '' })
    setCatError('')
    setCatModal(true)
  }

  const openEditCat = (c: Categoria) => {
    setEditCat(c)
    setCatForm({ nome: c.nome })
    setCatError('')
    setCatModal(true)
  }

  const handleSaveCat = async (e: FormEvent) => {
    e.preventDefault()
    setCatError('')
    setSavingCat(true)
    try {
      if (editCat) {
        await categoriaApi.atualizar(editCat.id, { nome: catForm.nome })
      } else {
        await categoriaApi.criar({ nome: catForm.nome })
      }
      setCatModal(false)
      loadCategorias()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setCatError(msg ?? 'Erro ao salvar categoria')
    } finally {
      setSavingCat(false)
    }
  }

  const handleToggleAtivoCat = async (c: Categoria, ativo: boolean) => {
    setTogglingCat(c.id)
    try {
      await categoriaApi.alterarAtivo(c.id, ativo)
      loadCategorias()
    } catch {
      toast.error(`Erro ao ${ativo ? 'ativar' : 'desativar'} categoria`)
    } finally {
      setTogglingCat(null)
    }
  }

  const handleRemoverCat = async () => {
    if (!confirmRemoverCat) return
    setRemovendoCat(true)
    try {
      await categoriaApi.desativar(confirmRemoverCat.id)
      setConfirmRemoverCat(null)
      loadCategorias()
      toast.success('Categoria removida')
    } catch {
      toast.error('Erro ao remover categoria')
    } finally {
      setRemovendoCat(false)
    }
  }

  const moverCategoria = async (index: number, direcao: -1 | 1) => {
    const destino = index + direcao
    if (destino < 0 || destino >= categorias.length) return
    const nova = [...categorias]
    ;[nova[index], nova[destino]] = [nova[destino], nova[index]]
    setCategorias(nova)
    setReordenandoCat(true)
    try {
      await categoriaApi.reordenar(nova.map(c => c.id))
    } catch {
      toast.error('Erro ao reordenar categorias')
      loadCategorias()
    } finally {
      setReordenandoCat(false)
    }
  }

  // ── Produtos ────────────────────────────────────────────
  const openCreateProd = () => {
    setEditProd(null)
    setProdForm({ nome: '', descricao: '', preco: '', categoriaId: String(categorias[0]?.id ?? ''), imagemBase64: null, numeroCardapio: '' })
    setProdError('')
    setProdModal(true)
  }

  const openEditProd = (p: Produto) => {
    setEditProd(p)
    setProdForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: String(p.preco),
      categoriaId: String(p.categoriaId),
      imagemBase64: p.imagemBase64 ?? null,
      numeroCardapio: p.numeroCardapio != null ? String(p.numeroCardapio) : ''
    })
    setProdError('')
    setProdModal(true)
  }

  const handleUploadImagemProduto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUri = await comprimirImagem(file, { maxCaracteres: IMAGEM_MAX_CARACTERES })
      setProdForm(f => ({ ...f, imagemBase64: dataUri }))
    } catch {
      toast.error('Não foi possível processar a imagem')
    }
  }

  const handleRemoverImagemProduto = () => {
    setProdForm(f => ({ ...f, imagemBase64: '' }))
  }

  const handleSaveProd = async (e: FormEvent) => {
    e.preventDefault()
    setProdError('')
    setSavingProd(true)
    try {
      const payload = {
        nome: prodForm.nome,
        descricao: prodForm.descricao || undefined,
        preco: parseFloat(prodForm.preco),
        categoriaId: Number(prodForm.categoriaId),
        imagemBase64: prodForm.imagemBase64,
        numeroCardapio: prodForm.numeroCardapio.trim() ? Number(prodForm.numeroCardapio) : undefined
      }
      if (editProd) {
        await produtoApi.atualizar(editProd.id, payload)
      } else {
        await produtoApi.criar(payload)
      }
      setProdModal(false)
      loadProdutos(filtroCategoria)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setProdError(msg ?? 'Erro ao salvar produto')
    } finally {
      setSavingProd(false)
    }
  }

  const handleToggleAtivoProd = async (p: Produto, ativo: boolean) => {
    setTogglingProd(p.id)
    try {
      await produtoApi.alterarAtivo(p.id, ativo)
      loadProdutos(filtroCategoria)
    } catch {
      toast.error(`Erro ao ${ativo ? 'ativar' : 'desativar'} produto`)
    } finally {
      setTogglingProd(null)
    }
  }

  const handleRemoverProd = async () => {
    if (!confirmRemoverProd) return
    setRemovendoProd(true)
    try {
      await produtoApi.desativar(confirmRemoverProd.id)
      setConfirmRemoverProd(null)
      loadProdutos(filtroCategoria)
      toast.success('Produto removido')
    } catch {
      toast.error('Erro ao remover produto')
    } finally {
      setRemovendoProd(false)
    }
  }

  const handleFiltroCategoria = (catId?: number) => {
    setFiltroCategoria(catId)
    loadProdutos(catId)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cardápio</h1>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'produtos' ? styles.tabActive : ''}`}
            onClick={() => setTab('produtos')}
          >
            Produtos
          </button>
          <button
            className={`${styles.tab} ${tab === 'categorias' ? styles.tabActive : ''}`}
            onClick={() => setTab('categorias')}
          >
            Categorias
          </button>
        </div>
      </div>

      {/* ── Produtos ─── */}
      {tab === 'produtos' && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.filtros}>
              <button
                className={`${styles.filtroBtn} ${!filtroCategoria ? styles.filtroBtnActive : ''}`}
                onClick={() => handleFiltroCategoria(undefined)}
              >
                Todos
              </button>
              {categorias.filter(c => c.ativo).map(c => (
                <button
                  key={c.id}
                  className={`${styles.filtroBtn} ${filtroCategoria === c.id ? styles.filtroBtnActive : ''}`}
                  onClick={() => handleFiltroCategoria(c.id)}
                >
                  {c.nome}
                </button>
              ))}
            </div>
            <div className={styles.toolbarRight}>
              <div className={styles.viewToggle}>
                <button
                  type="button"
                  className={`${styles.viewToggleBtn} ${visualizacaoProd === 'grade' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setVisualizacaoProd('grade')}
                  aria-label="Ver em grade"
                >
                  <FiGrid size={16} />
                </button>
                <button
                  type="button"
                  className={`${styles.viewToggleBtn} ${visualizacaoProd === 'lista' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setVisualizacaoProd('lista')}
                  aria-label="Ver em lista"
                >
                  <FiList size={16} />
                </button>
              </div>
              <Button onClick={openCreateProd} disabled={!categorias.some(c => c.ativo)}>
                + Novo Produto
              </Button>
            </div>
          </div>

          {visualizacaoProd === 'grade' ? (
            <div className={styles.prodGrid}>
              {produtos.map(p => (
                <Card key={p.id} className={styles.prodCard}>
                  <div className={styles.prodHeader}>
                    <div className={styles.prodHeaderLeft}>
                      {p.imagemBase64
                        ? <img src={p.imagemBase64} alt={p.nome} className={styles.prodThumb} />
                        : <div className={styles.prodThumbPlaceholder} aria-hidden="true">Sem foto</div>}
                      <span className={styles.prodNome}>{p.nome}</span>
                    </div>
                    <Switch
                      checked={p.ativo}
                      disabled={togglingProd === p.id}
                      onChange={ativo => handleToggleAtivoProd(p, ativo)}
                      label={p.ativo ? 'Ativo' : 'Inativo'}
                    />
                  </div>
                  {p.descricao && <p className={styles.prodDesc}>{p.descricao}</p>}
                  <p className={styles.prodPreco}>{formatCurrency(p.preco)}</p>
                  <p className={styles.prodCat}>
                    {categorias.find(c => c.id === p.categoriaId)?.nome ?? '—'}
                  </p>
                  <div className={styles.prodActions}>
                    <Button variant="outline" size="sm" onClick={() => openEditProd(p)}>Editar</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmRemoverProd(p)}
                      aria-label="Remover produto"
                    >
                      <FiTrash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
              {produtos.length === 0 && (
                <p className={styles.empty}>Nenhum produto encontrado.</p>
              )}
            </div>
          ) : (
            <div className={styles.prodList}>
              {produtos.map(p => (
                <Card key={p.id} className={styles.prodListRow}>
                  {p.imagemBase64
                    ? <img src={p.imagemBase64} alt={p.nome} className={styles.prodListThumb} />
                    : <div className={styles.prodListThumbPlaceholder} aria-hidden="true" />}
                  <span className={styles.prodListNome}>{p.nome}</span>
                  <span className={styles.prodListCat}>
                    {categorias.find(c => c.id === p.categoriaId)?.nome ?? '—'}
                  </span>
                  <span className={styles.prodListPreco}>{formatCurrency(p.preco)}</span>
                  <Switch
                    checked={p.ativo}
                    disabled={togglingProd === p.id}
                    onChange={ativo => handleToggleAtivoProd(p, ativo)}
                    label={p.ativo ? 'Ativo' : 'Inativo'}
                  />
                  <div className={styles.prodActions}>
                    <Button variant="outline" size="sm" onClick={() => openEditProd(p)}>Editar</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmRemoverProd(p)}
                      aria-label="Remover produto"
                    >
                      <FiTrash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
              {produtos.length === 0 && (
                <p className={styles.empty}>Nenhum produto encontrado.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Categorias ─── */}
      {tab === 'categorias' && (
        <>
          <div className={styles.toolbar}>
            <div />
            <Button onClick={openCreateCat}>+ Nova Categoria</Button>
          </div>

          <div className={styles.catList}>
            {categorias.map((c, index) => (
              <Card key={c.id} className={styles.catRow}>
                <div className={styles.catOrdemBtns}>
                  <button
                    type="button"
                    className={styles.catOrdemBtn}
                    disabled={reordenandoCat || index === 0}
                    onClick={() => moverCategoria(index, -1)}
                    aria-label="Mover para cima"
                  >
                    <FiArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className={styles.catOrdemBtn}
                    disabled={reordenandoCat || index === categorias.length - 1}
                    onClick={() => moverCategoria(index, 1)}
                    aria-label="Mover para baixo"
                  >
                    <FiArrowDown size={14} />
                  </button>
                </div>
                <span className={styles.catNome}>{c.nome}</span>
                <Switch
                  checked={c.ativo}
                  disabled={togglingCat === c.id}
                  onChange={ativo => handleToggleAtivoCat(c, ativo)}
                  label={c.ativo ? 'Ativa' : 'Inativa'}
                />
                <div className={styles.catActions}>
                  <Button variant="outline" size="sm" onClick={() => openEditCat(c)}>Editar</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmRemoverCat(c)}
                    aria-label="Remover categoria"
                  >
                    <FiTrash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
            {categorias.length === 0 && (
              <p className={styles.empty}>Nenhuma categoria cadastrada.</p>
            )}
          </div>
        </>
      )}

      {/* Modal Categoria */}
      <Modal
        isOpen={catModal}
        onClose={() => setCatModal(false)}
        title={editCat ? 'Editar Categoria' : 'Nova Categoria'}
        footer={
          <>
            <Button variant="outline" onClick={() => setCatModal(false)}>Cancelar</Button>
            <Button
              loading={savingCat}
              onClick={() => document.getElementById('cat-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="cat-form" onSubmit={handleSaveCat} className={styles.form}>
          {catError && <div className={styles.formError}>{catError}</div>}
          <Input
            label="Nome da Categoria"
            value={catForm.nome}
            onChange={e => setCatForm({ nome: e.target.value })}
            required
            placeholder="Ex: Bebidas, Pratos Principais..."
          />
        </form>
      </Modal>

      {/* Modal Produto */}
      <Modal
        isOpen={prodModal}
        onClose={() => setProdModal(false)}
        title={editProd ? 'Editar Produto' : 'Novo Produto'}
        footer={
          <>
            <Button variant="outline" onClick={() => setProdModal(false)}>Cancelar</Button>
            <Button
              loading={savingProd}
              onClick={() => document.getElementById('prod-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="prod-form" onSubmit={handleSaveProd} className={styles.form}>
          {prodError && <div className={styles.formError}>{prodError}</div>}

          <div className={styles.formField}>
            <label className={styles.label} htmlFor="prod-cat">Categoria</label>
            <select
              id="prod-cat"
              className={styles.select}
              value={prodForm.categoriaId}
              onChange={e => setProdForm(f => ({ ...f, categoriaId: e.target.value }))}
              required
            >
              {categorias.filter(c => c.ativo).map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <Input
            label="Nome do Produto"
            value={prodForm.nome}
            onChange={e => setProdForm(f => ({ ...f, nome: e.target.value }))}
            required
            placeholder="Ex: Refrigerante Lata, Frango Grelhado..."
          />
          <Input
            label="Descrição (opcional)"
            value={prodForm.descricao}
            onChange={e => setProdForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Ingredientes, detalhes..."
          />
          <Input
            label="Nº no cardápio do WhatsApp (opcional)"
            type="number"
            min="1"
            value={prodForm.numeroCardapio}
            onChange={e => setProdForm(f => ({ ...f, numeroCardapio: e.target.value }))}
            placeholder="Ex: 1"
          />
          <p className={styles.hint}>
            Número que o cliente digita no WhatsApp pra pedir esse produto (bate com a imagem do cardápio numerado enviada pelo bot). Deixe em branco se ele não aparece nessa imagem.
          </p>
          <Input
            label="Preço (R$)"
            type="number"
            step="0.01"
            min="0.01"
            value={prodForm.preco}
            onChange={e => setProdForm(f => ({ ...f, preco: e.target.value }))}
            required
            placeholder="0,00"
          />

          <div className={styles.formField}>
            <label className={styles.label}>Foto do produto (opcional)</label>
            <div className={styles.imagemBox}>
              <div className={styles.imagemPreview}>
                {prodForm.imagemBase64
                  ? <img src={prodForm.imagemBase64} alt="Prévia do produto" className={styles.imagemImg} />
                  : <span className={styles.hint}>Sem foto</span>}
              </div>
              <div className={styles.imagemActions}>
                <label className={styles.btnUploadImagem}>
                  Enviar foto
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadImagemProduto}
                    hidden
                  />
                </label>
                {prodForm.imagemBase64 && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoverImagemProduto}>
                    Remover foto
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmRemoverCat}
        title="Remover categoria"
        message={`Remover a categoria "${confirmRemoverCat?.nome}"? Os produtos dela deixam de aparecer no cardápio.`}
        confirmLabel="Remover"
        danger
        loading={removendoCat}
        onConfirm={handleRemoverCat}
        onCancel={() => setConfirmRemoverCat(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmRemoverProd}
        title="Remover produto"
        message={`Remover o produto "${confirmRemoverProd?.nome}"? Ele deixa de aparecer no cardápio.`}
        confirmLabel="Remover"
        danger
        loading={removendoProd}
        onConfirm={handleRemoverProd}
        onCancel={() => setConfirmRemoverProd(null)}
      />
    </div>
  )
}
