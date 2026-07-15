import api from './axios'

export type StatusSessaoCaixa = 'ABERTO' | 'FECHADO'

export interface SessaoCaixa {
  id: number
  abertoPorNome: string
  valorAbertura: number
  abertoEm: string
  fechadoPorNome?: string | null
  valorFechamento?: number | null
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
}
