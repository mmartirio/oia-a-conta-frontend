import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiLock } from 'react-icons/fi'
import { categoriaApi } from '../../api/categoriaApi'
import { produtoApi } from '../../api/produtoApi'
import { pdvApi } from '../../api/pdvApi'
import { caixaApi, type SessaoCaixa } from '../../api/caixaApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import type { Categoria, Produto, MetodoPagamento } from '../../types'
import styles from './PdvNovaVenda.module.css'

interface CartItem {
  produtoId: number
  produtoNome: string
  preco: number
  quantidade: number
}

const METODOS: { value: MetodoPagamento; label: string }[] = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Débito' },
]

export function PdvNovaVenda() {
  const navigate = useNavigate()
  const toast = useToast()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()
  const [cart, setCart] = useState<CartItem[]>([])
  const [metodo, setMetodo] = useState<MetodoPagamento>('DINHEIRO')
  const [parcelas, setParcelas] = useState(1)
  const [valorRecebido, setValorRecebido] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sessaoCaixa, setSessaoCaixa] = useState<SessaoCaixa | null>(null)

  useEffect(() => {
    categoriaApi.listar().then(r => setCategorias(r.data.filter(c => c.ativo)))
    produtoApi.listar().then(r => {
      setProdutos(r.data.filter(p => p.ativo))
      setLoading(false)
    })
    caixaApi.status().then(r => setSessaoCaixa(r.data)).catch(() => {})
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

  const getQty = (produtoId: number) => cart.find(i => i.produtoId === produtoId)?.quantidade ?? 0
  const total = cart.reduce((acc, i) => acc + i.preco * i.quantidade, 0)

  const limparCarrinho = () => {
    setCart([])
    setObservacao('')
    setMetodo('DINHEIRO')
    setParcelas(1)
    setValorRecebido('')
  }

  const troco = metodo === 'DINHEIRO' && valorRecebido ? Number(valorRecebido) - total : null
  const dinheiroInsuficiente = metodo === 'DINHEIRO' && (troco === null || troco < 0)

  const handleFinalizar = async () => {
    if (!cart.length || dinheiroInsuficiente) return
    setSaving(true)
    try {
      await pdvApi.criarVenda({
        itens: cart.map(i => ({
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          quantidade: i.quantidade,
          precoUnitario: i.preco,
        })),
        metodoPagamento: metodo,
        parcelas: metodo === 'CARTAO_CREDITO' ? parcelas : undefined,
        observacao: observacao || undefined,
      })
      toast.success('Venda registrada com sucesso!')
      limparCarrinho()
      navigate('/pdv', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao finalizar venda')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/pdv')}><FiArrowLeft size={16} /> Voltar</button>
        <h1 className={styles.title}>Nova Venda — Balcão</h1>
      </div>

      {!sessaoCaixa && (
        <div className={styles.caixaFechadoAviso}>
          <FiLock size={16} />
          <span>Caixa fechado — abra o caixa antes de vender.</span>
          <Link to="/pdv" className={styles.caixaFechadoLink}>Ir para o Caixa</Link>
        </div>
      )}

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

      {loading ? <p>Carregando...</p> : (
        <div className={styles.prodGrid}>
          {produtos.map(p => {
            const qty = getQty(p.id)
            return (
              <Card key={p.id} className={styles.prodCard} padding="sm">
                <div className={styles.prodNome}>{p.nome}</div>
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

      {cart.length > 0 && (
        <>
          <Card className={styles.pagamentoCard}>
            <h3 className={styles.sectionTitle}>Forma de Pagamento</h3>
            <div className={styles.metodosGrid}>
              {METODOS.map(m => (
                <button
                  key={m.value}
                  className={`${styles.metodoBtn} ${metodo === m.value ? styles.metodoSelecionado : ''}`}
                  onClick={() => { setMetodo(m.value); setParcelas(1) }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {metodo === 'CARTAO_CREDITO' && (
              <div className={styles.parcelasRow}>
                <label>Parcelamento</label>
                <select value={parcelas} onChange={e => setParcelas(Number(e.target.value))}>
                  <option value={1}>1x — À vista</option>
                  {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n}x sem juros</option>
                  ))}
                </select>
              </div>
            )}

            {metodo === 'DINHEIRO' && (
              <div className={styles.trocoRow}>
                <label>Valor recebido</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorRecebido}
                  onChange={e => setValorRecebido(e.target.value)}
                  placeholder={formatCurrency(total)}
                />
                {valorRecebido && (
                  <span className={dinheiroInsuficiente ? styles.trocoFaltando : styles.trocoValor}>
                    {dinheiroInsuficiente ? `Faltam ${formatCurrency(Math.abs(troco ?? 0))}` : `Troco: ${formatCurrency(troco ?? 0)}`}
                  </span>
                )}
              </div>
            )}
            <textarea
              className={styles.obsInput}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observação da venda (opcional)"
              rows={2}
            />
          </Card>

          <div className={styles.sendBar}>
            <div className={styles.cartSummary}>
              <span>{cart.reduce((a, i) => a + i.quantidade, 0)} itens</span>
              <span className={styles.cartTotal}>{formatCurrency(total)}</span>
            </div>
            <Button size="lg" className={styles.sendBtn} loading={saving} onClick={handleFinalizar} disabled={!sessaoCaixa || dinheiroInsuficiente}>
              Finalizar Venda
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
