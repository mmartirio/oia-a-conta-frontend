import api from './axios'
import type { Grupo } from '../types'

export interface GrupoRequest {
  nome: string
  permissoes: string[]
}

export const grupoApi = {
  listar: () =>
    api.get<Grupo[]>('/api/grupos'),

  criar: (data: GrupoRequest) =>
    api.post<Grupo>('/api/grupos', data),

  atualizar: (id: number, data: GrupoRequest) =>
    api.put<Grupo>(`/api/grupos/${id}`, data),

  excluir: (id: number) =>
    api.delete<{ usuariosDesatribuidos: number }>(`/api/grupos/${id}`),
}
