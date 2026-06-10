import api from './axios'
import type { AuthResponse, Usuario } from '../types'

export const authApi = {
  login: (email: string, senha: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, senha }),

  loginGoogle: (email: string, nome: string) =>
    api.post<AuthResponse>('/api/auth/google', { email, nome }),

  registro: (data: {
    restauranteNome: string
    adminNome: string
    email: string
    senha: string
  }) => api.post<AuthResponse>('/api/auth/registro', data),

  me: () =>
    api.get<Usuario>('/api/auth/me')
}
