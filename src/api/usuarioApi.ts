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
    api.delete(`/api/usuarios/${id}`),

  // SUPER_ADMIN (plataforma) — sem restauranteId/grupoId
  listarSuperAdmins: () =>
    api.get<Usuario[]>('/api/usuarios/super-admins'),

  criarSuperAdmin: (data: { nome: string; email: string; senha?: string }) =>
    api.post<Usuario>('/api/usuarios/super-admins', data),

  alternarAtivoSuperAdmin: (id: number, ativo: boolean) =>
    api.put<Usuario>(`/api/usuarios/super-admins/${id}/ativo`, { ativo }),

  atualizarSuperAdmin: (id: number, data: { nome: string; email: string; senha?: string }) =>
    api.put<Usuario>(`/api/usuarios/super-admins/${id}`, data),

  excluirSuperAdmin: (id: number) =>
    api.delete<void>(`/api/usuarios/super-admins/${id}`),
}
