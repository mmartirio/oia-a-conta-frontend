import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationAlert } from '../NotificationAlert'
import styles from './GarconLayout.module.css'

export function GarconLayout() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brand}>🍴 Comanda Digital</div>
        <nav className={styles.nav}>
          <NavLink to="/garcon" end className={({ isActive }) => isActive ? styles.active : ''}>
            Mesas
          </NavLink>
          <NavLink to="/garcon/comandas" className={({ isActive }) => isActive ? styles.active : ''}>
            Comandas
          </NavLink>
        </nav>
        <div className={styles.user}>
          <span>{user?.nome}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </header>
      <main className={styles.main}>
        <NotificationAlert />
        <Outlet />
      </main>
    </div>
  )
}
