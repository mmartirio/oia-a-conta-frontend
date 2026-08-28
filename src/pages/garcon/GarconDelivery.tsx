import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { produtoApi } from '../../api/produtoApi'
import { categoriaApi } from '../../api/categoriaApi'
import { entregaApi } from '../../api/entregaApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency, formatPhone } from '../../utils/formatters'
import type { Categoria, MetodoPagamento, Produto } from '../../types'
import styles from './GarconDelivery.module.css'

interface CartItem {
  produtoId: number
  produtoNome: string
  preco: number
  quantidade: number
}

const METODOS: MetodoPagamento[] = ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO']
const METODO_LABEL: Record<MetodoPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Crédito',
  CARTAO_DEBITO: 'Débito',
}

export function GarconDelivery() {
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [enderecoRua, setEnderecoRua] = useState('')
  const [enderecoNumero, setEnderecoNumero] = useState('')
  const [enderecoBairro, setEnderecoBairro] = useState('')
  const [enderecoCidade, setEnderecoCidade] = useState('')
  const [enderecoComplemento, setEnderecoComplemento] = useState('')
  const [metodo, setMetodo] = useState<MetodoPagamento>('DINHEIRO')
  const [parcelas, setParcelas] = useState(1)
  const [observacao, setObservacao] = useState('')
  const toast = useToast()

  useEffect(() => {
    categoriaApi.listar().then(r => setCategorias(r.data.filter(c => c.ativo)))
    produtoApi.listar().then(r => { setProdutos(r.data.filter(p => p.ativo)); setLoading(false) })
  }, [])

  const handleFiltro = (catId?: number) => {
    setFiltroCategoria(catId)
    produtoApi.listar(catId).then(r => setProdutos(r.data.filter(p => p.ativo)))
  }

  const addToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(i => i.produtoId === produto.id)
      if (existing) return prev.map(i => i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
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

  const handleEnviar = async () => {
    if (!cart.length || !clienteNome || !enderecoRua || !enderecoNumero || !enderecoCidade) return
    setSaving(true)
    try {
      await entregaApi.criar({
        clienteNome,
        clienteTelefone: clienteTelefone || undefined,
        enderecoRua,
        enderecoNumero,
        enderecoBairro: enderecoBairro || undefined,
        enderecoCidade,
        enderecoComplemento: enderecoComplemento || undefined,
        metodoPagamento: metodo,
        parcelas: metodo === 'CARTAO_CREDITO' ? parcelas : undefined,
        observacao: observacao || undefined,
        itens: cart.map(i => ({
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          precoUnitario: i.preco,
          quantidade: i.quantidade,
        })),
      })
      navigate(`/delivery`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao criar entrega')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(`/delivery`)}><FiArrowLeft size={16} /> Voltar</button>
        <h1 className={styles.title}>Novo Delivery</h1>
      </div>

      {/* Dados do cliente */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Cliente</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>Nome *</label>
            <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className={styles.field}>
            <label>Telefone</label>
            <input value={clienteTelefone} onChange={e => setClienteTelefone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
          </div>
        </div>
      </Card>

      {/* Endereço */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Endereço de Entrega</h3>
        <div className={styles.fieldRow}>
          <div className={`${styles.field} ${styles.fieldFlex2}`}>
            <label>Rua *</label>
            <input value={enderecoRua} onChange={e => setEnderecoRua(e.target.value)} placeholder="Nome da rua" />
          </div>
          <div className={styles.field}>
            <label>Número *</label>
            <input value={enderecoNumero} onChange={e => setEnderecoNumero(e.target.value)} placeholder="Nº" />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>Bairro</label>
            <input value={enderecoBairro} onChange={e => setEnderecoBairro(e.target.value)} placeholder="Bairro" />
          </div>
          <div className={styles.field}>
            <label>Cidade *</label>
            <input value={enderecoCidade} onChange={e => setEnderecoCidade(e.target.value)} placeholder="Cidade" />
          </div>
          <div className={styles.field}>
            <label>Complemento</label>
            <input value={enderecoComplemento} onChange={e => setEnderecoComplemento(e.target.value)} placeholder="Apto, bloco..." />
          </div>
        </div>
      </Card>

      {/* Pagamento */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Pagamento</h3>
        <div className={styles.metodos}>
          {METODOS.map(m => (
            <label key={m} className={`${styles.metodoOption} ${metodo === m ? styles.metodoSelected : ''}`}>
              <input type="radio" name="metodo" value={m} checked={metodo === m} onChange={() => setMetodo(m)} />
              {METODO_LABEL[m]}
            </label>
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
      </Card>

      {/* Produtos */}
      <div className={styles.filtros}>
        <button className={`${styles.filtroBtn} ${!filtroCategoria ? styles.filtroBtnActive : ''}`} onClick={() => handleFiltro(undefined)}>Todos</button>
        {categorias.map(c => (
          <button key={c.id} className={`${styles.filtroBtn} ${filtroCategoria === c.id ? styles.filtroBtnActive : ''}`} onClick={() => handleFiltro(c.id)}>{c.nome}</button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className={styles.prodGrid}>
          {produtos.map(p => {
            const qty = getQty(p.id)
            return (
              <Card key={p.id} padding="sm">
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
        <label>Observação (opcional)</label>
        <textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: sem cebola, tocar interfone..." rows={2} />
      </div>

      {/* Barra inferior */}
      {cart.length > 0 && (
        <div className={styles.sendBar}>
          <div>
            <div className={styles.cartQty}>{cart.reduce((a, i) => a + i.quantidade, 0)} itens</div>
            <div className={styles.cartTotal}>{formatCurrency(total)}</div>
          </div>
          <Button
            size="lg"
            loading={saving}
            onClick={handleEnviar}
            disabled={!clienteNome || !enderecoRua || !enderecoNumero || !enderecoCidade}
          >
            Confirmar Delivery
          </Button>
        </div>
      )}
    </div>
  )
}
