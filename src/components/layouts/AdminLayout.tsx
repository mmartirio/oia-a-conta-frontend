import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ChefHat, ClipboardList, UtensilsCrossed,
  ShoppingCart, Truck, Headphones, Settings, Users, User,
  BookOpen, LayoutGrid, Wallet, Package,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationAlert } from '../NotificationAlert'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './AdminLayout.module.css'

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
}

const NAV_GESTAO: NavItem[] = [
  { to: '/admin',               label: 'Dashboard',   Icon: LayoutDashboard, end: true },
  { to: '/admin/cardapio',      label: 'Cardápio',    Icon: BookOpen },
  { to: '/admin/mesas',         label: 'Mesas',       Icon: LayoutGrid },
  { to: '/admin/usuarios',      label: 'Usuários',    Icon: Users },
  { to: '/admin/financeiro',    label: 'Financeiro',  Icon: Wallet },
  { to: '/admin/whatsapp',      label: 'WhatsApp',    Icon: WhatsAppIcon },
]

const NAV_SOLO: NavItem[] = [
  { to: '/admin',               label: 'Dashboard',   Icon: LayoutDashboard, end: true },
  { to: '/cozinha',             label: 'Cozinha',     Icon: ChefHat },
  { to: '/garcon/comandas',     label: 'Comanda',     Icon: ClipboardList },
  { to: '/garcon',              label: 'Garçom',      Icon: UtensilsCrossed },
  { to: '/delivery',            label: 'Delivery',    Icon: Package },
  { to: '/pdv',                 label: 'Caixa (PDV)', Icon: ShoppingCart },
  { to: '/entregador',          label: 'Entregador',  Icon: Truck },
  { to: '/admin/whatsapp',      label: 'WhatsApp',    Icon: WhatsAppIcon },
]

const NAV_BOTTOM: NavItem[] = [
  { to: '/admin/suporte',       label: 'Suporte',      Icon: Headphones },
  { to: '/admin/configuracoes', label: 'Configurações', Icon: Settings },
]

function useSoloMode() {
  const [solo, setSolo] = useState(() => localStorage.getItem('soloMode') === 'true')
  const navigate = useNavigate()

  const toggle = () => {
    setSolo(prev => {
      const next = !prev
      localStorage.setItem('soloMode', String(next))
      navigate(next ? '/cozinha' : '/admin', { replace: true })
      return next
    })
  }

  return { solo, toggle }
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { solo, toggle } = useSoloMode()

  const navItems = solo ? NAV_SOLO : NAV_GESTAO

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="Oia a Conta" className={styles.brandLogo} />
        </div>

        <button
          className={`${styles.soloToggle} ${solo ? styles.soloOn : ''}`}
          onClick={toggle}
          title={solo ? 'Sair do Modo Solo' : 'Entrar no Modo Solo'}
        >
          {solo ? <User size={15} /> : <Users size={15} />}
          <span className={styles.soloLabel}>{solo ? 'Modo Solo' : 'Gestão'}</span>
          <span className={styles.soloSwitch}>{solo ? 'ON' : 'OFF'}</span>
        </button>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <item.Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <div className={styles.navDivider} />
          {NAV_BOTTOM.map(item => (
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
          <p className={styles.userRole}>{solo ? 'Modo Solo ativo' : 'Administrador'}</p>
          <button className={styles.logoutBtn} onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className={styles.main}>
        <NotificationAlert />
        <Outlet />
      </main>
    </div>
  )
}
