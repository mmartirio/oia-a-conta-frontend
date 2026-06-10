import api from './axios'
import type { Mesa, StatusMesa } from '../types'

export const mesaApi = {
  listar: () =>
    api.get<Mesa[]>('/api/mesas'),

  buscar: (id: number) =>
    api.get<Mesa>(`/api/mesas/${id}`),

  criar: (data: { numero: number; capacidade: number }) =>
    api.post<Mesa>('/api/mesas', data),

  atualizar: (id: number, data: { numero: number; capacidade: number }) =>
    api.put<Mesa>(`/api/mesas/${id}`, data),

  atualizarStatus: (id: number, status: StatusMesa) =>
    api.put<Mesa>(`/api/mesas/${id}/status`, { status }),

  excluir: (id: number) =>
    api.delete(`/api/mesas/${id}`)
}
