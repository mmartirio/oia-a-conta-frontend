import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  FiGrid, FiCoffee, FiClipboard, FiHexagon, FiPackage,
  FiShoppingCart, FiShoppingBag, FiHeadphones, FiSettings, FiUsers, FiUser,
  FiBookOpen, FiLayout, FiDollarSign, FiMenu, FiX, FiArchive, FiTag,
} from 'react-icons/fi'
import { MdDeliveryDining } from 'react-icons/md'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { NotificationAlert } from '../NotificationAlert'
import { PedidoPendenteAlerta } from '../PedidoPendenteAlerta'
import { pausaApi, type PausaStatus } from '../../api/pausaApi'
import { PERMISSAO_CONTAINERS } from '../../constants/permissoes'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './AdminLayout.module.css'

const INTERVALO_ATUALIZACAO_STATUS_MS = 60_000

function WhatsAppIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M16 2C8.268 2 2 8.268 2 16c0 2.417.636 4.683 1.748 6.648L2 30l7.573-1.716A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2z" fill="#25D366"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M22.003 19.318c-.32-.16-1.893-.934-2.186-1.04-.293-.107-.506-.16-.72.16-.213.32-.827 1.04-.934 1.254-.107.213-.213.24-.533.08-.32-.16-1.35-.498-2.571-1.587-.95-.848-1.59-1.896-1.777-2.216-.187-.32-.02-.493.14-.652.145-.143.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.734-.987-2.374-.26-.627-.523-.54-.72-.55l-.613-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.094-1.12 2.668 0 1.574 1.147 3.094 1.307 3.307.16.213 2.256 3.44 5.467 4.827.764.33 1.36.527 1.824.674.766.244 1.464.21 2.015.127.615-.092 1.893-.774 2.16-1.521.267-.747.267-1.387.187-1.521-.08-.133-.293-.213-.613-.373z" fill="white"/>
    </svg>
  )
}

interface NavItem {
  to: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ElementType<any>
  end?: boolean
  permission: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin',               label: 'Dashboard',   Icon: FiGrid, end: true, permission: 'DASHBOARD' },
  { to: '/pdv',                 label: 'Caixa (PDV)', Icon: FiShoppingCart, permission: 'CAIXA_PDV' },
  { to: '/admin/cardapio',      label: 'Cardápio',    Icon: FiBookOpen, permission: 'CARDAPIO' },
  { to: '/admin/mesas',         label: 'Mesas',       Icon: FiLayout, permission: 'MESAS' },
  { to: '/cozinha',             label: 'Cozinha',     Icon: FiCoffee, permission: 'COZINHA' },
  { to: '/garcon/comandas',     label: 'Comanda',     Icon: FiClipboard, permission: 'COMANDA' },
  { to: '/garcon',              label: 'Garçom',      Icon: FiHexagon, permission: 'GARCOM' },
  { to: '/delivery',            label: 'Delivery',    Icon: FiPackage, permission: 'DELIVERY' },
  { to: '/entregador',          label: 'Entregador',  Icon: MdDeliveryDining, permission: 'ENTREGADOR' },
  { to: '/admin/usuarios',      label: 'Usuários',    Icon: FiUsers, permission: 'USUARIOS' },
  { to: '/admin/clientes',      label: 'Clientes',    Icon: FiUser, permission: 'CLIENTES' },
  { to: '/admin/estoque',       label: 'Estoque',     Icon: FiArchive, permission: 'ESTOQUE' },
  { to: '/admin/marketing',     label: 'Marketing',   Icon: FiTag, permission: 'MARKETING' },
  { to: '/admin/financeiro',    label: 'Financeiro',  Icon: FiDollarSign, permission: 'FINANCEIRO' },
  { to: '/admin/whatsapp',      label: 'WhatsApp',    Icon: WhatsAppIcon, permission: 'WHATSAPP_CONEXAO' },
  { to: '/admin/ifood',         label: 'iFood',       Icon: FiShoppingBag, permission: 'IFOOD_CONEXAO' },
]

