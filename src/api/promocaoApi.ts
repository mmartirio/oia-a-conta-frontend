import api from './axios'
import type { Promocao, TipoAlvo, TipoDesconto } from '../types'

export interface PromocaoPayload {
  nome: string
  descricao?: string
  tipoDesconto: TipoDesconto
  valorDesconto: number
  tipoAlvo: TipoAlvo
  grupoClienteId?: number
  requisitoGastoMinimo?: number
  validoDe: string
  validoAte: string
}

export interface PromocaoAplicavel {
  promocaoId: number
  nome: string
  tipoDesconto: TipoDesconto
  valorDesconto: number
}

export const promocaoApi = {
  listar: () =>
    api.get<Promocao[]>('/api/promocoes'),

  // gastoHistorico omitido = tratado como zero no catalog-service — promoções
  // com requisito de gasto mínimo não aparecem aqui (o requisito é revalidado
  // com o valor real no order-service ao aplicar via comandaApi.aplicarDesconto).
  aplicaveis: (clienteId?: number) =>
    api.get<PromocaoAplicavel[]>('/api/promocoes/aplicaveis', { params: clienteId ? { clienteId } : {} }),

  criar: (data: PromocaoPayload) =>
    api.post<Promocao>('/api/promocoes', data),

  atualizar: (id: number, data: PromocaoPayload) =>
    api.put<Promocao>(`/api/promocoes/${id}`, data),

  alterarAtivo: (id: number, ativo: boolean) =>
    api.patch<Promocao>(`/api/promocoes/${id}/ativo`, { ativo })
}
