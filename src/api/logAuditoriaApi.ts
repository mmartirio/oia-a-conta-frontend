import api from './axios'
import type { Page } from '../types'

export interface LogAuditoria {
  id: number
  restauranteId: number
  tipo: string
  descricao: string
  usuarioId: number | null
  usuarioNome: string | null
  criadoEm: string
}

export const logAuditoriaApi = {
  listar: (restauranteId: number, page: number, tipo?: string) =>
    api.get<Page<LogAuditoria>>('/api/auditoria', { params: { restauranteId, page, tipo: tipo || undefined } }),
}
