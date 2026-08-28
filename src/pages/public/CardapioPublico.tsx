import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { publicApi, type CategoriaPublico, type ComboPublico, type ProdutoPublico, type RestaurantePublico } from '../../api/publicApi'
import { pausaApi, type PausaStatus } from '../../api/pausaApi'
import { formatPhone } from '../../utils/formatters'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import sacolaIcon from '../../assets/icons/sacola.png'
import styles from './CardapioPublico.module.css'

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface CartItem {
  key: string
  produtoId?: number
  comboId?: number
  comboQuantidade?: number
  produtoNome: string
  precoUnitario: number
  quantidade: number
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

function ProdutoCardView({
  imagem, nome, descricao, preco, selo, qtd, onAdd, onRemove,
}: {
  imagem: string | null
  nome: string
  descricao?: string
  preco: number
  selo?: string
  qtd: number
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div className={styles.produtoCard}>
      <div className={styles.produtoInfo}>
        <h3 className={styles.produtoNome}>
          {nome}
          {selo && <span className={styles.promocaoSelo}>{selo}</span>}
        </h3>
        {descricao && <p className={styles.produtoDesc}>{descricao}</p>}
        <span className={styles.produtoPreco}>{formatBRL(preco)}</span>
      </div>
      {imagem ? (
        <div className={styles.produtoImgWrap}>
          <img src={imagem} alt={nome} className={styles.produtoThumb} />
          <div className={styles.produtoAcoesFloat}>
            {qtd === 0 ? (
              <button className={styles.btnAddFloat} onClick={onAdd} aria-label={`Adicionar ${nome}`}>+</button>
            ) : (
              <div className={styles.qtdControlsFloat}>
                <button className={styles.btnQtdSm} onClick={onRemove} aria-label={`Remover ${nome}`}>−</button>
                <span className={styles.qtdNumSm}>{qtd}</span>
                <button className={styles.btnQtdSm} onClick={onAdd} aria-label={`Adicionar ${nome}`}>+</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.produtoAcoesInline}>
          {qtd === 0 ? (
            <button className={styles.btnAdd} onClick={onAdd}>+ Adicionar</button>
          ) : (
            <div className={styles.qtdControls}>
              <button className={styles.btnQtd} onClick={onRemove}>−</button>
              <span className={styles.qtdNum}>{qtd}</span>
              <button className={styles.btnQtd} onClick={onAdd}>+</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
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
  const [combos, setCombos] = useState<ComboPublico[]>([])
  const [promocao, setPromocao] = useState<{ descricao: string; texto: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [pausaStatus, setPausaStatus] = useState<PausaStatus | null>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [tela, setTela] = useState<Tela>('cardapio')
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)
  const [pedidoAnterior, setPedidoAnterior] = useState<CartItem[] | null>(null)

  const [nome, setNome] = useState(paramName ? decodeURIComponent(paramName) : '')
  const [telefone, setTelefone] = useState(
    paramJid ? decodeURIComponent(paramJid) : (paramTel ? formatPhone(decodeURIComponent(paramTel)) : '')
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
        document.title = r.data.nome
        restauranteIdCarregado = r.data.id
        pausaApi.status(r.data.id).then(sr => setPausaStatus(sr.data)).catch(() => {})
        return publicApi.getCardapio(r.data.id)
      })
      .then(r => {
        const categoriasCarregadas = r.data.categorias
        setCategorias(categoriasCarregadas)
        setCombos(r.data.combos ?? [])
        if (r.data.promocaoAtiva) {
          const desc = r.data.promocaoTipoDesconto === 'PERCENTUAL'
            ? `${r.data.promocaoValorDesconto}%`
            : (r.data.promocaoValorDesconto ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          setPromocao({
            descricao: r.data.promocaoDescricao ?? 'Promoção',
            texto: `🎉 ${r.data.promocaoDescricao ?? 'Promoção ativa'} — ${desc} de desconto`,
          })
        }
        if (categoriasCarregadas.length > 0) setCategoriaAtiva(categoriasCarregadas[0].id)
        if (restauranteIdCarregado != null) {
          try {
            const raw = localStorage.getItem(chavePedidoAnterior(restauranteIdCarregado))
            if (raw) {
              const salvo: PedidoAnteriorStorage = JSON.parse(raw)
              const produtosPorId = new Map<number, ProdutoPublico>()
              categoriasCarregadas.forEach(c => c.produtos.forEach(p => produtosPorId.set(p.id, p)))
              const itensValidos: CartItem[] = salvo.itens
                .map((i): CartItem | null => {
                  const p = produtosPorId.get(i.produtoId)
                  if (!p) return null
                  return { key: `p-${p.id}`, produtoId: p.id, produtoNome: p.nome, precoUnitario: p.preco, quantidade: i.quantidade, nome: p.nome }
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
      { rootMargin: '-90px 0px -70% 0px', threshold: 0 }
    )
    categorias.forEach(c => {
      const el = document.getElementById(`categoria-${c.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [categorias, tela])

  const addItem = (produto: ProdutoPublico) => {
    const key = `p-${produto.id}`
    setCart(prev => {
      const idx = prev.findIndex(i => i.key === key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade + 1 }
        return next
      }
      return [...prev, {
        key,
        produtoId: produto.id,
        produtoNome: produto.nome,
        precoUnitario: produto.preco,
        quantidade: 1,
        nome: produto.nome,
      }]
    })
  }

  const removeItem = (produtoId: number) => {
    removeByKey(`p-${produtoId}`)
  }

  const addCombo = (combo: ComboPublico) => {
    const key = `c-${combo.id}`
    setCart(prev => {
      const idx = prev.findIndex(i => i.key === key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade + 1 }
        return next
      }
      return [...prev, {
        key,
        comboId: combo.id,
        comboQuantidade: 1,
        produtoNome: combo.nome,
        precoUnitario: combo.preco,
        quantidade: 1,
        nome: combo.nome,
      }]
    })
  }

  const removeCombo = (comboId: number) => {
    removeByKey(`c-${comboId}`)
  }

  const removeByKey = (key: string) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.key === key)
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
    cart.find(i => i.key === `p-${produtoId}`)?.quantidade ?? 0

  const quantidadeComboNoCart = (comboId: number) =>
    cart.find(i => i.key === `c-${comboId}`)?.quantidade ?? 0

  const excluirItem = (key: string) => {
    setCart(prev => prev.filter(i => i.key !== key))
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
        itens: cart.map(i => i.comboId
          ? { comboId: i.comboId, comboQuantidade: i.quantidade, produtoNome: i.produtoNome, precoUnitario: i.precoUnitario, quantidade: i.quantidade }
          : { produtoId: i.produtoId, produtoNome: i.produtoNome, precoUnitario: i.precoUnitario, quantidade: i.quantidade }),
      })
      try {
        // "Repetir pedido" só considera produtos (combos não são reconstruídos
        // aqui pra manter simples — o cliente pode adicionar o combo de novo).
        const itensProdutos = cart
          .filter(i => i.produtoId != null)
          .map(i => ({ produtoId: i.produtoId!, quantidade: i.quantidade }))
        if (itensProdutos.length > 0) {
          localStorage.setItem(chavePedidoAnterior(restaurante!.id), JSON.stringify({
            itens: itensProdutos,
            data: new Date().toISOString(),
          } satisfies PedidoAnteriorStorage))
        }
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
                <div key={item.key} className={styles.resumoItem}>
                  <span className={styles.resumoQtd}>{item.quantidade}x</span>
                  <span className={styles.resumoNome}>{item.nome}{item.comboId ? ' (combo)' : ''}</span>
                  <span className={styles.resumoPreco}>
                    {formatBRL(item.precoUnitario * item.quantidade)}
                  </span>
                  <button
                    type="button"
                    className={styles.btnRemoverItem}
                    aria-label={`Remover ${item.nome}`}
                    onClick={() => excluirItem(item.key)}
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
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                maxLength={15}
                value={telefone}
                onChange={e => setTelefone(formatPhone(e.target.value))}
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
  const aberto = pausaStatus?.aberto !== false

  return (
    <div className={styles.page} style={corVars(restaurante)}>
      <BackgroundLayer restaurante={restaurante} />

      <div className={styles.cover}>
        <div className={styles.avatarWrap}>
          <img src={restaurante.logoUrl || logo} alt={restaurante.nome} className={styles.avatar} />
        </div>
      </div>
      <div className={styles.identity}>
        <h1 className={styles.identityName}>{restaurante.nome}</h1>
        <p className={styles.identitySub}>Cardápio Digital • Delivery</p>
        {pausaStatus && (
          <div className={styles.statusRow}>
            <span className={`${styles.statusPill} ${aberto ? styles.statusPillAberto : styles.statusPillFechado}`}>
              ● {aberto ? 'Aberto agora' : 'Fechado no momento'}
            </span>
          </div>
        )}
      </div>

      <div className={styles.stickyNav}>
        {pausaStatus && pausaStatus.aberto === false && (
          <div className={styles.fechadoBanner}>
            <strong>Fechado no momento.</strong>
            {pausaStatus.motivo && <span> {pausaStatus.motivo}.</span>}
            {pausaStatus.reaberturaPrevista && (
              <span> Reabrimos em {formatDataHora(pausaStatus.reaberturaPrevista)}.</span>
            )}
          </div>
        )}

        {/* Tabs de categoria — clicar rola até a seção; também dá pra rolar a tela livremente */}
        <nav className={styles.categoriasNav}>
          {combos.length > 0 && (
            <button
              className={`${styles.catBtn} ${categoriaAtiva === -1 ? styles.catBtnAtivo : ''}`}
              onClick={() => irParaCategoria(-1)}
            >
              🎁 Combos
            </button>
          )}
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
      </div>

      {promocao && (
        <div className={styles.promocaoBanner}>{promocao.texto}</div>
      )}

      {pedidoAnterior && cart.length === 0 && (
        <div className={styles.repetirCard}>
          <div className={styles.repetirImagem}>
            <img src={sacolaIcon} alt="" className={styles.repetirIcone} />
          </div>
          <div className={styles.repetirTexto}>
            <span className={styles.repetirTitulo}>Pedir novamente?</span>
            <p className={styles.repetirResumo}>
              {pedidoAnterior.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
            </p>
            <span className={styles.produtoPreco}>
              {formatBRL(pedidoAnterior.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0))}
            </span>
          </div>
          <div className={styles.repetirBotaoWrap}>
            <button type="button" className={styles.btnRepetir} onClick={repetirPedido}>
              Repetir<span className={styles.btnRepetirExtra}> pedido</span>
            </button>
          </div>
        </div>
      )}

      {/* Produtos — todas as categorias listadas em sequência, navegáveis por rolagem */}
      <main className={styles.produtos}>
        {combos.length > 0 && (
          <section id="categoria--1" className={styles.categoriaSection}>
            <h2 className={styles.categoriaHeading}>Combos</h2>
            <div className={styles.produtosGrid}>
              {combos.map(combo => {
                const qtd = quantidadeComboNoCart(combo.id)
                return (
                  <ProdutoCardView
                    key={combo.id}
                    imagem={combo.imagemBase64}
                    nome={combo.nome}
                    descricao={combo.descricao || combo.itens.map(i => `${i.quantidade}x ${i.produtoNome}`).join(' + ')}
                    preco={combo.preco}
                    qtd={qtd}
                    onAdd={() => addCombo(combo)}
                    onRemove={() => removeCombo(combo.id)}
                  />
                )
              })}
            </div>
          </section>
        )}
        {categorias.map(cat => (
          <section key={cat.id} id={`categoria-${cat.id}`} className={styles.categoriaSection}>
            <h2 className={styles.categoriaHeading}>{cat.nome}</h2>
            <div className={styles.produtosGrid}>
              {cat.produtos.map(produto => {
                const qtd = quantidadeNoCart(produto.id)
                return (
                  <ProdutoCardView
                    key={produto.id}
                    imagem={produto.imagemBase64}
                    nome={produto.nome}
                    descricao={produto.descricao}
                    preco={produto.preco}
                    selo={promocao?.descricao}
                    qtd={qtd}
                    onAdd={() => addItem(produto)}
                    onRemove={() => removeItem(produto.id)}
                  />
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Barra do carrinho */}
      {totalItens > 0 && (
        <div className={styles.cartBar}>
          <button className={styles.btnCart} onClick={() => setTela('checkout')}>
            <span className={styles.cartBarLeft}>
              <span className={styles.cartBadge}>{totalItens}</span>
              Ver carrinho
            </span>
            <span className={styles.cartTotal}>{formatBRL(total)}</span>
          </button>
        </div>
      )}

    </div>
  )
}
