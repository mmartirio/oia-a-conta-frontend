import api from './axios'
import type { Categoria } from '../types'

export const categoriaApi = {
  listar: (incluirInativos?: boolean) =>
    api.get<Categoria[]>('/api/categorias', { params: incluirInativos ? { incluirInativos: true } : {} }),

  criar: (data: { nome: string }) =>
    api.post<Categoria>('/api/categorias', data),

  atualizar: (id: number, data: { nome: string; ativo?: boolean }) =>
    api.put<Categoria>(`/api/categorias/${id}`, data),

  desativar: (id: number) =>
    api.delete(`/api/categorias/${id}`),

  alterarAtivo: (id: number, ativo: boolean) =>
    api.patch<Categoria>(`/api/categorias/${id}/ativo`, { ativo }),

  reordenar: (ids: number[]) =>
    api.put<Categoria[]>('/api/categorias/reordenar', { ids })
}
