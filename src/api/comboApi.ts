import api from './axios'
import type { Combo } from '../types'

export interface ComboPayload {
  nome: string
  descricao?: string
  preco: number
  imagemBase64?: string | null
  itens: { produtoId: number; quantidade: number }[]
}

export const comboApi = {
  listar: (apenasAtivos?: boolean) =>
    api.get<Combo[]>('/api/combos', { params: apenasAtivos === false ? { apenasAtivos: false } : {} }),

  buscarPorId: (id: number) =>
    api.get<Combo>(`/api/combos/${id}`),

  criar: (data: ComboPayload) =>
    api.post<Combo>('/api/combos', data),

  atualizar: (id: number, data: ComboPayload) =>
    api.put<Combo>(`/api/combos/${id}`, data),

  alterarAtivo: (id: number, ativo: boolean) =>
    api.patch<Combo>(`/api/combos/${id}/ativo`, { ativo })
}
