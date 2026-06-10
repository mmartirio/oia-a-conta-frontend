import api from './axios'
import type { Role, Usuario } from '../types'

interface UsuarioPayload {
  nome: string
  email: string
  senha?: string
  role: Role
}

export const usuarioApi = {
  listar: () =>
    api.get<Usuario[]>('/api/auth/usuarios'),

  criar: (data: UsuarioPayload) =>
    api.post<Usuario>('/api/auth/usuarios', data),

  atualizar: (id: number, data: Partial<UsuarioPayload>) =>
    api.put<Usuario>(`/api/auth/usuarios/${id}`, data),

  desativar: (id: number) =>
    api.delete(`/api/auth/usuarios/${id}`)
}
