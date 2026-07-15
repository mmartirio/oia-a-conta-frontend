import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FiGrid, FiLayers, FiHome, FiCreditCard, FiTrendingUp, FiDollarSign, FiHelpCircle, FiPieChart } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './GestorLayout.module.css'

interface NavItem {
  to: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ElementType<any>
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/gestor',            label: 'Dashboard',  Icon: FiGrid, end: true },
  { to: '/gestor/planos',     label: 'Planos',     Icon: FiLayers },
  { to: '/gestor/empresas',   label: 'Empresas',   Icon: FiHome },
  { to: '/gestor/cobrancas',  label: 'Cobranças',  Icon: FiCreditCard },
  { to: '/gestor/pagamentos', label: 'Pagamentos', Icon: FiDollarSign },
  { to: '/gestor/tickets',    label: 'Suporte',    Icon: FiHelpCircle },
  { to: '/gestor/financeiro', label: 'Financeiro', Icon: FiPieChart },
  { to: '/gestor/relatorios', label: 'Relatórios', Icon: FiTrendingUp },
]

export function GestorLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="Oia a Conta" className={styles.brandLogo} />
          <span className={styles.badge}>Gestor</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
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
