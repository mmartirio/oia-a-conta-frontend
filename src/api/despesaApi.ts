import api from './axios'
import type { Despesa, DespesaRequest } from '../types'

export const despesaApi = {
  listar: (dataInicio: string, dataFim: string) =>
    api.get<Despesa[]>('/api/despesas', { params: { dataInicio, dataFim } }),

  criar: (data: DespesaRequest) =>
    api.post<Despesa>('/api/despesas', data),

  excluir: (id: number) =>
    api.delete(`/api/despesas/${id}`),
}
