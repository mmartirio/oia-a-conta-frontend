import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Role } from '../types'
import styles from './Auth.module.css'

interface GooglePayload { email: string; name: string }

function redirectByRole(role: Role, navigate: ReturnType<typeof useNavigate>) {
  const routes: Record<Role, string> = {
    SUPER_ADMIN: '/admin',
    ADMIN: '/admin',
    GARCON: '/garcon',
    COZINHA: '/cozinha'
  }
  navigate(routes[role] ?? '/garcon', { replace: true })
}

export function Login() {
  const navigate = useNavigate()
  const { login, loginGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, senha)
      redirectByRole(user.role, navigate)
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
      redirectByRole(user.role, navigate)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message
      setError(msg ?? 'Falha ao entrar com Google')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🍴</div>
        <h1 className={styles.title}>Comanda Digital</h1>
        <p className={styles.subtitle}>Faça login para continuar</p>

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
