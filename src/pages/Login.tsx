import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { primeiraRotaPermitida } from '../constants/permissoes'
import type { Role, Usuario } from '../types'
import styles from './Auth.module.css'
import logo from '../assets/logo/OIA A CONTA - LOGO.png'

interface GooglePayload { email: string; name: string }

function redirectByRole(usuario: Usuario, navigate: ReturnType<typeof useNavigate>) {
  // ADMIN com grupo restrito pode não ter acesso ao Dashboard (rota padrão)
  // — manda pra primeira rota do sidebar que o grupo permite. SUPER_ADMIN
  // não usa esse sidebar (vai pro console /gestor), fica de fora.
  if (usuario.role === 'ADMIN') {
    navigate(primeiraRotaPermitida(usuario.permissoes), { replace: true })
    return
  }
  const routes: Record<Role, string> = {
    SUPER_ADMIN: '/gestor',
    ADMIN: '/admin',
    GARCON: '/garcon',
    COZINHA: '/cozinha'
  }
  navigate(routes[usuario.role] ?? '/garcon', { replace: true })
}

export function Login() {
  const navigate = useNavigate()
  const { login, loginGoogle, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user) redirectByRole(user, navigate)
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, senha)
      redirectByRole(user, navigate)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message
      setError(msg ?? 'E-mail ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return
    try {
      const { email: gEmail, name } = jwtDecode<GooglePayload>(credentialResponse.credential)
      const user = await loginGoogle(gEmail, name)
      redirectByRole(user, navigate)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message
      setError(msg ?? 'Falha ao entrar com Google')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><img src={logo} alt="Oia a Conta" /></div>
        <p className={styles.subtitle}>Entre para organizar mesas, pedidos e vendas com mais calma.</p>

        <div className={styles.helperBox}>
          <p className={styles.helperTitle}>O que você encontra aqui</p>
          <ul className={styles.featureList}>
            <li>Mesas, comandas e pedidos em um só lugar</li>
            <li>Fluxo de delivery, caixa e entregas</li>
            <li>Atalhos para WhatsApp, financeiro e configuração</li>
          </ul>
        </div>

        {error && <div className={styles.alert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="E-mail"
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            id="senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" loading={loading} fullWidth size="lg">
            Entrar
          </Button>
        </form>

        <div className={styles.divider}><span>ou</span></div>

        <div className={styles.googleWrapper}>
          <GoogleLogin
            onSuccess={handleGoogle}
            onError={() => setError('Falha ao entrar com Google')}
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <p className={styles.footer}>
          Novo restaurante?{' '}
          <Link to="/registro">Criar conta</Link>
        </p>
      </div>
    </div>
  )
}
