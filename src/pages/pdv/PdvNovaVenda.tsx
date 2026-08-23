import { useEffect, useState } from 'react'
import { FiLock, FiSearch, FiTag, FiUser, FiTrash2, FiX } from 'react-icons/fi'
import { categoriaApi } from '../../api/categoriaApi'
import { produtoApi } from '../../api/produtoApi'
import { comboApi } from '../../api/comboApi'
import { estoqueApi } from '../../api/estoqueApi'
import { clienteApi } from '../../api/clienteApi'
import { cupomApi, type CupomValidacao } from '../../api/cupomApi'
import { pdvApi } from '../../api/pdvApi'
import { entregaApi } from '../../api/entregaApi'
import type { SessaoCaixa } from '../../api/caixaApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../contexts/ToastContext'
import { formatCurrency } from '../../utils/formatters'
import { geocodificarEndereco, type Coordenada } from '../../utils/geocoding'
import type { Categoria, Produto, Combo, Estoque, Cliente, MetodoPagamento, FreteCalculado } from '../../types'
import styles from './PdvNovaVenda.module.css'

interface CartItem {
  key: string
  produtoId?: number
  comboId?: number
  nome: string
  preco: number
  quantidade: number
}

export type ModoVenda = 'BALCAO' | 'DELIVERY'

const METODOS_BALCAO: { value: MetodoPagamento; label: string }[] = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Débito' },
]

// Delivery não aceita PIX: quem recebe é o entregador na entrega, que
// repassa ao caixa na volta — cobrar PIX exigiria confirmação remota.
const METODOS_DELIVERY = METODOS_BALCAO.filter(m => m.value !== 'PIX')

const LIMITE_ULTIMAS_UNIDADES = 5

