import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import logo from '../assets/logo/OIA A CONTA - LOGO.png'
import { DATA_VIGENCIA_DOCUMENTOS, VERSAO_CONTRATO } from '../constants/legal'
import styles from './DocumentoLegal.module.css'

interface DocumentoLegalProps {
  titulo: string
  children: ReactNode
}

// Layout compartilhado pelas páginas públicas de texto longo (Contrato de
// Adesão, Termos de Uso, Política de Privacidade) — sem PrivateRoute,
// acessível sem login, pensado pra leitura (largura de artigo, não o card
// estreito de 400px usado em Login/Registro).
export function DocumentoLegal({ titulo, children }: DocumentoLegalProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/">
          <img src={logo} alt="Oia a Conta" className={styles.logo} />
        </Link>
        <Link to="/" className={styles.voltar}>← Voltar para o site</Link>
      </header>

      <article className={styles.artigo}>
        <h1 className={styles.titulo}>{titulo}</h1>
        {children}
      </article>

      <footer className={styles.rodape}>
        Versão {VERSAO_CONTRATO} · Vigente desde {DATA_VIGENCIA_DOCUMENTOS}
      </footer>
    </div>
  )
}
