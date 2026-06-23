import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationAlert } from '../NotificationAlert'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './PdvLayout.module.css'

export function PdvLayout() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src={logo} alt="Oia a Conta" className={styles.brandLogo} />
        </div>
        <nav className={styles.nav}>
          <NavLink to="/pdv" end className={({ isActive }) => isActive ? styles.active : ''}>
            Salão
          </NavLink>
          <NavLink to="/pdv/delivery" className={({ isActive }) => isActive ? styles.active : ''}>
            Delivery
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
