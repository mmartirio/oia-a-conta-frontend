import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../assets/logo/OIA A CONTA - LOGO.png'
import styles from './EntregadorLayout.module.css'

export function EntregadorLayout() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <img src={logo} alt="Oia a Conta" className={styles.brandLogo} />
        <span className={styles.user}>{user?.nome}</span>
        <button onClick={logout} className={styles.logoutBtn}>Sair</button>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
