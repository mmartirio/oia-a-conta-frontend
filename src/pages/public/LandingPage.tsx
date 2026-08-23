import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiClipboard, FiTruck, FiCoffee, FiShoppingCart, FiMessageCircle, FiPieChart,
} from 'react-icons/fi'
import { billingApi, type Plano } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PlanoCard } from '../../components/PlanoCard'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './LandingPage.module.css'

const RECURSOS = [
  { Icon: FiClipboard, titulo: 'Mesas & Comandas', desc: 'Abra comandas, lance pedidos e feche a conta sem papel e sem confusão.' },
  { Icon: FiTruck, titulo: 'Delivery', desc: 'Pedidos do cardápio digital direto na fila de entrega, com rastreio pro entregador.' },
  { Icon: FiCoffee, titulo: 'Cozinha', desc: 'Tela dedicada pra cozinha acompanhar e imprimir os pedidos em tempo real.' },
  { Icon: FiShoppingCart, titulo: 'Caixa (PDV)', desc: 'Venda de balcão, controle de sessão de caixa e conferência de fechamento.' },
  { Icon: FiMessageCircle, titulo: 'WhatsApp', desc: 'Chatbot que recebe pedido, confirma endereço e forma de pagamento sozinho.' },
  { Icon: FiPieChart, titulo: 'Financeiro', desc: 'Faturamento, despesas e comissões num painel só, com gráficos.' },
]

export function LandingPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loadingPlanos, setLoadingPlanos] = useState(true)

  useEffect(() => {
    billingApi.listarPlanos()
      .then(r => setPlanos(r.data.filter(p => p.ativo)))
      .catch(() => setPlanos([]))
      .finally(() => setLoadingPlanos(false))
  }, [])

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
      </section>

      <section id="recursos" className={styles.section}>
        <h2 className={styles.sectionTitle}>Tudo o que o seu restaurante precisa</h2>
        <div className={styles.recursosGrid}>
          {RECURSOS.map(r => (
            <Card key={r.titulo} className={styles.recursoCard}>
              <r.Icon size={48} className={styles.recursoIcon} />
              <h3 className={styles.recursoTitulo}>{r.titulo}</h3>
              <p className={styles.recursoDesc}>{r.desc}</p>
            </Card>
          ))}
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
                  <Link to={`/registro?planoId=${p.id}`}>
                    <Button fullWidth variant={p.destaque ? 'primary' : 'outline'}>
                      Assinar
                    </Button>
                  </Link>
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
        <div className={styles.footerLinks}>
          <Link to="/login">Entrar</Link>
          <Link to="/registro">Criar conta</Link>
        </div>
      </footer>
    </div>
  )
}
