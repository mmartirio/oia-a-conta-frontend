import api from './axios'
import type { ComissaoInfo, ResumoFinanceiro } from '../types'

export const financeiroApi = {
  getResumo: (dataInicio: string, dataFim: string) =>
    api.get<ResumoFinanceiro>('/api/financeiro/resumo', { params: { dataInicio, dataFim } }),

  getComissoes: (dataInicio: string, dataFim: string) =>
    api.get<ComissaoInfo[]>('/api/financeiro/comissoes', { params: { dataInicio, dataFim } }),
}
