import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  FiGrid, FiLayers, FiHome, FiDollarSign, FiHelpCircle, FiMenu, FiX, FiFileText, FiShare2, FiUserCheck,
} from 'react-icons/fi'
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

// Menu agrupado por área — antes eram 12 itens soltos (Cobranças,
// Pagamentos, Financeiro e Relatórios eram quatro telas sobre o mesmo
// assunto; Suporte e WhatsApp de Suporte, duas).
const GRUPOS: { titulo: string; itens: NavItem[] }[] = [
  { titulo: 'Visão geral', itens: [
    { to: '/gestor', label: 'Painel', Icon: FiGrid, end: true },
  ] },
  { titulo: 'Clientes', itens: [
    { to: '/gestor/empresas', label: 'Empresas', Icon: FiHome },
    { to: '/gestor/planos', label: 'Planos', Icon: FiLayers },
  ] },
  { titulo: 'Financeiro', itens: [
    { to: '/gestor/financeiro', label: 'Financeiro', Icon: FiDollarSign },
  ] },
  { titulo: 'Atendimento', itens: [
    { to: '/gestor/suporte', label: 'Suporte', Icon: FiHelpCircle },
  ] },
  { titulo: 'Configurações', itens: [
    { to: '/gestor/admins', label: 'Administradores', Icon: FiUserCheck },
    { to: '/gestor/social', label: 'Redes sociais', Icon: FiShare2 },
    { to: '/gestor/logs', label: 'Logs de auditoria', Icon: FiFileText },
  ] },
]

export function GestorLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  return (
    <div className={styles.layout}>
      <header className={styles.mobileTopBar}>
        <button className={styles.hamburgerBtn} onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
          <FiMenu size={22} />
        </button>
        <img src={logo} alt="Oia a Conta" className={styles.mobileTopBarLogo} />
        <span className={styles.mobileTopBarSpacer} />
      </header>

      {menuAberto && <div className={styles.overlay} onClick={() => setMenuAberto(false)} />}

      <aside className={`${styles.sidebar} ${menuAberto ? styles.sidebarOpen : ''}`}>
        <button className={styles.closeBtn} onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
          <FiX size={22} />
        </button>

        <div className={styles.brand}>
          <img src={logo} alt="Oia a Conta" className={styles.brandLogo} />
          <span className={styles.badge}>Gestor</span>
        </div>

        <nav className={styles.nav}>
          {GRUPOS.map(g => (
            <div key={g.titulo} className={styles.grupo}>
              <div className={styles.grupoTitulo}>{g.titulo}</div>
              {g.itens.map(({ to, label, Icon, end }) => (
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
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          {user && <div className={styles.usuario} title={user.email}>{user.nome}</div>}
          <button onClick={() => { logout(); navigate('/login') }} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.conteudo}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
