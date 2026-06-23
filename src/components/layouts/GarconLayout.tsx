import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationAlert } from '../NotificationAlert'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './GarconLayout.module.css'

export function GarconLayout() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brand}><img src={logo} alt="Oia a Conta" className={styles.brandLogo} /></div>
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
