import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiClipboard, FiTruck, FiCoffee, FiShoppingCart, FiMessageCircle, FiPieChart,
  FiChevronLeft, FiChevronRight, FiCheckCircle,
} from 'react-icons/fi'
import { FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { billingApi, type Plano, type LinkSocial } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PlanoCard } from '../../components/PlanoCard'
import planoCardStyles from '../../components/PlanoCard.module.css'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import hamburger from '../../assets/image/hamburger.png'
import acai from '../../assets/image/acai.png'
import chefFemale from '../../assets/image/chef_female.png'
import styles from './LandingPage.module.css'

const RECURSOS = [
  {
    Icon: FiClipboard, titulo: 'Mesas & Comandas',
    desc: 'Cada mesa tem sua comanda digital: o garçom lança os pedidos pelo celular ou tablet, a cozinha recebe na hora e a conta fecha sozinha, certinha, sem precisar conferir papel nem calcular na mão.',
    bullets: [
      'Comandas ilimitadas por mesa, sem limite de itens ou trocas de pedido',
      'Divisão de conta por pessoa ou por item, sem erro de cálculo',
      'Pedido aparece na cozinha assim que o garçom lança, em tempo real',
      'Transferência e junção de mesas quando o grupo muda de lugar ou cresce',
      'Histórico completo de cada comanda fechada, pra consultar depois',
    ],
  },
  {
    Icon: FiTruck, titulo: 'Delivery',
    desc: 'O cliente pede pelo cardápio digital, o pedido cai direto na fila de entrega e o entregador recebe a rota pra sair sem perder tempo — tudo isso já integrado com o resto do restaurante, num painel só.',
    bullets: [
      'Cardápio digital com link próprio, pra divulgar nas redes ou no WhatsApp',
      'Painel de entregadores mostra a rota otimizada de cada entrega',
      'Cliente acompanha o status do pedido em tempo real, do preparo à entrega',
      'Cálculo automático de frete por distância, sem precisar negociar',
      'Integração com iFood pra centralizar pedidos de mais de um canal',
    ],
  },
  {
    Icon: FiCoffee, titulo: 'Cozinha',
    desc: 'Uma tela só pra cozinha acompanhar tudo o que precisa sair — mesa e delivery juntos, organizados por ordem de chegada, sem post-it perdido nem pedido esquecido no meio da correria.',
    bullets: [
      'Fila de preparo organizada automaticamente por horário do pedido',
      'Impressão automática de comandas assim que o pedido entra',
      'Alerta sonoro avisa a equipe sempre que chega um pedido novo',
      'Marcação de item pronto por etapa, pra acompanhar o preparo',
      'Pedidos de mesa e delivery na mesma fila, sem confusão entre eles',
    ],
  },
  {
    Icon: FiShoppingCart, titulo: 'Caixa (PDV)',
    desc: 'Do balcão ao fechamento do dia: o caixa registra vendas avulsas, controla entradas e saídas durante o turno e fecha a sessão já com a conferência pronta, sem precisar recontar nada na mão.',
    bullets: [
      'Abertura e fechamento de caixa com conferência automática de valores',
      'Aceita múltiplas formas de pagamento na mesma venda',
      'Sangria e suprimento registrados, com motivo e responsável',
      'Venda rápida de balcão sem precisar abrir uma comanda',
      'Relatório de fechamento por operador, pra saber quem vendeu o quê',
    ],
  },
  {
    Icon: FiMessageCircle, titulo: 'WhatsApp',
    desc: 'Um chatbot que atende o cliente sozinho, 24 horas por dia: recebe o pedido, confirma endereço e forma de pagamento — e só chama alguém da equipe quando realmente precisa de uma pessoa.',
    bullets: [
      'Atendimento automático 24h, mesmo com o restaurante fechado',
      'Confirma endereço e forma de pagamento sem intervenção manual',
      'Passa a conversa pra um atendente humano quando o cliente pede',
      'Envia o status do pedido automaticamente pro cliente acompanhar',
      'Guarda o histórico de conversas por cliente pra consultar depois',
    ],
  },
  {
    Icon: FiPieChart, titulo: 'Financeiro',
    desc: 'Faturamento, despesas e comissões reunidos num painel só, com gráficos prontos — pra você enxergar rápido se o mês está bom, sem precisar montar planilha nem juntar relatório de sistema nenhum.',
    bullets: [
      'Relatórios de faturamento por dia, semana ou mês, prontos pra ver',
      'Controle de despesas e comissões de funcionários num lugar só',
      'Gráficos visuais pra decisão rápida, sem precisar interpretar números soltos',
      'Fechamento de caixa consolidado de todo o período escolhido',
      'Exportação de dados pra passar direto pra contabilidade',
    ],
  },
]

