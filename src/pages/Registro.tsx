import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import styles from './Auth.module.css'

export function Registro() {
  const navigate = useNavigate()
  const { registro } = useAuth()
  const [form, setForm] = useState({
    restauranteNome: '',
    adminNome: '',
    email: '',
    senha: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registro(form)
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message
      setError(msg ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🍴</div>
        <h1 className={styles.title}>Novo Restaurante</h1>
        <p className={styles.subtitle}>Crie sua conta para começar</p>

        {error && <div className={styles.alert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Nome do Restaurante"
            id="restauranteNome"
            value={form.restauranteNome}
            onChange={set('restauranteNome')}
            required
            placeholder="Ex: Restaurante do João"
          />
          <Input
            label="Seu Nome"
            id="adminNome"
            value={form.adminNome}
            onChange={set('adminNome')}
            required
            placeholder="Nome completo"
          />
          <Input
            label="E-mail"
            type="email"
            id="email"
            value={form.email}
            onChange={set('email')}
            required
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            id="senha"
            value={form.senha}
            onChange={set('senha')}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
          />
          <Button type="submit" loading={loading} fullWidth size="lg">
            Criar Conta
          </Button>
        </form>

        <p className={styles.footer}>
          Já tem conta?{' '}
          <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
