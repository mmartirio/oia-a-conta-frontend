import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authApi } from '../api/authApi'
import type { Usuario } from '../types'

interface AuthContextValue {
  user: Usuario | null
  loading: boolean
  login: (email: string, senha: string) => Promise<Usuario>
  loginGoogle: (email: string, nome: string) => Promise<Usuario>
  registro: (data: {
    restauranteNome: string
    adminNome: string
    email: string
    senha: string
  }) => Promise<Usuario>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await authApi.me()
      setUser(data)
    } catch {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email: string, senha: string): Promise<Usuario> => {
    const { data } = await authApi.login(email, senha)
    localStorage.setItem('token', data.token)
    setUser(data.usuario)
    return data.usuario
  }

  const loginGoogle = async (email: string, nome: string): Promise<Usuario> => {
    const { data } = await authApi.loginGoogle(email, nome)
    localStorage.setItem('token', data.token)
    setUser(data.usuario)
    return data.usuario
  }

  const registro = async (formData: {
    restauranteNome: string
    adminNome: string
    email: string
    senha: string
  }): Promise<Usuario> => {
    const { data } = await authApi.registro(formData)
    localStorage.setItem('token', data.token)
    setUser(data.usuario)
    return data.usuario
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginGoogle, registro, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
