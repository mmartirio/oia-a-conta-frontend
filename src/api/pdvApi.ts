import api from './axios'
import type { Comanda, Entrega, RestauranteConfig } from '../types'

export const pdvApi = {
  listarAguardandoPagamento: () =>
    api.get<Comanda[]>('/api/comandas/aguardando-pagamento'),

  confirmarPagamentoComanda: (id: number, data: { metodoPagamento: string; parcelas?: number }) =>
    api.put<Comanda>(`/api/comandas/${id}/confirmar-pagamento`, data),

  listarEntregasPendentes: () =>
    api.get<Entrega[]>('/api/entregas/pendentes-pagamento'),

  confirmarPagamentoEntrega: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/confirmar-pagamento`),

  getConfig: () =>
    api.get<RestauranteConfig>('/api/configuracoes'),
}
