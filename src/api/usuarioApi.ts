import api from './axios'
import type { Role, Usuario } from '../types'

interface UsuarioPayload {
  nome: string
  email: string
  senha?: string
  role: Role
  grupoId?: number | null
}

export const usuarioApi = {
  listar: () =>
    api.get<Usuario[]>('/api/usuarios'),

  criar: (data: UsuarioPayload) =>
    api.post<Usuario>('/api/usuarios', data),

  atualizar: (id: number, data: Partial<UsuarioPayload>) =>
    api.put<Usuario>(`/api/usuarios/${id}`, data),

  desativar: (id: number) =>
    api.delete(`/api/usuarios/${id}`)
}
