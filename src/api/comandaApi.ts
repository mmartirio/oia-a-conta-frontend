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
    api.put<Comanda>(`/api/comandas/${id}/fechar`, { metodoPagamento }),

  definirCliente: (id: number, clienteId: number) =>
    api.put<Comanda>(`/api/comandas/${id}/cliente`, null, { params: { clienteId } }),

  aplicarCupom: (id: number, codigo: string) =>
    api.put<Comanda>(`/api/comandas/${id}/desconto`, { tipo: 'CUPOM', codigo }),

  aplicarPromocao: (id: number, promocaoId: number) =>
    api.put<Comanda>(`/api/comandas/${id}/desconto`, { tipo: 'PROMOCAO', promocaoId }),

  removerDesconto: (id: number) =>
    api.delete<Comanda>(`/api/comandas/${id}/desconto`)
}
