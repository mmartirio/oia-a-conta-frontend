import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationAlert } from '../NotificationAlert'
import { PedidoPendenteAlerta } from '../PedidoPendenteAlerta'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './CozinhaLayout.module.css'

export function CozinhaLayout() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <img src={logo} alt="Oia a Conta" className={styles.brand} />
        <span className={styles.user}>{user?.nome}</span>
        <button onClick={logout} className={styles.logoutBtn}>Sair</button>
      </header>
      <main className={styles.main}>
        <NotificationAlert />
        <PedidoPendenteAlerta />
        <Outlet />
      </main>
    </div>
  )
}