const NAV_BOTTOM: NavItem[] = [
  { to: '/admin/suporte',       label: 'Suporte',      Icon: FiHeadphones, permission: 'SUPORTE' },
  { to: '/admin/configuracoes', label: 'Configurações', Icon: FiSettings, permission: 'CONFIG_STATUS_LOJA' },
]

// WhatsApp e Configurações têm várias sub-permissões (uma por tab/item) — o
// item do sidebar aparece se o usuário tiver QUALQUER uma delas, não uma
// permissão única fixa.
const FILHOS_WHATSAPP = PERMISSAO_CONTAINERS.find(c => c.chave === 'WHATSAPP')?.filhos?.map(f => f.chave) ?? []
const FILHOS_CONFIG = PERMISSAO_CONTAINERS.find(c => c.chave === 'CONFIGURACOES')?.filhos?.map(f => f.chave) ?? []

function temAcessoNavItem(permissoes: string[] | null | undefined, item: NavItem, entregadorExterno: boolean): boolean {
  // Restaurante com entregador externo (99/Uber Entrega) não usa o painel
  // interno de entregador — o pedido é concluído direto pela tela de Delivery.
  if (item.to === '/entregador' && entregadorExterno) return false
  if (!permissoes) return true
  if (item.to === '/admin/whatsapp') return FILHOS_WHATSAPP.some(p => permissoes.includes(p))
  if (item.to === '/admin/configuracoes') return FILHOS_CONFIG.some(p => permissoes.includes(p))
  return permissoes.includes(item.permission)
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { conversasWhatsappNaoLidas } = useNotification()
  const [statusLoja, setStatusLoja] = useState<PausaStatus | null>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const restauranteId = user?.restauranteId
    if (!restauranteId) return

    const carregarStatus = () => {
      pausaApi.status(restauranteId).then(r => setStatusLoja(r.data)).catch(() => {})
    }
    carregarStatus()
    const interval = setInterval(carregarStatus, INTERVALO_ATUALIZACAO_STATUS_MS)
    return () => clearInterval(interval)
  }, [user?.restauranteId])

  // Fecha o menu mobile automaticamente ao navegar para outra rota
  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  return (
    <div className={styles.layout}>
      <header className={styles.mobileTopBar}>
        <button
          className={styles.hamburgerBtn}
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
        >
          <FiMenu size={22} />
        </button>
        <span className={styles.mobileTopBarSpacer} />
      </header>

      {menuAberto && (
        <div className={styles.overlay} onClick={() => setMenuAberto(false)} />
      )}

      <aside className={`${styles.sidebar} ${menuAberto ? styles.sidebarOpen : ''}`}>
        <button
          className={styles.closeBtn}
          onClick={() => setMenuAberto(false)}
          aria-label="Fechar menu"
        >
          <FiX size={22} />
        </button>

        <div className={styles.brand}>
          <img src={logo} alt="Oia a Conta" className={styles.brandLogo} />
          <div className={styles.brandText}>
            <p className={styles.brandSubtitle}>Gestão simples</p>
          </div>
          {statusLoja && (
            <div
              className={`${styles.statusLoja} ${statusLoja.aberto ? styles.statusAberta : styles.statusFechada}`}
              title={statusLoja.motivo}
            >
              <span className={styles.statusDot} />
              <span>{statusLoja.aberto ? 'Loja aberta' : 'Loja fechada'}</span>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.filter(item => temAcessoNavItem(user?.permissoes, item, !!statusLoja?.entregadorExterno)).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIconWrap}>
                <item.Icon size={17} />
                {item.to === '/admin/whatsapp' && conversasWhatsappNaoLidas > 0 && (
                  <span className={styles.navBadge}>
                    {conversasWhatsappNaoLidas > 99 ? '99+' : conversasWhatsappNaoLidas}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <div className={styles.navDivider} />
          {NAV_BOTTOM.filter(item => temAcessoNavItem(user?.permissoes, item, !!statusLoja?.entregadorExterno)).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <item.Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.userSection}>
          <p className={styles.userName}>{user?.nome}</p>
          <p className={styles.userRole}>Administrador</p>
          <button className={styles.logoutBtn} onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className={styles.main}>
        <NotificationAlert />
        <PedidoPendenteAlerta />
        <Outlet />
      </main>
    </div>
  )
}
