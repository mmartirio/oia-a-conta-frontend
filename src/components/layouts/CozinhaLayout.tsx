import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationAlert } from '../NotificationAlert'
import styles from './CozinhaLayout.module.css'

export function CozinhaLayout() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>👨‍🍳 Cozinha</span>
        <span className={styles.user}>{user?.nome}</span>
        <button onClick={logout} className={styles.logoutBtn}>Sair</button>
      </header>
      <main className={styles.main}>
        <NotificationAlert />
        <Outlet />
      </main>
    </div>
  )
}