export function LandingPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loadingPlanos, setLoadingPlanos] = useState(true)
  const [linksSociais, setLinksSociais] = useState<LinkSocial[]>([])
  const carrosselRef = useRef<HTMLDivElement>(null)
  const carrosselPausadoRef = useRef(false)
  const [indiceAtivo, setIndiceAtivo] = useState(0)

  // Ao final do carrossel real (RECURSOS) entra um clone do primeiro card —
  // ao "avançar" pra ele, a animação continua pra frente normalmente (em
  // vez de voltar visualmente por cima de todos os cards); assim que a
  // animação termina, salta sem animação pro card real (idêntico ao clone),
  // um reset invisível pro usuário.
  const total = RECURSOS.length

  const animarScrollPara = (destino: number, aoFinalizar?: () => void) => {
    const el = carrosselRef.current
    if (!el) return
    const inicio = el.scrollLeft
    const distancia = destino - inicio
    if (distancia === 0) { aoFinalizar?.(); return }
    // scroll-snap-type "mandatory" briga com escrever scrollLeft manualmente
    // quadro a quadro — o navegador tenta "corrigir" pro ponto de snap no
    // meio da animação e ela fica travando em vez de deslizar. Desliga só
    // durante a animação própria; o arraste manual do usuário continua
    // com snap normalmente.
    const duracaoMs = 280
    const t0 = performance.now()
    el.style.scrollSnapType = 'none'
    const passo = (t: number) => {
      const progresso = Math.min((t - t0) / duracaoMs, 1)
      const suavizado = 1 - Math.pow(1 - progresso, 3)
      el.scrollLeft = inicio + distancia * suavizado
      if (progresso < 1) {
        requestAnimationFrame(passo)
      } else {
        el.style.scrollSnapType = ''
        aoFinalizar?.()
      }
    }
    requestAnimationFrame(passo)
  }

  const irParaIndice = (indice: number) => {
    const el = carrosselRef.current
    if (!el) return
    setIndiceAtivo(indice === total ? 0 : indice)
    animarScrollPara(indice * el.clientWidth, () => {
      if (indice === total) el.scrollLeft = 0
    })
  }

  const indiceAtual = () => {
    const el = carrosselRef.current
    return el ? Math.round(el.scrollLeft / el.clientWidth) : 0
  }

  // Sincroniza as bolinhas quando o usuário arrasta manualmente (sem passar
  // pelas setas/autoplay, que já atualizam via irParaIndice).
  useEffect(() => {
    const el = carrosselRef.current
    if (!el) return
    let timeout: ReturnType<typeof setTimeout>
    const aoRolar = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const indice = Math.round(el.scrollLeft / el.clientWidth)
        setIndiceAtivo(indice === total ? 0 : indice)
      }, 120)
    }
    el.addEventListener('scroll', aoRolar)
    return () => { el.removeEventListener('scroll', aoRolar); clearTimeout(timeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollCarrossel = (direcao: 1 | -1) => {
    irParaIndice(Math.max(0, Math.min(total, indiceAtual() + direcao)))
  }

  // Avança sozinho a cada 5s. Pausa enquanto o mouse está em cima, pra não
  // brigar com quem está lendo/arrastando manualmente.
  useEffect(() => {
    const id = setInterval(() => {
      if (carrosselPausadoRef.current) return
      irParaIndice(indiceAtual() + 1)
    }, 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    billingApi.listarPlanos()
      .then(r => setPlanos(r.data.filter(p => p.ativo)))
      .catch(() => setPlanos([]))
      .finally(() => setLoadingPlanos(false))
    billingApi.listarLinksSociais()
      .then(r => setLinksSociais(r.data))
      .catch(() => setLinksSociais([]))
  }, [])

  const linkInstagram = linksSociais.find(l => l.tipo === 'INSTAGRAM')
  const linkWhatsapp = linksSociais.find(l => l.tipo === 'WHATSAPP')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img src={logo} alt="Oia a Conta" className={styles.headerLogo} />
        <nav className={styles.nav}>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
        </nav>
        <div className={styles.headerActions}>
          <Link to="/login"><Button variant="outline">Entrar</Button></Link>
          <Link to="/registro"><Button>Criar conta grátis</Button></Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBlobA} />
        <div className={styles.heroBlobB} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Do salão ao delivery, num só painel</h1>
          <p className={styles.heroSubtitle}>
            Mesas, comandas, cozinha, caixa, delivery e WhatsApp integrados — pra você
            gerenciar o restaurante inteiro sem trocar de tela.
          </p>
          <div className={styles.heroActions}>
            <Link to="/registro"><Button size="lg" className={styles.btnPrimaryHero}>Começar agora</Button></Link>
            <a href="#planos"><Button size="lg" variant="ghost" className={styles.btnGhostHero}>Ver planos</Button></a>
          </div>
        </div>
        <img src={chefFemale} alt="Chef" className={styles.heroImagem} />
      </section>

      <section id="recursos" className={`${styles.section} ${styles.recursosSection}`}>
        <h2 className={styles.sectionTitle}>Tudo o que o seu restaurante precisa</h2>
        <div className={styles.recursosRow}>
          <div
            className={styles.recursosCarrosselWrap}
            onMouseEnter={() => { carrosselPausadoRef.current = true }}
            onMouseLeave={() => { carrosselPausadoRef.current = false }}
          >
            <button
              type="button"
              className={`${styles.carrosselSeta} ${styles.carrosselSetaEsq}`}
              onClick={() => scrollCarrossel(-1)}
              aria-label="Recurso anterior"
            >
              <FiChevronLeft size={20} />
            </button>

            <div className={styles.recursosCarrossel} ref={carrosselRef}>
              {/* Clone do primeiro card no final — ver comentário de "total"
                  acima, é o que permite o loop parecer contínuo pra frente. */}
              {[...RECURSOS, RECURSOS[0]].map((r, i) => (
                <Card key={i === RECURSOS.length ? `${r.titulo}-clone` : r.titulo} className={styles.recursoCard}>
                  <r.Icon size={64} className={styles.recursoIcon} />
                  <h3 className={styles.recursoTitulo}>{r.titulo}</h3>
                  <p className={styles.recursoDesc}>{r.desc}</p>
                  <ul className={styles.recursoLista}>
                    {r.bullets.map(b => (
                      <li key={b}>
                        <FiCheckCircle className={styles.recursoBulletIcon} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>

            <button
              type="button"
              className={`${styles.carrosselSeta} ${styles.carrosselSetaDir}`}
              onClick={() => scrollCarrossel(1)}
              aria-label="Próximo recurso"
            >
              <FiChevronRight size={20} />
            </button>
          </div>

          <div className={styles.carrosselIndicadores}>
            {RECURSOS.map((r, i) => (
              <button
                key={r.titulo}
                type="button"
                className={`${styles.carrosselPonto} ${i === indiceAtivo ? styles.carrosselPontoAtivo : ''}`}
                onClick={() => irParaIndice(i)}
                aria-label={`Ir pro recurso ${r.titulo}`}
              />
            ))}
          </div>

          <div className={styles.recursosImagem}>
            <img src={hamburger} alt="Hambúrguer" />
          </div>
          <div className={styles.recursosImagemEsquerda}>
            <img src={acai} alt="Açaí" />
          </div>
        </div>
      </section>

      <section id="planos" className={styles.sectionAlt}>
        <h2 className={styles.sectionTitle}>Planos para todo tamanho de restaurante</h2>
        <p className={styles.sectionSubtitle}>Escolha um plano e comece ainda hoje.</p>

        {loadingPlanos ? (
          <p className={styles.loading}>Carregando planos...</p>
        ) : planos.length === 0 ? (
          <p className={styles.loading}>Nenhum plano disponível no momento.</p>
        ) : (
          <div className={styles.planosGrid}>
            {planos.map(p => (
              <div key={p.id} className={styles.planoCardWrap}>
                <PlanoCard plano={p}>
                  {modalidade => (
                    <Link to={`/registro?planoId=${p.id}${p.exigeModalidadeOperacao ? `&modalidade=${modalidade}` : ''}`}>
                      <Button
                        fullWidth
                        variant={p.destaque ? 'primary' : 'outline'}
                        className={planoCardStyles.selecionarBtn}
                      >
                        Assinar
                      </Button>
                    </Link>
                  )}
                </PlanoCard>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.ctaFinal}>
        <h2 className={styles.ctaTitle}>Pronto para simplificar a gestão do seu restaurante?</h2>
        <div className={styles.heroActions}>
          <Link to="/registro"><Button size="lg">Criar conta grátis</Button></Link>
          <Link to="/login"><Button size="lg" variant="ghost">Já tenho conta</Button></Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <img src={logo} alt="Oia a Conta" className={styles.footerLogo} />
        <p>© {new Date().getFullYear()} Oia a Conta</p>
        <div className={styles.footerDocs}>
          <Link to="/contrato">Contrato de Adesão</Link>
          <Link to="/termos-de-uso">Termos de Uso</Link>
          <Link to="/privacidade">Política de Privacidade</Link>
        </div>
        {(linkInstagram || linkWhatsapp) && (
          <div className={styles.footerLinks}>
            {linkInstagram && (
              <a href={linkInstagram.url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram size={22} />
              </a>
            )}
            {linkWhatsapp && (
              <a href={linkWhatsapp.url} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <FaWhatsapp size={22} />
              </a>
            )}
          </div>
        )}
      </footer>
    </div>
  )
}
