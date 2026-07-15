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
}

export const produtoApi = {
  listar: (categoriaId?: number) =>
    api.get<Produto[]>('/api/produtos', { params: categoriaId ? { categoriaId } : {} }),

  criar: (data: ProdutoPayload) =>
    api.post<Produto>('/api/produtos', data),

  atualizar: (id: number, data: ProdutoPayload) =>
    api.put<Produto>(`/api/produtos/${id}`, data),

  desativar: (id: number) =>
    api.delete(`/api/produtos/${id}`)
}
