import api from './axios'
import type { Comanda, MetodoPagamento } from '../types'

export const comandaApi = {
  abrir: (mesaId: number) =>
    api.post<Comanda>(`/api/mesas/${mesaId}/comanda`),

  buscarAtiva: (mesaId: number) =>
    api.get<Comanda>(`/api/mesas/${mesaId}/comanda`),

  buscarPorId: (id: number) =>
    api.get<Comanda>(`/api/comandas/${id}`),

  listarAbertas: () =>
    api.get<Comanda[]>('/api/comandas'),

  fechar: (id: number, metodoPagamento: MetodoPagamento) =>
    api.put<Comanda>(`/api/comandas/${id}/fechar`, { metodoPagamento })
}
