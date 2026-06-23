import api from './axios'

export interface UsuarioAdmin {
  id: number
  nome: string
  email: string
  role: string
  ativo: boolean
  restauranteId: number | null
  createdAt: string
}

export const gestorApi = {
  listarAdmins: () => api.get<UsuarioAdmin[]>('/api/usuarios/admins'),
  listarUsuariosPorRestaurante: (restauranteId: number) =>
    api.get<UsuarioAdmin[]>(`/api/usuarios/restaurante/${restauranteId}`),
  resetSenha: (userId: number) =>
    api.post<{ mensagem: string; novaSenha: string }>(`/api/usuarios/${userId}/reset-senha`, {}),
}
