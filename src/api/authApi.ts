import api from './axios'
import type { AuthResponse, Usuario } from '../types'

export const authApi = {
  login: (email: string, senha: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, senha }),

  loginGoogle: (email: string, nome: string) =>
    api.post<AuthResponse>('/api/auth/google', { email, nome }),

  registroIniciar: (data: {
    restauranteNome: string
    adminNome: string
    email: string
    senha: string
    telefone?: string
    planoId?: number
  }) => api.post<{ mensagem: string }>('/api/auth/registro-iniciar', {
    nomeRestaurante: data.restauranteNome,
    nomeAdmin: data.adminNome,
    email: data.email,
    senha: data.senha,
    telefone: data.telefone,
    planoId: data.planoId,
  }),

  verificarEmail: (email: string, codigo: string) =>
    api.post<AuthResponse>('/api/auth/verificar-email', { email, codigo }),

  reenviarCodigo: (email: string) =>
    api.post<{ mensagem: string }>('/api/auth/reenviar-codigo', { email }),

  registro: (data: {
    restauranteNome: string
    adminNome: string
    email: string
    senha: string
    telefone?: string
    planoId?: number
  }) => api.post<AuthResponse>('/api/auth/registro', {
    nomeRestaurante: data.restauranteNome,
    nomeAdmin: data.adminNome,
    email: data.email,
    senha: data.senha,
    telefone: data.telefone,
    planoId: data.planoId,
  }),

  me: () =>
    api.get<Usuario>('/api/auth/me')
}
