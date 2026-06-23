import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Layers, Building2, CreditCard, LifeBuoy, TrendingUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './SuperAdminLayout.module.css'

interface NavItem {
  to: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ElementType<any>
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/super-admin',             label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/super-admin/planos',      label: 'Planos',    Icon: Layers },
  { to: '/super-admin/empresas',    label: 'Empresas',  Icon: Building2 },
  { to: '/super-admin/pagamentos',  label: 'Pagamentos',Icon: CreditCard },
  { to: '/super-admin/tickets',     label: 'Suporte',   Icon: LifeBuoy },
  { to: '/super-admin/financeiro',  label: 'Financeiro',Icon: TrendingUp },
]

export function SuperAdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="Oia a Conta" className={styles.brandLogo} />
          <span className={styles.adminBadge}>Super Admin</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={() => { navigate('/admin') }} className={styles.switchBtn}>
            Painel Empresa
          </button>
          <button onClick={() => { logout(); navigate('/login') }} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
