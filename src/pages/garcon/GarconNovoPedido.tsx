import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { categoriaApi } from '../../api/categoriaApi'
import { produtoApi } from '../../api/produtoApi'
import { comboApi } from '../../api/comboApi'
import { estoqueApi } from '../../api/estoqueApi'
import { pedidoApi } from '../../api/pedidoApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import type { Categoria, Produto, Combo, Estoque, ItemPedidoRequest } from '../../types'
import styles from './GarconNovoPedido.module.css'

interface CartItem extends ItemPedidoRequest {
  key: string
  nome: string
  preco: number
}

const LIMITE_ULTIMAS_UNIDADES = 5

export function GarconNovoPedido() {
  const { id: comandaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
  const [estoquePorProduto, setEstoquePorProduto] = useState<Record<number, Estoque>>({})
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()
  const [mostrarCombos, setMostrarCombos] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      categoriaApi.listar(),
      produtoApi.listar(),
      comboApi.listar().catch(() => ({ data: [] as Combo[] })),
      estoqueApi.listar().catch(() => ({ data: [] as Estoque[] })),
    ]).then(([catRes, prodRes, comboRes, estoqueRes]) => {
      setCategorias(catRes.data.filter(c => c.ativo))
      setProdutos(prodRes.data.filter(p => p.ativo))
      setCombos(comboRes.data.filter(c => c.ativo))
      setEstoquePorProduto(Object.fromEntries(estoqueRes.data.map(e => [e.produtoId, e])))
      setLoading(false)
    })
  }, [])

  const handleFiltro = (catId?: number) => {
    setFiltroCategoria(catId)
    setMostrarCombos(false)
    produtoApi.listar(catId).then(r => setProdutos(r.data.filter(p => p.ativo)))
  }

  const maxQtdProduto = (produtoId: number) => {
    const estoque = estoquePorProduto[produtoId]
    return estoque?.controlado ? estoque.quantidade : Infinity
  }

  const getQty = (key: string) => cart.find(i => i.key === key)?.quantidade ?? 0

  const addProdutoToCart = (produto: Produto) => {
    const key = `p-${produto.id}`
    if (getQty(key) >= maxQtdProduto(produto.id)) {
      toast.error('Estoque insuficiente para adicionar mais unidades.')
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.key === key)
      if (existing) return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { key, produtoId: produto.id, nome: produto.nome, preco: produto.preco, quantidade: 1 }]
    })
  }

  const addComboToCart = (combo: Combo) => {
    const key = `c-${combo.id}`
    setCart(prev => {
      const existing = prev.find(i => i.key === key)
      if (existing) return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { key, comboId: combo.id, nome: combo.nome, preco: combo.preco, quantidade: 1 }]
    })
  }

  const incrementCart = (item: CartItem) => {
    if (item.produtoId && item.quantidade >= maxQtdProduto(item.produtoId)) {
      toast.error('Estoque insuficiente para adicionar mais unidades.')
      return
    }
    setCart(prev => prev.map(i => i.key === item.key ? { ...i, quantidade: i.quantidade + 1 } : i))
  }

  const removeFromCart = (key: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.key === key)
      if (!existing) return prev
      if (existing.quantidade === 1) return prev.filter(i => i.key !== key)
      return prev.map(i => i.key === key ? { ...i, quantidade: i.quantidade - 1 } : i)
    })
  }

  const total = cart.reduce((acc, i) => acc + i.preco * i.quantidade, 0)

  const handleEnviar = async () => {
    if (!cart.length || !comandaId) return
    setSaving(true)
    try {
      await pedidoApi.enviar(Number(comandaId), {
        itens: cart.map(i => i.comboId
          ? { comboId: i.comboId, comboQuantidade: i.quantidade, quantidade: i.quantidade }
          : { produtoId: i.produtoId, produtoNome: i.nome, precoUnitario: i.preco, quantidade: i.quantidade }),
        observacao: observacao || undefined
      })
      navigate(`/garcon/comanda/${comandaId}`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao enviar pedido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}><FiArrowLeft size={16} /> Voltar</button>
        <h1 className={styles.title}>Novo Pedido</h1>
      </div>

      {/* Filtro de categorias */}
      <div className={styles.filtros}>
        <button
          className={`${styles.filtroBtn} ${!filtroCategoria && !mostrarCombos ? styles.filtroBtnActive : ''}`}
          onClick={() => handleFiltro(undefined)}
        >
          Todos
        </button>
        {categorias.map(c => (
          <button
            key={c.id}
            className={`${styles.filtroBtn} ${filtroCategoria === c.id ? styles.filtroBtnActive : ''}`}
            onClick={() => handleFiltro(c.id)}
          >
            {c.nome}
          </button>
        ))}
        {combos.length > 0 && (
          <button
            className={`${styles.filtroBtn} ${mostrarCombos ? styles.filtroBtnActive : ''}`}
            onClick={() => { setMostrarCombos(true); setFiltroCategoria(undefined) }}
          >
            Combos
          </button>
        )}
      </div>

      {/* Lista de produtos ou combos */}
      {loading ? <p>Carregando...</p> : mostrarCombos ? (
        <div className={styles.prodGrid}>
          {combos.map(c => {
            const key = `c-${c.id}`
            const qty = getQty(key)
            return (
              <Card key={c.id} className={styles.prodCard} padding="sm">
                <div className={styles.prodNome}>{c.nome}</div>
                {c.descricao && <div className={styles.prodDesc}>{c.descricao}</div>}
                <div className={styles.prodPreco}>{formatCurrency(c.preco)}</div>
                <div className={styles.prodControls}>
                  {qty > 0 ? (
                    <>
                      <button className={styles.qtyBtn} onClick={() => removeFromCart(key)}>−</button>
                      <span className={styles.qty}>{qty}</span>
                      <button className={styles.qtyBtn} onClick={() => addComboToCart(c)}>+</button>
                    </>
                  ) : (
                    <button className={styles.addBtn} onClick={() => addComboToCart(c)}>Adicionar</button>
                  )}
                </div>
              </Card>
            )
          })}
          {combos.length === 0 && <p>Nenhum combo disponível.</p>}
        </div>
      ) : (
        <div className={styles.prodGrid}>
          {produtos.map(p => {
            const key = `p-${p.id}`
            const qty = getQty(key)
            const estoque = estoquePorProduto[p.id]
            const esgotado = estoque?.controlado && estoque.quantidade <= 0
            const poucasUnidades = estoque?.controlado && estoque.quantidade > 0 && estoque.quantidade <= LIMITE_ULTIMAS_UNIDADES
            return (
              <Card key={p.id} className={styles.prodCard} padding="sm">
                {esgotado && <Badge variant="danger" size="sm">Esgotado</Badge>}
                {!esgotado && poucasUnidades && <Badge variant="warning" size="sm">Últimas {estoque!.quantidade}</Badge>}
                <div className={styles.prodNome}>{p.nome}</div>
                {p.descricao && <div className={styles.prodDesc}>{p.descricao}</div>}
                <div className={styles.prodPreco}>{formatCurrency(p.preco)}</div>
                <div className={styles.prodControls}>
                  {esgotado ? (
                    <Button size="sm" disabled fullWidth>Esgotado</Button>
                  ) : qty > 0 ? (
                    <>
                      <button className={styles.qtyBtn} onClick={() => removeFromCart(key)}>−</button>
                      <span className={styles.qty}>{qty}</span>
                      <button className={styles.qtyBtn} onClick={() => incrementCart({ key, produtoId: p.id, nome: p.nome, preco: p.preco, quantidade: qty })}>+</button>
                    </>
                  ) : (
                    <button className={styles.addBtn} onClick={() => addProdutoToCart(p)}>Adicionar</button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Observação */}
      <div className={styles.obsSection}>
        <label className={styles.obsLabel}>Observação do Pedido (opcional)</label>
        <textarea
          className={styles.obsInput}
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          placeholder="Ex: sem cebola, bem passado..."
          rows={2}
        />
      </div>

      {/* Barra de envio */}
      {cart.length > 0 && (
        <div className={styles.sendBar}>
          <div className={styles.cartSummary}>
            <span>{cart.reduce((a, i) => a + i.quantidade, 0)} itens</span>
            <span className={styles.cartTotal}>{formatCurrency(total)}</span>
          </div>
          <Button size="lg" loading={saving} onClick={handleEnviar}>
            Enviar para Cozinha
          </Button>
        </div>
      )}
    </div>
  )
}
