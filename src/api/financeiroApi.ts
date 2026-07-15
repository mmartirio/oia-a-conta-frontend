import api from './axios'
import type { ComissaoInfo, ComparativoFinanceiro, EvolucaoDiaria, ResumoFinanceiro } from '../types'

export const financeiroApi = {
  getResumo: (dataInicio: string, dataFim: string) =>
    api.get<ResumoFinanceiro>('/api/financeiro/resumo', { params: { dataInicio, dataFim } }),

  getComissoes: (dataInicio: string, dataFim: string) =>
    api.get<ComissaoInfo[]>('/api/financeiro/comissoes', { params: { dataInicio, dataFim } }),

  getEvolucao: (dataInicio: string, dataFim: string) =>
    api.get<EvolucaoDiaria[]>('/api/financeiro/evolucao', { params: { dataInicio, dataFim } }),

  getComparativo: (dataInicio: string, dataFim: string) =>
    api.get<ComparativoFinanceiro>('/api/financeiro/comparativo', { params: { dataInicio, dataFim } }),
}
