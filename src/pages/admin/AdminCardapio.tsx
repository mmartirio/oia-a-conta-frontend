import { useEffect, useState, FormEvent } from 'react'
import { categoriaApi } from '../../api/categoriaApi'
import { produtoApi } from '../../api/produtoApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import type { Categoria, Produto } from '../../types'
import styles from './AdminCardapio.module.css'

type Tab = 'categorias' | 'produtos'

const IMAGEM_MAX_BYTES = 1 * 1024 * 1024

interface CatForm  { nome: string }
interface ProdForm {
  nome: string
  descricao: string
  preco: string
  categoriaId: string
  // null = sem foto; "" = remover a foto atual; data URI = foto nova ou já existente.
  imagemBase64: string | null
}

export function AdminCardapio() {
  const [tab, setTab] = useState<Tab>('produtos')

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()

  const [catModal, setCatModal] = useState(false)
  const [editCat, setEditCat] = useState<Categoria | null>(null)
  const [catForm, setCatForm] = useState<CatForm>({ nome: '' })
  const [savingCat, setSavingCat] = useState(false)
  const [catError, setCatError] = useState('')

  const [prodModal, setProdModal] = useState(false)
  const [editProd, setEditProd] = useState<Produto | null>(null)
  const [prodForm, setProdForm] = useState<ProdForm>({ nome: '', descricao: '', preco: '', categoriaId: '', imagemBase64: null })
  const [savingProd, setSavingProd] = useState(false)
  const [prodError, setProdError] = useState('')

  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Categoria | null>(null)
  const [confirmDeleteProd, setConfirmDeleteProd] = useState<Produto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const loadCategorias = () =>
    categoriaApi.listar().then(r => setCategorias(r.data)).catch(() => {})

  const loadProdutos = (catId?: number) =>
    produtoApi.listar(catId).then(r => setProdutos(r.data)).catch(() => {})

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

  const handleDeleteCat = async () => {
    if (!confirmDeleteCat) return
    setDeleting(true)
    try {
      await categoriaApi.desativar(confirmDeleteCat.id)
      loadCategorias()
    } catch {
      toast.error('Erro ao desativar categoria')
    } finally {
      setDeleting(false)
      setConfirmDeleteCat(null)
    }
  }

  // ── Produtos ────────────────────────────────────────────
  const openCreateProd = () => {
    setEditProd(null)
    setProdForm({ nome: '', descricao: '', preco: '', categoriaId: String(categorias[0]?.id ?? ''), imagemBase64: null })
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
      imagemBase64: p.imagemBase64 ?? null
    })
    setProdError('')
    setProdModal(true)
  }

  const handleUploadImagemProduto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > IMAGEM_MAX_BYTES) {
      toast.error('Imagem muito grande. Envie um arquivo de até 1MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setProdForm(f => ({ ...f, imagemBase64: reader.result as string }))
    }
    reader.readAsDataURL(file)
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
        imagemBase64: prodForm.imagemBase64
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

  const handleDeleteProd = async () => {
    if (!confirmDeleteProd) return
    setDeleting(true)
    try {
      await produtoApi.desativar(confirmDeleteProd.id)
      loadProdutos(filtroCategoria)
    } catch {
      toast.error('Erro ao desativar produto')
    } finally {
      setDeleting(false)
      setConfirmDeleteProd(null)
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
            <Button onClick={openCreateProd} disabled={!categorias.some(c => c.ativo)}>
              + Novo Produto
            </Button>
          </div>

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
                  <Badge variant={p.ativo ? 'success' : 'default'} size="sm">
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {p.descricao && <p className={styles.prodDesc}>{p.descricao}</p>}
                <p className={styles.prodPreco}>{formatCurrency(p.preco)}</p>
                <p className={styles.prodCat}>
                  {categorias.find(c => c.id === p.categoriaId)?.nome ?? '—'}
                </p>
                <div className={styles.prodActions}>
                  <Button variant="outline" size="sm" onClick={() => openEditProd(p)}>Editar</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDeleteProd(p)} disabled={!p.ativo}>
                    Desativar
                  </Button>
                </div>
              </Card>
            ))}
            {produtos.length === 0 && (
              <p className={styles.empty}>Nenhum produto encontrado.</p>
            )}
          </div>
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
            {categorias.map(c => (
              <Card key={c.id} className={styles.catRow}>
                <span className={styles.catNome}>{c.nome}</span>
                <Badge variant={c.ativo ? 'success' : 'default'} size="sm">
                  {c.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
                <div className={styles.catActions}>
                  <Button variant="outline" size="sm" onClick={() => openEditCat(c)}>Editar</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDeleteCat(c)} disabled={!c.ativo}>
                    Desativar
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
        isOpen={!!confirmDeleteCat}
        title="Desativar categoria"
        message={`Desativar categoria "${confirmDeleteCat?.nome}"?`}
        confirmLabel="Desativar"
        danger
        loading={deleting}
        onConfirm={handleDeleteCat}
        onCancel={() => setConfirmDeleteCat(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteProd}
        title="Desativar produto"
        message={`Desativar "${confirmDeleteProd?.nome}"?`}
        confirmLabel="Desativar"
        danger
        loading={deleting}
        onConfirm={handleDeleteProd}
        onCancel={() => setConfirmDeleteProd(null)}
      />
    </div>
  )
}
