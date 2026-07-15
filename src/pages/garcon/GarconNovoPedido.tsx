import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { categoriaApi } from '../../api/categoriaApi'
import { produtoApi } from '../../api/produtoApi'
import { pedidoApi } from '../../api/pedidoApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import type { Categoria, Produto, ItemPedidoRequest } from '../../types'
import styles from './GarconNovoPedido.module.css'

interface CartItem extends ItemPedidoRequest {
  produtoNome: string
  preco: number
}

export function GarconNovoPedido() {
  const { id: comandaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()
  const [cart, setCart] = useState<CartItem[]>([])
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    categoriaApi.listar().then(r => setCategorias(r.data.filter(c => c.ativo)))
    produtoApi.listar().then(r => {
      setProdutos(r.data.filter(p => p.ativo))
      setLoading(false)
    })
  }, [])

  const handleFiltro = (catId?: number) => {
    setFiltroCategoria(catId)
    produtoApi.listar(catId).then(r => setProdutos(r.data.filter(p => p.ativo)))
  }

  const addToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(i => i.produtoId === produto.id)
      if (existing) {
        return prev.map(i => i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      }
      return [...prev, { produtoId: produto.id, produtoNome: produto.nome, preco: produto.preco, quantidade: 1 }]
    })
  }

  const removeFromCart = (produtoId: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.produtoId === produtoId)
      if (!existing) return prev
      if (existing.quantidade === 1) return prev.filter(i => i.produtoId !== produtoId)
      return prev.map(i => i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i)
    })
  }

  const getQty = (produtoId: number) =>
    cart.find(i => i.produtoId === produtoId)?.quantidade ?? 0

  const total = cart.reduce((acc, i) => acc + i.preco * i.quantidade, 0)

  const handleEnviar = async () => {
    if (!cart.length || !comandaId) return
    setSaving(true)
    try {
      await pedidoApi.enviar(Number(comandaId), {
        itens: cart.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
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
          className={`${styles.filtroBtn} ${!filtroCategoria ? styles.filtroBtnActive : ''}`}
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
      </div>

      {/* Lista de produtos */}
      {loading ? <p>Carregando...</p> : (
        <div className={styles.prodGrid}>
          {produtos.map(p => {
            const qty = getQty(p.id)
            return (
              <Card key={p.id} className={styles.prodCard} padding="sm">
                <div className={styles.prodNome}>{p.nome}</div>
                {p.descricao && <div className={styles.prodDesc}>{p.descricao}</div>}
                <div className={styles.prodPreco}>{formatCurrency(p.preco)}</div>
                <div className={styles.prodControls}>
                  {qty > 0 ? (
                    <>
                      <button className={styles.qtyBtn} onClick={() => removeFromCart(p.id)}>−</button>
                      <span className={styles.qty}>{qty}</span>
                      <button className={styles.qtyBtn} onClick={() => addToCart(p)}>+</button>
                    </>
                  ) : (
                    <button className={styles.addBtn} onClick={() => addToCart(p)}>Adicionar</button>
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
