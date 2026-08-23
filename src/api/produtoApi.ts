import api from './axios'
import type { Produto } from '../types'

interface ProdutoPayload {
  nome: string
  descricao?: string
  preco: number
  categoriaId: number
  ativo?: boolean
  // null/ausente = não altera a imagem atual; "" explícito = remove a imagem.
  imagemBase64?: string | null
  numeroCardapio?: number
}

export const produtoApi = {
  listar: (categoriaId?: number, incluirInativos?: boolean) =>
    api.get<Produto[]>('/api/produtos', {
      params: { ...(categoriaId ? { categoriaId } : {}), ...(incluirInativos ? { incluirInativos: true } : {}) }
    }),

  criar: (data: ProdutoPayload) =>
    api.post<Produto>('/api/produtos', data),

  atualizar: (id: number, data: ProdutoPayload) =>
    api.put<Produto>(`/api/produtos/${id}`, data),

  desativar: (id: number) =>
    api.delete(`/api/produtos/${id}`),

  alterarAtivo: (id: number, ativo: boolean) =>
    api.patch<Produto>(`/api/produtos/${id}/ativo`, { ativo })
}
