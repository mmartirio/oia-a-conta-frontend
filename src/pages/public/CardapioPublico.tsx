import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { publicApi, type CategoriaPublico, type ProdutoPublico, type RestaurantePublico, type ItemPedido } from '../../api/publicApi'
import { pausaApi, type PausaStatus } from '../../api/pausaApi'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './CardapioPublico.module.css'

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface CartItem extends ItemPedido {
  nome: string
}

interface PedidoAnteriorStorage {
  itens: { produtoId: number; quantidade: number }[]
  data: string
}

function chavePedidoAnterior(restauranteId: number) {
  return `oiaaconta_ultimo_pedido_${restauranteId}`
}

type Tela = 'cardapio' | 'checkout' | 'sucesso'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function linkWhatsapp(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '')
  if (!digitos) return null
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos
  return `https://wa.me/${numero}`
}

function corVars(restaurante: RestaurantePublico | null): React.CSSProperties {
  if (!restaurante) return {}
  return {
    ...(restaurante.corPrimaria ? { '--primary': restaurante.corPrimaria } : {}),
    ...(restaurante.corSecundaria ? { '--secondary': restaurante.corSecundaria } : {}),
    ...(restaurante.corAccent ? { '--accent': restaurante.corAccent } : {}),
    ...(restaurante.corTexto ? { '--titulo-cor': restaurante.corTexto } : {}),
  } as React.CSSProperties
}

function BackgroundLayer({ restaurante }: { restaurante: RestaurantePublico | null }) {
  if (!restaurante?.backgroundUrl) return null
  const opacidade = (restaurante.backgroundOpacidade ?? 15) / 100
  return (
    <div
      className={styles.backgroundLayer}
      style={{ backgroundImage: `url(${restaurante.backgroundUrl})`, opacity: opacidade }}
    />
  )
}

