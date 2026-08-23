import api from './axios'
import type { Entrega, EntregaRequest, FreteCalculado, Page, RotaSugerida } from '../types'

export const entregaApi = {
  criar: (data: EntregaRequest) =>
    api.post<Entrega>('/api/entregas', data),

  // Paginação real — a tela consome Page<Entrega> (content/totalElements/totalPages)
  // e renderiza os controles de <Pagination>.
  listar: (page = 0) =>
    api.get<Page<Entrega>>('/api/entregas', { params: { page } }),

  listarAguardando: (page = 0) =>
    api.get<Page<Entrega>>('/api/entregas/aguardando', { params: { page } }),

  listarConfirmadas: (page = 0) =>
    api.get<Page<Entrega>>('/api/entregas/confirmadas', { params: { page } }),

  confirmar: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/confirmar`),

  rejeitar: (id: number, motivo: string) =>
    api.put<Entrega>(`/api/entregas/${id}/rejeitar`, { motivo }),

  atribuirEntregador: (id: number) =>
    api.put<Entrega>(`/api/entregas/${id}/atribuir-entregador`),

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

  listarPendentesPagamento: (page = 0) =>
    api.get<Page<Entrega>>('/api/entregas/pendentes-pagamento', { params: { page } }),

  listarEmRota: () =>
    api.get<Entrega[]>('/api/entregas/em-rota'),

  atualizarLocalizacao: (id: number, latitude: number, longitude: number) =>
    api.put<void>(`/api/entregas/${id}/localizacao`, { latitude, longitude }),

  previsaoFrete: (enderecoLatitude: number, enderecoLongitude: number) =>
    api.post<FreteCalculado>('/api/entregas/frete-preview', { enderecoLatitude, enderecoLongitude }),

  minhaRota: (lat: number, lng: number) =>
    api.get<RotaSugerida>('/api/entregas/minha-rota', { params: { lat, lng } }),
}