// Painel de criação de venda (balcão ou delivery), embutido como aba dentro
// de PdvSalao — não é mais uma rota própria, pra todo o PDV viver numa
// única tela (fila de pagamento + nova venda), sem navegação entre páginas.
export function PdvNovaVenda({ sessaoCaixa, modoInicial, onConcluida }: {
  sessaoCaixa: SessaoCaixa | null
  modoInicial: ModoVenda
  onConcluida: () => void
}) {
  const toast = useToast()

  const [modo, setModo] = useState<ModoVenda>(modoInicial)
  useEffect(() => { setModo(modoInicial) }, [modoInicial])

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
  const [estoquePorProduto, setEstoquePorProduto] = useState<Record<number, Estoque>>({})
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()
  const [mostrarCombos, setMostrarCombos] = useState(false)
  const [busca, setBusca] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [metodo, setMetodo] = useState<MetodoPagamento>('DINHEIRO')
  const [parcelas, setParcelas] = useState(1)
  const [valorRecebido, setValorRecebido] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Delivery: cliente/endereço/frete ────────────────────
  const [clienteTelefoneDelivery, setClienteTelefoneDelivery] = useState('')
  const [enderecoRua, setEnderecoRua] = useState('')
  const [enderecoNumero, setEnderecoNumero] = useState('')
  const [enderecoBairro, setEnderecoBairro] = useState('')
  const [enderecoCidade, setEnderecoCidade] = useState('')
  const [enderecoComplemento, setEnderecoComplemento] = useState('')
  const [enderecoCoords, setEnderecoCoords] = useState<Coordenada | null>(null)
  const [frete, setFrete] = useState<FreteCalculado | null>(null)
  const [calculandoFrete, setCalculandoFrete] = useState(false)

  // ── Cliente ─────────────────────────────────────────────
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [clienteModal, setClienteModal] = useState(false)
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null | undefined>(undefined)
  const [clienteBuscando, setClienteBuscando] = useState(false)
  const [clienteNovoNome, setClienteNovoNome] = useState('')
  const [clienteSalvando, setClienteSalvando] = useState(false)
  const [clienteError, setClienteError] = useState('')

  // ── Cupom / desconto ────────────────────────────────────
  const [descontoModal, setDescontoModal] = useState(false)
  const [cupomCodigoInput, setCupomCodigoInput] = useState('')
  const [cupomAplicado, setCupomAplicado] = useState<CupomValidacao | null>(null)
  const [cupomValidando, setCupomValidando] = useState(false)
  const [cupomError, setCupomError] = useState('')

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
    }).catch(() => {
      toast.error('Erro ao carregar produtos do PDV')
      setLoading(false)
    })
  }, [])

  // Geocodifica o endereço (debounced) assim que rua/número/cidade estão
  // preenchidos, e usa o resultado pra pedir uma prévia do frete — só faz
  // sentido no modo Delivery.
  useEffect(() => {
    setEnderecoCoords(null)
    setFrete(null)
    if (modo !== 'DELIVERY' || !enderecoRua || !enderecoNumero || !enderecoCidade) return

    const endereco = [enderecoRua, enderecoNumero, enderecoBairro, enderecoCidade].filter(Boolean).join(', ')
    const timer = setTimeout(() => {
      geocodificarEndereco(endereco).then(coords => {
        setEnderecoCoords(coords)
        if (!coords) return
        setCalculandoFrete(true)
        entregaApi.previsaoFrete(coords.lat, coords.lng)
          .then(r => setFrete(r.data))
          .catch(() => setFrete(null))
          .finally(() => setCalculandoFrete(false))
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [modo, enderecoRua, enderecoNumero, enderecoBairro, enderecoCidade])

  const handleFiltro = (catId?: number) => {
    setFiltroCategoria(catId)
    setMostrarCombos(false)
    produtoApi.listar(catId).then(r => setProdutos(r.data.filter(p => p.ativo)))
  }

  const handleMostrarCombos = () => {
    setMostrarCombos(true)
    setFiltroCategoria(undefined)
  }

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
  const combosFiltrados = combos.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))

  const maxQtdProduto = (produtoId: number) => {
    const estoque = estoquePorProduto[produtoId]
    return estoque?.controlado ? estoque.quantidade : Infinity
  }

  const getQty = (key: string) => cart.find(i => i.key === key)?.quantidade ?? 0

  const addProdutoToCart = (produto: Produto) => {
    const max = maxQtdProduto(produto.id)
    const key = `p-${produto.id}`
    if (getQty(key) >= max) {
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

  const decrementCart = (item: CartItem) => {
    setCart(prev => {
      if (item.quantidade <= 1) return prev.filter(i => i.key !== item.key)
      return prev.map(i => i.key === item.key ? { ...i, quantidade: i.quantidade - 1 } : i)
    })
  }

  const removeFromCart = (key: string) => setCart(prev => prev.filter(i => i.key !== key))

  const subtotal = cart.reduce((acc, i) => acc + i.preco * i.quantidade, 0)

  const descontoAplicado = (() => {
    if (!cupomAplicado?.valido || cupomAplicado.valorDesconto == null) return 0
    const bruto = cupomAplicado.tipoDesconto === 'PERCENTUAL'
      ? subtotal * (cupomAplicado.valorDesconto / 100)
      : cupomAplicado.valorDesconto
    return Math.min(subtotal, Math.max(0, bruto))
  })()

  const valorFrete = modo === 'DELIVERY' && frete?.disponivel ? (frete.valorFrete ?? 0) : 0
  const total = Math.max(0, subtotal - descontoAplicado) + valorFrete

  const limparCarrinho = () => {
    setCart([])
    setObservacao('')
    setMetodo('DINHEIRO')
    setParcelas(1)
    setValorRecebido('')
    setCliente(null)
    setCupomAplicado(null)
    setClienteTelefoneDelivery('')
    setEnderecoRua('')
    setEnderecoNumero('')
    setEnderecoBairro('')
    setEnderecoCidade('')
    setEnderecoComplemento('')
  }

  const trocarModo = (novoModo: ModoVenda) => {
    if (novoModo === modo) return
    setModo(novoModo)
    setMetodo('DINHEIRO')
  }

  const troco = modo === 'BALCAO' && metodo === 'DINHEIRO' && valorRecebido ? Number(valorRecebido) - total : null
  const dinheiroInsuficiente = modo === 'BALCAO' && metodo === 'DINHEIRO' && (troco === null || troco < 0)
  const enderecoIncompleto = modo === 'DELIVERY' && (!enderecoRua || !enderecoNumero || !enderecoCidade)

  // ── Cliente: handlers ───────────────────────────────────
  const openClienteModal = () => {
    setClienteBusca('')
    setClienteEncontrado(undefined)
    setClienteNovoNome('')
    setClienteError('')
    setClienteModal(true)
  }

  const handleBuscarCliente = async () => {
    if (!clienteBusca.trim()) return
    setClienteBuscando(true)
    setClienteError('')
    try {
      const r = await clienteApi.buscarPorTelefone(clienteBusca.trim())
      setClienteEncontrado(r.data)
    } catch {
      setClienteEncontrado(null)
    } finally {
      setClienteBuscando(false)
    }
  }

  const handleSelecionarCliente = (c: Cliente) => {
    setCliente(c)
    setClienteModal(false)
    if (cupomAplicado) {
      // Cupom já validado pode depender do cliente (individual/grupo) — revalida.
      handleValidarCupom(cupomAplicado.codigo ?? '', c.id)
    }
  }

  const handleCadastrarCliente = async () => {
    if (!clienteNovoNome.trim()) {
      setClienteError('Informe o nome do cliente')
      return
    }
    setClienteSalvando(true)
    setClienteError('')
    try {
      const r = await clienteApi.criar({ nome: clienteNovoNome.trim(), telefone: clienteBusca.trim() })
      handleSelecionarCliente(r.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setClienteError(msg ?? 'Erro ao cadastrar cliente')
    } finally {
      setClienteSalvando(false)
    }
  }

  const handleRemoverCliente = () => {
    setCliente(null)
    setCupomAplicado(null)
  }

  // ── Cupom: handlers ─────────────────────────────────────
  const openDescontoModal = () => {
    setCupomCodigoInput(cupomAplicado?.codigo ?? '')
    setCupomError('')
    setDescontoModal(true)
  }

  const handleValidarCupom = async (codigo: string, clienteId?: number) => {
    if (!codigo.trim()) {
      setCupomError('Informe o código do cupom')
      return
    }
    setCupomValidando(true)
    setCupomError('')
    try {
      const r = await cupomApi.validar(codigo.trim(), clienteId ?? cliente?.id)
      if (!r.data.valido) {
        setCupomError(r.data.motivoInvalido ?? 'Cupom inválido')
        setCupomAplicado(null)
        return
      }
      setCupomAplicado(r.data)
      setDescontoModal(false)
    } catch {
      setCupomError('Não foi possível validar o cupom. Tente novamente.')
    } finally {
      setCupomValidando(false)
    }
  }

  const handleRemoverCupom = () => {
    setCupomAplicado(null)
    setDescontoModal(false)
  }

  const handleFinalizarBalcao = async () => {
    await pdvApi.criarVenda({
      itens: cart.map(i => i.comboId
        ? { comboId: i.comboId, comboQuantidade: i.quantidade, quantidade: i.quantidade }
        : { produtoId: i.produtoId, produtoNome: i.nome, quantidade: i.quantidade, precoUnitario: i.preco }),
      metodoPagamento: metodo,
      parcelas: metodo === 'CARTAO_CREDITO' ? parcelas : undefined,
      observacao: observacao || undefined,
      clienteId: cliente?.id,
      cupomCodigo: cupomAplicado?.valido ? cupomAplicado.codigo : undefined,
    })
    toast.success('Venda registrada com sucesso!')
  }

  const handleFinalizarDelivery = async () => {
    await entregaApi.criar({
      clienteNome: cliente?.nome ?? 'Cliente balcão',
      clienteTelefone: cliente?.telefone ?? clienteTelefoneDelivery ?? undefined,
      enderecoRua,
      enderecoNumero,
      enderecoBairro: enderecoBairro || undefined,
      enderecoCidade,
      enderecoComplemento: enderecoComplemento || undefined,
      enderecoLatitude: enderecoCoords?.lat,
      enderecoLongitude: enderecoCoords?.lng,
      metodoPagamento: metodo,
      parcelas: metodo === 'CARTAO_CREDITO' ? parcelas : undefined,
      observacao: observacao || undefined,
      itens: cart.map(i => i.comboId
        ? { comboId: i.comboId, comboQuantidade: i.quantidade, produtoNome: i.nome, precoUnitario: i.preco, quantidade: i.quantidade }
        : { produtoId: i.produtoId, produtoNome: i.nome, precoUnitario: i.preco, quantidade: i.quantidade }),
      origemPdv: true,
    })
    toast.success('Delivery registrado com sucesso!')
  }

  const handleFinalizar = async () => {
    if (!cart.length || dinheiroInsuficiente || enderecoIncompleto) return
    setSaving(true)
    try {
      if (modo === 'BALCAO') {
        await handleFinalizarBalcao()
      } else {
        await handleFinalizarDelivery()
      }
      limparCarrinho()
      onConcluida()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao finalizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.modoToggle}>
          <button
            className={`${styles.modoBtn} ${modo === 'BALCAO' ? styles.modoBtnAtivo : ''}`}
            onClick={() => trocarModo('BALCAO')}
          >
            Balcão
          </button>
          <button
            className={`${styles.modoBtn} ${modo === 'DELIVERY' ? styles.modoBtnAtivo : ''}`}
            onClick={() => trocarModo('DELIVERY')}
          >
            Delivery
          </button>
        </div>
      </div>

      {!sessaoCaixa && modo === 'BALCAO' && (
        <div className={styles.caixaFechadoAviso}>
          <FiLock size={16} />
          <span>Caixa fechado — abra o caixa (botão no topo da página) antes de vender.</span>
        </div>
      )}

      <input
        className={styles.buscaInput}
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar produto..."
      />

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
            onClick={handleMostrarCombos}
          >
            Combos
          </button>
        )}
      </div>

      <div className={styles.terminal}>
        <div className={styles.terminalPainel}>
          {loading ? <p>Carregando...</p> : mostrarCombos ? (
            <div className={styles.prodGrid}>
              {combosFiltrados.map(c => {
                const key = `c-${c.id}`
                const qty = getQty(key)
                return (
                  <Card key={c.id} className={styles.prodCard} padding="sm">
                    {c.imagemBase64 && <img src={c.imagemBase64} alt={c.nome} className={styles.prodThumb} />}
                    <div className={styles.prodNome}>{c.nome}</div>
                    <div className={styles.prodPreco}>{formatCurrency(c.preco)}</div>
                    <div className={styles.prodControls}>
                      {qty > 0 ? (
                        <>
                          <button className={styles.qtyBtn} onClick={() => decrementCart({ key, comboId: c.id, nome: c.nome, preco: c.preco, quantidade: qty })}>−</button>
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
              {combosFiltrados.length === 0 && <p>Nenhum combo disponível.</p>}
            </div>
          ) : (
            <div className={styles.prodGrid}>
              {produtosFiltrados.map(p => {
                const key = `p-${p.id}`
                const qty = getQty(key)
                const estoque = estoquePorProduto[p.id]
                const esgotado = estoque?.controlado && estoque.quantidade <= 0
                const poucasUnidades = estoque?.controlado && estoque.quantidade > 0 && estoque.quantidade <= LIMITE_ULTIMAS_UNIDADES
                return (
                  <Card key={p.id} className={`${styles.prodCard} ${esgotado ? styles.prodCardEsgotado : ''}`} padding="sm">
                    {p.imagemBase64 && <img src={p.imagemBase64} alt={p.nome} className={styles.prodThumb} />}
                    {esgotado && <Badge variant="danger" size="sm">Esgotado</Badge>}
                    {!esgotado && poucasUnidades && <Badge variant="warning" size="sm">Últimas {estoque!.quantidade}</Badge>}
                    <div className={styles.prodNome}>{p.nome}</div>
                    <div className={styles.prodPreco}>{formatCurrency(p.preco)}</div>
                    <div className={styles.prodControls}>
                      {esgotado ? (
                        <Button size="sm" disabled fullWidth>Esgotado</Button>
                      ) : qty > 0 ? (
                        <>
                          <button className={styles.qtyBtn} onClick={() => decrementCart({ key, produtoId: p.id, nome: p.nome, preco: p.preco, quantidade: qty })}>−</button>
                          <span className={styles.qty}>{qty}</span>
                          <button className={styles.qtyBtn} onClick={() => addProdutoToCart(p)}>+</button>
                        </>
                      ) : (
                        <button className={styles.addBtn} onClick={() => addProdutoToCart(p)}>Adicionar</button>
                      )}
                    </div>
                  </Card>
                )
              })}
              {produtosFiltrados.length === 0 && <p>Nenhum produto encontrado.</p>}
            </div>
          )}

          <div className={styles.acoesRapidas}>
            <button className={`${styles.acaoRapidaBtn} ${cliente ? styles.acaoRapidaBtnAtiva : ''}`} onClick={openClienteModal}>
              <FiUser size={18} />
              Cliente
            </button>
            <button className={`${styles.acaoRapidaBtn} ${cupomAplicado ? styles.acaoRapidaBtnAtiva : ''}`} onClick={openDescontoModal}>
              <FiTag size={18} />
              Desconto
            </button>
            <button className={styles.acaoRapidaBtn} onClick={limparCarrinho}>
              <FiTrash2 size={18} />
              Limpar Venda
            </button>
          </div>
        </div>

        <aside className={styles.recibo}>
          {cliente && (
            <div className={styles.clienteChip}>
              <span>{cliente.nome} · {cliente.telefone}</span>
              <button className={styles.clienteChipRemove} onClick={handleRemoverCliente}><FiX size={16} /></button>
            </div>
          )}

          <Card className={styles.reciboVisor} padding="md">
            <span className={styles.reciboVisorLabel}>Total</span>
            <span className={styles.reciboVisorValor}>{formatCurrency(total)}</span>
          </Card>

          <Card className={styles.reciboFita} padding="md">
            {cart.length === 0 ? (
              <p className={styles.reciboVazio}>— nenhum item —</p>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.key} className={styles.reciboLinha}>
                    <div className={styles.reciboLinhaInfo}>
                      <span className={styles.reciboLinhaNome}>{item.nome}</span>
                    </div>
                    <div className={styles.reciboLinhaControls}>
                      <button className={styles.reciboQtyBtn} onClick={() => decrementCart(item)}>−</button>
                      <span className={styles.reciboQty}>{item.quantidade}</span>
                      <button className={styles.reciboQtyBtn} onClick={() => incrementCart(item)}>+</button>
                    </div>
                    <span className={styles.reciboLinhaValor}>{formatCurrency(item.preco * item.quantidade)}</span>
                    <button className={styles.reciboRemoveBtn} onClick={() => removeFromCart(item.key)}><FiX size={16} /></button>
                  </div>
                ))}
                <div className={styles.breakdown}>
                  <div className={styles.breakdownRow}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {descontoAplicado > 0 && (
                    <div className={styles.breakdownRow}>
                      <span>Desconto{cupomAplicado?.codigo ? ` (${cupomAplicado.codigo})` : ''}</span>
                      <span className={styles.breakdownDesconto}>− {formatCurrency(descontoAplicado)}</span>
                    </div>
                  )}
                  {modo === 'DELIVERY' && (
                    <div className={styles.breakdownRow}>
                      <span>Frete{frete?.disponivel && frete.distanciaKm != null ? ` (${frete.distanciaKm} km)` : ''}</span>
                      <span>{calculandoFrete ? 'calculando...' : formatCurrency(valorFrete)}</span>
                    </div>
                  )}
                  <div className={styles.breakdownTotal}>
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </>
            )}
          </Card>

          {modo === 'DELIVERY' && cart.length > 0 && (
            <Card className={styles.reciboPagamento} padding="md">
              <h3 className={styles.sectionTitle}>Endereço de Entrega</h3>
              <div className={styles.fieldRow}>
                <Input
                  label="Telefone do cliente"
                  value={cliente ? cliente.telefone : clienteTelefoneDelivery}
                  onChange={e => setClienteTelefoneDelivery(e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={!!cliente}
                />
              </div>
              <div className={styles.fieldRow}>
                <Input label="Rua *" value={enderecoRua} onChange={e => setEnderecoRua(e.target.value)} placeholder="Nome da rua" />
                <Input label="Número *" value={enderecoNumero} onChange={e => setEnderecoNumero(e.target.value)} placeholder="Nº" />
              </div>
              <div className={styles.fieldRow}>
                <Input label="Bairro" value={enderecoBairro} onChange={e => setEnderecoBairro(e.target.value)} placeholder="Bairro" />
                <Input label="Cidade *" value={enderecoCidade} onChange={e => setEnderecoCidade(e.target.value)} placeholder="Cidade" />
              </div>
              <Input label="Complemento" value={enderecoComplemento} onChange={e => setEnderecoComplemento(e.target.value)} placeholder="Apto, bloco..." />
            </Card>
          )}

          {cart.length > 0 && (
            <Card className={styles.reciboPagamento} padding="md">
              <h3 className={styles.sectionTitle}>Forma de Pagamento</h3>
              <div className={styles.metodosGrid}>
                {(modo === 'BALCAO' ? METODOS_BALCAO : METODOS_DELIVERY).map(m => (
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

              {modo === 'BALCAO' && metodo === 'DINHEIRO' && (
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
              <Button
                size="lg"
                className={styles.sendBtn}
                loading={saving}
                onClick={handleFinalizar}
                disabled={(modo === 'BALCAO' && !sessaoCaixa) || dinheiroInsuficiente || enderecoIncompleto}
              >
                {modo === 'BALCAO' ? 'Finalizar Venda' : 'Confirmar Delivery'} — {formatCurrency(total)}
              </Button>
            </Card>
          )}
        </aside>
      </div>

      {/* Modal Cliente */}
      <Modal
        isOpen={clienteModal}
        onClose={() => setClienteModal(false)}
        title="Identificar Cliente"
        footer={<Button variant="outline" onClick={() => setClienteModal(false)}>Fechar</Button>}
      >
        <div className={styles.modalForm}>
          {clienteError && <div className={styles.modalError}>{clienteError}</div>}
          <Input
            label="Telefone do cliente"
            value={clienteBusca}
            onChange={e => setClienteBusca(e.target.value)}
            placeholder="(11) 91234-5678"
            onKeyDown={e => { if (e.key === 'Enter') handleBuscarCliente() }}
          />
          <Button onClick={handleBuscarCliente} loading={clienteBuscando}>
            <FiSearch size={16} /> Buscar
          </Button>

          {clienteEncontrado && (
            <div className={styles.buscaResultadoRow} onClick={() => handleSelecionarCliente(clienteEncontrado)}>
              <span>{clienteEncontrado.nome} · {clienteEncontrado.telefone}</span>
              <Button size="sm">Selecionar</Button>
            </div>
          )}

          {clienteEncontrado === null && (
            <>
              <p className={styles.modalHint}>Nenhum cliente com esse telefone. Cadastrar novo:</p>
              <Input
                label="Nome do cliente"
                value={clienteNovoNome}
                onChange={e => setClienteNovoNome(e.target.value)}
              />
              <Button onClick={handleCadastrarCliente} loading={clienteSalvando}>
                Cadastrar e selecionar
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Desconto (cupom) */}
      <Modal
        isOpen={descontoModal}
        onClose={() => setDescontoModal(false)}
        title="Aplicar Cupom"
        footer={<Button variant="outline" onClick={() => setDescontoModal(false)}>Fechar</Button>}
      >
        <div className={styles.modalForm}>
          {cupomError && <div className={styles.modalError}>{cupomError}</div>}

          {cupomAplicado?.valido && (
            <div className={styles.promoRow}>
              <span>Cupom <strong>{cupomAplicado.codigo}</strong> aplicado</span>
              <Button size="sm" variant="danger" onClick={handleRemoverCupom}>Remover</Button>
            </div>
          )}

          <Input
            label="Código do cupom"
            value={cupomCodigoInput}
            onChange={e => setCupomCodigoInput(e.target.value.toUpperCase())}
            placeholder="Ex: PROMO10"
            onKeyDown={e => { if (e.key === 'Enter') handleValidarCupom(cupomCodigoInput) }}
          />
          <Button onClick={() => handleValidarCupom(cupomCodigoInput)} loading={cupomValidando}>
            Aplicar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
