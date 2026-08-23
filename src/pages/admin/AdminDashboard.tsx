import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiBookOpen, FiLayout, FiMessageCircle, FiUsers, FiLink, FiPackage } from 'react-icons/fi'
import { mesaApi } from '../../api/mesaApi'
import { comandaApi } from '../../api/comandaApi'
import { pedidoApi } from '../../api/pedidoApi'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EntregaMapa } from '../../components/EntregaMapa'
import { formatCurrency, STATUS_MESA_LABEL } from '../../utils/formatters'
import type { Mesa, Comanda } from '../../types'
import styles from './AdminDashboard.module.css'

export function AdminDashboard() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [resumoPedidos, setResumoPedidos] = useState({ total: 0, emProducao: 0, cancelados: 0, entregues: 0, totalCaixa: 0, ticketMedio: 0 })

  useEffect(() => {
    mesaApi.listar().then(r => setMesas(r.data)).catch(() => {})
    comandaApi.listarAbertas().then(r => setComandas(r.data)).catch(() => {})
    pedidoApi.resumoDia().then(r => setResumoPedidos(r.data)).catch(() => {})
  }, [])

  const mesasOcupadas = mesas.filter(m => m.status === 'OCUPADA').length
  const totalAberto = comandas.reduce((acc, c) => acc + c.total, 0)

  const quickActions = [
    { to: '/admin/cardapio', label: 'Cardápio', description: 'Atualize itens e preços', icon: FiBookOpen },
    { to: '/admin/mesas', label: 'Mesas', description: 'Gerencie ocupação e disponibilidade', icon: FiLayout },
    { to: '/admin/usuarios', label: 'Usuários', description: 'Controle acessos e perfis', icon: FiUsers },
    { to: '/admin/whatsapp', label: 'WhatsApp', description: 'Ative mensagens automáticas', icon: FiMessageCircle },
    { to: '/delivery', label: 'Delivery', description: 'Acompanhe pedidos de entrega', icon: FiPackage },
    { to: '/admin/configuracoes?aba=cardapio-publico', label: 'Link do Cardápio', description: 'Compartilhe o link ou QR code com os clientes', icon: FiLink },
  ]

  return (
    <div className={styles.page}>
      <div>
        <p className={styles.heroEyebrow}>Resumo diário</p>
        <h1 className={styles.pageTitle}>Bem-vindo ao painel</h1>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroEsquerda}>

          <div className={styles.quickActions}>
            {quickActions.map(({ to, label, description, icon: Icon }) => (
              <Link key={to} to={to} className={styles.quickAction}>
                <div className={styles.quickActionIcon}><Icon size={18} /></div>
                <div>
                  <div className={styles.quickActionLabel}>{label}</div>
                  <div className={styles.quickActionDescription}>{description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.heroMapa}>
          <h2 className={styles.heroMapaTitle}>Rastreamento de Entregas</h2>
          <EntregaMapa />
        </div>
      </div>
      <div className={styles.statsGrid}>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Total de Mesas</p>
          <p className={styles.statValue}>{mesas.length}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Mesas Ocupadas</p>
          <p className={`${styles.statValue} ${styles.statOcupado}`}>{mesasOcupadas}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Comandas Abertas</p>
          <p className={styles.statValue}>{comandas.length}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Total em Aberto</p>
          <p className={`${styles.statValue} ${styles.statMoney}`}>{formatCurrency(totalAberto)}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Total de Pedidos (hoje)</p>
          <p className={styles.statValue}>{resumoPedidos.total}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Em Produção</p>
          <p className={`${styles.statValue} ${styles.statWarning}`}>{resumoPedidos.emProducao}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Cancelados</p>
          <p className={`${styles.statValue} ${styles.statOcupado}`}>{resumoPedidos.cancelados}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Entregues</p>
          <p className={`${styles.statValue} ${styles.statMoney}`}>{resumoPedidos.entregues}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Total em Caixa</p>
          <p className={`${styles.statValue} ${styles.statMoney}`}>{formatCurrency(resumoPedidos.totalCaixa)}</p>
        </Card>
        <Card padding="sm" className={styles.statCard}>
          <p className={styles.statLabel}>Ticket Médio</p>
          <p className={styles.statValue}>{formatCurrency(resumoPedidos.ticketMedio)}</p>
        </Card>
      </div>

      <h2 className={styles.sectionTitle}>Status das Mesas</h2>
      {mesas.length === 0 ? (
        <div className={styles.emptyState}>
          Ainda não há mesas cadastradas. Configure o layout do restaurante para começar a organizar o atendimento.
          <Link to="/admin/mesas" className={styles.emptyLink}>Ir para Mesas</Link>
        </div>
      ) : (
        <div className={styles.mesasGrid}>
          {mesas.map(m => (
            <Card key={m.id} className={styles.mesaCard}>
              <div className={styles.mesaNum}>Mesa {m.numero}</div>
              <Badge
                variant={
                  m.status === 'DISPONIVEL' ? 'success' :
                  m.status === 'OCUPADA' ? 'danger' : 'warning'
                }
                size="sm"
              >
                {STATUS_MESA_LABEL[m.status]}
              </Badge>
              <div className={styles.mesaCap}>{m.capacidade} lugares</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
