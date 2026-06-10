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
    api.put<Pedido>(`/api/pedidos/${id}/entregue`)
}