export function CardapioPublico() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()

  const paramName = searchParams.get('name')
  const paramJid  = searchParams.get('jid')   // @lid contact
  const paramTel  = searchParams.get('tel')   // regular contact

  // true quando o cliente veio do WhatsApp via @lid (não tem número legível)
  const isJidContact = Boolean(paramJid?.endsWith('@lid'))

  const [restaurante, setRestaurante] = useState<RestaurantePublico | null>(null)
  const [categorias, setCategorias] = useState<CategoriaPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [pausaStatus, setPausaStatus] = useState<PausaStatus | null>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [tela, setTela] = useState<Tela>('cardapio')
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)
  const [pedidoAnterior, setPedidoAnterior] = useState<CartItem[] | null>(null)

  const [nome, setNome] = useState(paramName ? decodeURIComponent(paramName) : '')
  const [telefone, setTelefone] = useState(
    paramJid ? decodeURIComponent(paramJid) : (paramTel ? decodeURIComponent(paramTel) : '')
  )
  const [endereco, setEndereco] = useState('')
  const [metodoPagamento, setMetodoPagamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroCheckout, setErroCheckout] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    let restauranteIdCarregado: number | null = null
    publicApi.getRestaurante(slug)
      .then(r => {
        setRestaurante(r.data)
        restauranteIdCarregado = r.data.id
        pausaApi.status(r.data.id).then(sr => setPausaStatus(sr.data)).catch(() => {})
        return publicApi.getCardapio(r.data.id)
      })
      .then(r => {
        setCategorias(r.data)
        if (r.data.length > 0) setCategoriaAtiva(r.data[0].id)
        if (restauranteIdCarregado != null) {
          try {
            const raw = localStorage.getItem(chavePedidoAnterior(restauranteIdCarregado))
            if (raw) {
              const salvo: PedidoAnteriorStorage = JSON.parse(raw)
              const produtosPorId = new Map<number, ProdutoPublico>()
              r.data.forEach(c => c.produtos.forEach(p => produtosPorId.set(p.id, p)))
              const itensValidos: CartItem[] = salvo.itens
                .map(i => {
                  const p = produtosPorId.get(i.produtoId)
                  if (!p) return null
                  return { produtoId: p.id, produtoNome: p.nome, precoUnitario: p.preco, quantidade: i.quantidade, nome: p.nome }
                })
                .filter((i): i is CartItem => i !== null)
              if (itensValidos.length > 0) setPedidoAnterior(itensValidos)
            }
          } catch { /* localStorage indisponível ou dado corrompido — ignora */ }
        }
      })
      .catch(() => setErro('Cardápio não encontrado ou indisponível.'))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (tela !== 'sucesso' || !restaurante) return
    const link = linkWhatsapp(restaurante.telefone)
    if (!link) return
    const timer = setTimeout(() => { window.location.href = link }, 2500)
    return () => clearTimeout(timer)
  }, [tela, restaurante])

  // Scroll-spy: destaca a categoria visível no topo enquanto o cliente rola a tela
  useEffect(() => {
    if (categorias.length === 0 || tela !== 'cardapio') return
    const observer = new IntersectionObserver(
      entries => {
        const visiveis = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visiveis[0]) {
          const id = Number(visiveis[0].target.id.replace('categoria-', ''))
          if (!Number.isNaN(id)) setCategoriaAtiva(id)
        }
      },
      { rootMargin: '-120px 0px -70% 0px', threshold: 0 }
    )
    categorias.forEach(c => {
      const el = document.getElementById(`categoria-${c.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [categorias, tela])

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

  const excluirItem = (produtoId: number) => {
    setCart(prev => prev.filter(i => i.produtoId !== produtoId))
  }

  const cancelarPedido = () => {
    if (!window.confirm('Deseja cancelar o pedido e esvaziar o carrinho?')) return
    setCart([])
    setTela('cardapio')
  }

  const irParaCategoria = (id: number) => {
    setCategoriaAtiva(id)
    document.getElementById(`categoria-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const repetirPedido = () => {
    if (!pedidoAnterior) return
    setCart(pedidoAnterior)
    setTela('checkout')
  }

  const total = cart.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0)
  const totalItens = cart.reduce((s, i) => s + i.quantidade, 0)

  const handleCheckout = async () => {
    setErroCheckout('')
    if (!nome.trim()) { setErroCheckout('Informe seu nome.'); return }
    if (!isJidContact && !telefone.trim()) { setErroCheckout('Informe seu WhatsApp.'); return }
    if (!endereco.trim()) { setErroCheckout('Informe o endereço de entrega.'); return }
    if (!metodoPagamento) { setErroCheckout('Escolha a forma de pagamento.'); return }
    setEnviando(true)
    try {
      await publicApi.fazerPedido(restaurante!.id, {
        clienteNome: nome.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        metodoPagamento,
        observacao: observacao.trim() || undefined,
        itens: cart.map(i => ({
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          precoUnitario: i.precoUnitario,
          quantidade: i.quantidade,
        })),
      })
      try {
        localStorage.setItem(chavePedidoAnterior(restaurante!.id), JSON.stringify({
          itens: cart.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
          data: new Date().toISOString(),
        } satisfies PedidoAnteriorStorage))
      } catch { /* localStorage indisponível — não é crítico */ }
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
    const link = linkWhatsapp(restaurante.telefone)
    return (
      <div className={styles.sucessoPage}>
        <div className={styles.sucessoCard}>
          <div className={styles.sucessoIcon}>✅</div>
          <h1 className={styles.sucessoTitle}>Pedido enviado!</h1>
          <p className={styles.sucessoDesc}>
            Seu pedido foi enviado com sucesso para o restaurante.<br />
            Enviamos a confirmação para o seu WhatsApp<br />
            <strong>{telefone}</strong><br /><br />
            Acompanhe as atualizações por lá.
          </p>
          {link && (
            <a className={styles.btnPedido} href={link}>
              Voltar para o WhatsApp
            </a>
          )}
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
      <div className={styles.page} style={corVars(restaurante)}>
        <BackgroundLayer restaurante={restaurante} />
        <header className={styles.header}>
          <button className={styles.btnBack} onClick={() => setTela('cardapio')}>← Voltar</button>
          <h1 className={styles.headerTitle}>{restaurante.nome}</h1>
        </header>

        <div className={styles.checkoutWrapper}>
          <h2 className={styles.checkoutTitle}>Confirmar pedido</h2>

          {cart.length === 0 ? (
            <p className={styles.inputHint}>Seu carrinho está vazio.</p>
          ) : (
            <div className={styles.resumoPedido}>
              {cart.map(item => (
                <div key={item.produtoId} className={styles.resumoItem}>
                  <span className={styles.resumoQtd}>{item.quantidade}x</span>
                  <span className={styles.resumoNome}>{item.nome}</span>
                  <span className={styles.resumoPreco}>
                    {formatBRL(item.precoUnitario * item.quantidade)}
                  </span>
                  <button
                    type="button"
                    className={styles.btnRemoverItem}
                    aria-label={`Remover ${item.nome}`}
                    onClick={() => excluirItem(item.produtoId)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className={styles.resumoTotal}>
                <span>Total</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>
          )}

          <button type="button" className={styles.btnCancelarPedido} onClick={cancelarPedido}>
            Cancelar pedido
          </button>

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
            {isJidContact ? (
              <div className={styles.whatsappConectado}>
                ✓ WhatsApp identificado automaticamente
              </div>
            ) : (
              <input
                className={styles.input}
                type="tel"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
              />
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Endereço de entrega</label>
            <textarea
              className={styles.input}
              placeholder="Rua, número, bairro, cidade..."
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Forma de pagamento</label>
            <select
              className={styles.input}
              value={metodoPagamento}
              onChange={e => setMetodoPagamento(e.target.value)}
            >
              <option value="">Selecione...</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Observações (opcional)</label>
            <textarea
              className={styles.input}
              placeholder="Ex: sem cebola, troco para R$ 50..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
            />
          </div>

          {erroCheckout && <p className={styles.erroMsg}>{erroCheckout}</p>}

          <button
            className={styles.btnPedido}
            onClick={handleCheckout}
            disabled={enviando || cart.length === 0}
          >
            {enviando ? 'Enviando...' : `Fazer pedido — ${formatBRL(total)}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Tela do cardápio ───────────────────────────────────────────────────────
  return (
    <div className={styles.page} style={corVars(restaurante)}>
      <BackgroundLayer restaurante={restaurante} />
      <div className={styles.headerStickyWrap}>
        <header className={`${styles.header} ${styles.headerCentro}`}>
          <img src={restaurante.logoUrl || logo} alt={restaurante.nome} className={styles.headerLogo} />
          <div>
            <h1 className={styles.headerTitle}>{restaurante.nome}</h1>
            <p className={styles.headerSub}>Cardápio Digital • Delivery</p>
          </div>
        </header>

        {pausaStatus && pausaStatus.aberto === false && (
          <div className={styles.fechadoBanner}>
            <strong>Fechado no momento.</strong>
            {pausaStatus.motivo && <span> {pausaStatus.motivo}.</span>}
            {pausaStatus.reaberturaPrevista && (
              <span> Reabrimos em {formatDataHora(pausaStatus.reaberturaPrevista)}.</span>
            )}
          </div>
        )}
      </div>

      {pedidoAnterior && cart.length === 0 && (
        <div className={styles.repetirCard}>
          <span className={styles.repetirTitulo}>Pedir novamente?</span>
          <p className={styles.repetirResumo}>
            {pedidoAnterior.map(i => `${i.quantidade}x ${i.nome}`).join(', ')} —{' '}
            {formatBRL(pedidoAnterior.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0))}
          </p>
          <button type="button" className={styles.btnRepetir} onClick={repetirPedido}>
            Repetir pedido
          </button>
        </div>
      )}

      {/* Tabs de categoria — clicar rola até a seção; também dá pra rolar a tela livremente */}
      <nav className={styles.categoriasNav}>
        {categorias.map(c => (
          <button
            key={c.id}
            className={`${styles.catBtn} ${categoriaAtiva === c.id ? styles.catBtnAtivo : ''}`}
            onClick={() => irParaCategoria(c.id)}
          >
            {c.nome}
          </button>
        ))}
      </nav>

      {/* Produtos — todas as categorias listadas em sequência, navegáveis por rolagem */}
      <main className={styles.produtos}>
        {categorias.map(cat => (
          <section key={cat.id} id={`categoria-${cat.id}`} className={styles.categoriaSection}>
            <h2 className={styles.categoriaHeading}>{cat.nome}</h2>
            <div className={styles.produtosGrid}>
              {cat.produtos.map(produto => {
                const qtd = quantidadeNoCart(produto.id)
                return (
                  <div key={produto.id} className={styles.produtoCard}>
                    {produto.imagemBase64 && (
                      <img src={produto.imagemBase64} alt={produto.nome} className={styles.produtoThumb} />
                    )}
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
            </div>
          </section>
        ))}
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

    </div>
  )
}
