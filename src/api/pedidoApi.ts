import api from './axios'
import type { Pedido, PedidoRequest } from '../types'

export const pedidoApi = {
  enviar: (comandaId: number, data: PedidoRequest) =>
    api.post<Pedido>(`/api/comandas/${comandaId}/pedidos`, data),

  listarAtivos: () =>
    api.get<Pedido[]>('/api/pedidos/ativos'),

  marcarPreparando: (id: number) =>
    api.put<Pedido>(`/api/pedidos/${id}/preparando`),

  marcarPronto: (id: number) =>
    api.put<Pedido>(`/api/pedidos/${id}/pronto`),

  marcarEntregue: (id: number) =>
    api.put<Pedido>(`/api/pedidos/${id}/entregue`),

  cancelar: (id: number) =>
    api.put<Pedido>(`/api/pedidos/${id}/cancelar`),

  resumoDia: () =>
    api.get<{
      total: number
      emProducao: number
      cancelados: number
      entregues: number
      totalCaixa: number
      ticketMedio: number
    }>('/api/pedidos/resumo-dia')
}
