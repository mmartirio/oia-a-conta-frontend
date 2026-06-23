import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi, type CategoriaPublico, type ProdutoPublico, type RestaurantePublico, type ItemPedido } from '../../api/publicApi'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './CardapioPublico.module.css'

interface CartItem extends ItemPedido {
  nome: string
}

type Tela = 'cardapio' | 'checkout' | 'sucesso'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CardapioPublico() {
  const { slug } = useParams<{ slug: string }>()

  const [restaurante, setRestaurante] = useState<RestaurantePublico | null>(null)
  const [categorias, setCategorias] = useState<CategoriaPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [tela, setTela] = useState<Tela>('cardapio')
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroCheckout, setErroCheckout] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    publicApi.getRestaurante(slug)
      .then(r => {
        setRestaurante(r.data)
        return publicApi.getCardapio(r.data.id)
      })
      .then(r => {
        setCategorias(r.data)
        if (r.data.length > 0) setCategoriaAtiva(r.data[0].id)
      })
      .catch(() => setErro('Cardápio não encontrado ou indisponível.'))
      .finally(() => setLoading(false))
  }, [slug])

  const addItem = (produto: ProdutoPublico) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.produtoId === produto.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade + 1 }
        return next
      }
      return [...prev, {
        produtoId: produto.id,
        produtoNome: produto.nome,
        precoUnitario: produto.preco,
        quantidade: 1,
        nome: produto.nome,
      }]
    })
  }

  const removeItem = (produtoId: number) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.produtoId === produtoId)
      if (idx < 0) return prev
      const next = [...prev]
      if (next[idx].quantidade > 1) {
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade - 1 }
      } else {
        next.splice(idx, 1)
      }
      return next
    })
  }

  const quantidadeNoCart = (produtoId: number) =>
    cart.find(i => i.produtoId === produtoId)?.quantidade ?? 0

  const total = cart.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0)
  const totalItens = cart.reduce((s, i) => s + i.quantidade, 0)

  const handleCheckout = async () => {
    setErroCheckout('')
    if (!nome.trim()) { setErroCheckout('Informe seu nome.'); return }
    if (!telefone.trim()) { setErroCheckout('Informe seu WhatsApp.'); return }
    setEnviando(true)
    try {
      await publicApi.fazerPedido(restaurante!.id, {
        clienteNome: nome.trim(),
        telefone: telefone.trim(),
        itens: cart.map(i => ({
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          precoUnitario: i.precoUnitario,
          quantidade: i.quantidade,
        })),
      })
      setTela('sucesso')
    } catch {
      setErroCheckout('Erro ao enviar pedido. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Loading / Erro ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <img src={logo} alt="Oia a Conta" className={styles.loadingLogo} />
        <p>Carregando cardápio...</p>
      </div>
    )
  }

  if (erro || !restaurante) {
    return (
      <div className={styles.loadingPage}>
        <img src={logo} alt="Oia a Conta" className={styles.loadingLogo} />
        <p className={styles.erroMsg}>{erro || 'Restaurante não encontrado.'}</p>
      </div>
    )
  }

  // ── Tela de sucesso ────────────────────────────────────────────────────────
  if (tela === 'sucesso') {
    return (
      <div className={styles.sucessoPage}>
        <div className={styles.sucessoCard}>
          <div className={styles.sucessoIcon}>✅</div>
          <h1 className={styles.sucessoTitle}>Pedido recebido!</h1>
          <p className={styles.sucessoDesc}>
            Enviamos uma mensagem para o seu WhatsApp<br />
            <strong>{telefone}</strong><br /><br />
            Continue a conversa no WhatsApp para informar o endereço e finalizar a entrega.
          </p>
          <button className={styles.btnVoltar} onClick={() => { setTela('cardapio'); setCart([]) }}>
            Fazer novo pedido
          </button>
        </div>
      </div>
    )
  }

  // ── Tela de checkout ───────────────────────────────────────────────────────
  if (tela === 'checkout') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.btnBack} onClick={() => setTela('cardapio')}>← Voltar</button>
          <h1 className={styles.headerTitle}>{restaurante.nome}</h1>
        </header>

        <div className={styles.checkoutWrapper}>
          <h2 className={styles.checkoutTitle}>Confirmar pedido</h2>

          <div className={styles.resumoPedido}>
            {cart.map(item => (
              <div key={item.produtoId} className={styles.resumoItem}>
                <span className={styles.resumoQtd}>{item.quantidade}x</span>
                <span className={styles.resumoNome}>{item.nome}</span>
                <span className={styles.resumoPreco}>
                  {formatBRL(item.precoUnitario * item.quantidade)}
                </span>
              </div>
            ))}
            <div className={styles.resumoTotal}>
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Seu nome</label>
            <input
              className={styles.input}
              placeholder="Como devemos te chamar?"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>WhatsApp (com DDD)</label>
            <input
              className={styles.input}
              type="tel"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
            />
            <p className={styles.inputHint}>
              Enviaremos uma mensagem para confirmar o endereço de entrega.
            </p>
          </div>

          {erroCheckout && <p className={styles.erroMsg}>{erroCheckout}</p>}

          <button
            className={styles.btnPedido}
            onClick={handleCheckout}
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : `Fazer pedido — ${formatBRL(total)}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Tela do cardápio ───────────────────────────────────────────────────────
  const categoriaAtivaData = categorias.find(c => c.id === categoriaAtiva)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>{restaurante.nome}</h1>
        <p className={styles.headerSub}>Cardápio Digital • Delivery</p>
      </header>

      {/* Tabs de categoria */}
      <nav className={styles.categoriasNav}>
        {categorias.map(c => (
          <button
            key={c.id}
            className={`${styles.catBtn} ${categoriaAtiva === c.id ? styles.catBtnAtivo : ''}`}
            onClick={() => setCategoriaAtiva(c.id)}
          >
            {c.nome}
          </button>
        ))}
      </nav>

      {/* Produtos */}
      <main className={styles.produtos}>
        {categoriaAtivaData?.produtos.map(produto => {
          const qtd = quantidadeNoCart(produto.id)
          return (
            <div key={produto.id} className={styles.produtoCard}>
              <div className={styles.produtoInfo}>
                <h3 className={styles.produtoNome}>{produto.nome}</h3>
                {produto.descricao && (
                  <p className={styles.produtoDesc}>{produto.descricao}</p>
                )}
                <span className={styles.produtoPreco}>{formatBRL(produto.preco)}</span>
              </div>
              <div className={styles.produtoAcoes}>
                {qtd === 0 ? (
                  <button className={styles.btnAdd} onClick={() => addItem(produto)}>
                    + Adicionar
                  </button>
                ) : (
                  <div className={styles.qtdControls}>
                    <button className={styles.btnQtd} onClick={() => removeItem(produto.id)}>−</button>
                    <span className={styles.qtdNum}>{qtd}</span>
                    <button className={styles.btnQtd} onClick={() => addItem(produto)}>+</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </main>

      {/* Botão flutuante do carrinho */}
      {totalItens > 0 && (
        <div className={styles.cartBar}>
          <button className={styles.btnCart} onClick={() => setTela('checkout')}>
            <span className={styles.cartBadge}>{totalItens}</span>
            Ver carrinho
            <span className={styles.cartTotal}>{formatBRL(total)}</span>
          </button>
        </div>
      )}

      <footer className={styles.footer}>
        <img src={logo} alt="Oia a Conta" className={styles.footerLogo} />
      </footer>
    </div>
  )
}
