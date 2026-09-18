import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authApi } from '../api/authApi'
import { billingApi } from '../api/billingApi'
import type { Usuario } from '../types'

type ModalidadeOperacao = 'MESAS' | 'DELIVERY' | null

interface AuthContextValue {
  user: Usuario | null
  loading: boolean
  // restringeModalidade só é true em planos como o Startup — nos demais,
  // modalidadeOperacao fica null e nada é restrito na navegação.
  restringeModalidade: boolean
  modalidadeOperacao: ModalidadeOperacao
  login: (email: string, senha: string) => Promise<Usuario>
  loginGoogle: (credential: string) => Promise<Usuario>
  registro: (data: {
    restauranteNome: string
    adminNome: string
    email: string
    senha: string
    telefone?: string
    planoId?: number
  }) => Promise<Usuario>
  verificarEmail: (email: string, codigo: string) => Promise<Usuario>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [restringeModalidade, setRestringeModalidade] = useState(false)
  const [modalidadeOperacao, setModalidadeOperacao] = useState<ModalidadeOperacao>(null)

  // /api/contratos/meu só existe pra ADMIN/SUPER_ADMIN — nos demais roles
  // (garçom, cozinha) a restrição de navegação por modalidade não se aplica
  // aqui (o bloqueio de verdade é sempre no backend, por endpoint).
  const loadModalidade = useCallback(async (usuario: Usuario | null) => {
    if (!usuario || usuario.role !== 'ADMIN') {
      setRestringeModalidade(false)
      setModalidadeOperacao(null)
      return
    }
    try {
      const { data } = await billingApi.meuContrato()
      setRestringeModalidade(data.plano.exigeModalidadeOperacao)
      setModalidadeOperacao(data.modalidadeOperacao)
    } catch {
      setRestringeModalidade(false)
      setModalidadeOperacao(null)
    }
  }, [])

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await authApi.me()
      setUser(data)
      await loadModalidade(data)
    } catch {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [loadModalidade])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email: string, senha: string): Promise<Usuario> => {
    const { data } = await authApi.login(email, senha)
    localStorage.setItem('token', data.token)
    setUser(data.usuario)
    await loadModalidade(data.usuario)
    return data.usuario
  }

  const loginGoogle = async (credential: string): Promise<Usuario> => {
    const { data } = await authApi.loginGoogle(credential)
    localStorage.setItem('token', data.token)
    setUser(data.usuario)
    await loadModalidade(data.usuario)
    return data.usuario
  }

  const registro = async (formData: {
    restauranteNome: string
    adminNome: string
    email: string
    senha: string
    telefone?: string
    planoId?: number
  }): Promise<Usuario> => {
    const { data } = await authApi.registro(formData)
    localStorage.setItem('token', data.token)
    setUser(data.usuario)
    await loadModalidade(data.usuario)
    return data.usuario
  }

  const verificarEmail = async (email: string, codigo: string): Promise<Usuario> => {
    const { data } = await authApi.verificarEmail(email, codigo)
    localStorage.setItem('token', data.token)
    setUser(data.usuario)
    await loadModalidade(data.usuario)
    return data.usuario
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setRestringeModalidade(false)
    setModalidadeOperacao(null)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, restringeModalidade, modalidadeOperacao,
      login, loginGoogle, registro, verificarEmail, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
