import api from './axios'
import type { Entrega, EntregaRequest } from '../types'

export const entregaApi = {
  criar: (data: EntregaRequest) =>
    api.post<Entrega>('/api/entregas', data),

  listar: () =>
    api.get<Entrega[]>('/api/entregas'),

  listarAguardando: () =>
    api.get<Entrega[]>('/api/entregas/aguardando'),

  aceitar: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/aceitar`),

  saiu: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/saiu`),

  entregar: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/entregue`),

  prontoParaEntrega: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/pronto`),

  cancelar: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/cancelar`),

  confirmarPagamento: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/confirmar-pagamento`),

  listarPendentesPagamento: () =>
    api.get<Entrega[]>('/api/entregas/pendentes-pagamento'),
}
