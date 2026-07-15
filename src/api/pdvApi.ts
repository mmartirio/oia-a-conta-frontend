import api from './axios'
import type { Comanda, Entrega, MetodoPagamento, Page, RestauranteConfig } from '../types'

export const pdvApi = {
  listarAguardandoPagamento: () =>
    api.get<Comanda[]>('/api/comandas/aguardando-pagamento'),

  confirmarPagamentoComanda: (id: number, data: { metodoPagamento: string; parcelas?: number }) =>
    api.put<Comanda>(`/api/comandas/${id}/confirmar-pagamento`, data),

  // Paginação real — ver components/ui/Pagination.
  listarEntregasPendentes: (page = 0) =>
    api.get<Page<Entrega>>('/api/entregas/pendentes-pagamento', { params: { page } }),

  confirmarPagamentoEntrega: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/confirmar-pagamento`),

  getConfig: () =>
    api.get<RestauranteConfig>('/api/configuracoes'),

  criarVenda: (data: {
    itens: { produtoId: number; produtoNome: string; quantidade: number; precoUnitario: number; observacao?: string }[]
    metodoPagamento: MetodoPagamento
    parcelas?: number
    observacao?: string
  }) =>
    api.post<Comanda>('/api/pdv/vendas', data),
}
