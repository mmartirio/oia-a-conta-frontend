import api from './axios'
import type { ResumoFinanceiro } from '../types'

export type StatusSessaoCaixa = 'ABERTO' | 'FECHADO'

export interface SessaoCaixa {
  id: number
  abertoPorNome: string
  valorAbertura: number
  abertoEm: string
  fechadoPorNome?: string | null
  valorFechamento?: number | null
  valorEsperadoDinheiro?: number | null
  diferencaCaixa?: number | null
  fechadoEm?: string | null
  status: StatusSessaoCaixa
}

export const caixaApi = {
  status: () =>
    api.get<SessaoCaixa | null>('/api/caixa/status'),

  historico: () =>
    api.get<SessaoCaixa[]>('/api/caixa/historico'),

  abrir: (valorAbertura: number) =>
    api.post<SessaoCaixa>('/api/caixa/abrir', { valorAbertura }),

  fechar: (valorFechamento: number) =>
    api.post<SessaoCaixa>('/api/caixa/fechar', { valorFechamento }),

  // Valores arrecadados desde a abertura do caixa até agora, por forma de
  // pagamento — pra conferência no fechamento.
  resumo: () =>
    api.get<ResumoFinanceiro>('/api/caixa/resumo'),
}
