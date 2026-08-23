import api from './axios'
import type { Estoque, MovimentacaoEstoque, Page, TipoMovimentacaoEstoque } from '../types'

export const estoqueApi = {
  listar: () =>
    api.get<Estoque[]>('/api/estoque'),

  alertas: () =>
    api.get<Estoque[]>('/api/estoque/alertas'),

  configurar: (produtoId: number, data: { quantidadeMinima: number; controlado: boolean }) =>
    api.put<Estoque>(`/api/estoque/${produtoId}/config`, data),

  movimentar: (produtoId: number, data: { tipo: TipoMovimentacaoEstoque; quantidade: number; motivo?: string }) =>
    api.post<Estoque>(`/api/estoque/${produtoId}/movimentar`, data),

  listarMovimentacoes: (produtoId: number, page = 0, size = 20) =>
    api.get<Page<MovimentacaoEstoque>>(`/api/estoque/${produtoId}/movimentacoes`, { params: { page, size } })
}
