import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationAlert } from '../NotificationAlert'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/mesas', label: 'Mesas', icon: '🍽️' },
  { to: '/admin/cardapio', label: 'Cardápio', icon: '📋' },
  { to: '/admin/usuarios', label: 'Usuários', icon: '👥' }
]

export function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🍴</span>
          <span className={styles.brandName}>Comanda</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span>{item.icon}</span>
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
        <Outlet />
      </main>
    </div>
  )
}
