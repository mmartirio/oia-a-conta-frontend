import api from './axios'
import type { Categoria } from '../types'

export const categoriaApi = {
  listar: () =>
    api.get<Categoria[]>('/api/categorias'),

  criar: (data: { nome: string }) =>
    api.post<Categoria>('/api/categorias', data),

  atualizar: (id: number, data: { nome: string; ativo?: boolean }) =>
    api.put<Categoria>(`/api/categorias/${id}`, data),

  desativar: (id: number) =>
    api.delete(`/api/categorias/${id}`)
}
