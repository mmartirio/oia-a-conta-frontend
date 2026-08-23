import api from './axios'
import type { Cupom, TipoAlvo, TipoDesconto } from '../types'

export interface CupomPayload {
  codigo: string
  tipoDesconto: TipoDesconto
  valorDesconto: number
  tipoAlvo: TipoAlvo
  grupoClienteId?: number
  clienteId?: number
  validoDe: string
  validoAte: string
}

export interface CupomValidacao {
  valido: boolean
  motivoInvalido?: string
  cupomId?: number
  codigo?: string
  tipoDesconto?: TipoDesconto
  valorDesconto?: number
}

export const cupomApi = {
  listar: () =>
    api.get<Cupom[]>('/api/cupons'),

  // Checagem de elegibilidade (alvo + validade) — não gera efeito colateral,
  // usado pra pré-visualizar o desconto antes de fechar a venda.
  validar: (codigo: string, clienteId?: number) =>
    api.get<CupomValidacao>('/api/cupons/validar', { params: { codigo, ...(clienteId ? { clienteId } : {}) } }),

  criar: (data: CupomPayload) =>
    api.post<Cupom>('/api/cupons', data),

  atualizar: (id: number, data: CupomPayload) =>
    api.put<Cupom>(`/api/cupons/${id}`, data),

  alterarAtivo: (id: number, ativo: boolean) =>
    api.patch<Cupom>(`/api/cupons/${id}/ativo`, { ativo })
}
