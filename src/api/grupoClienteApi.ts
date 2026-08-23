import api from './axios'
import type { GrupoCliente, GrupoClienteMembro } from '../types'

export const grupoClienteApi = {
  listar: (apenasAtivos?: boolean) =>
    api.get<GrupoCliente[]>('/api/grupos-clientes', { params: apenasAtivos ? { apenasAtivos: true } : {} }),

  criar: (data: { nome: string; descricao?: string }) =>
    api.post<GrupoCliente>('/api/grupos-clientes', data),

  atualizar: (id: number, data: { nome: string; descricao?: string }) =>
    api.put<GrupoCliente>(`/api/grupos-clientes/${id}`, data),

  alterarAtivo: (id: number, ativo: boolean) =>
    api.patch<GrupoCliente>(`/api/grupos-clientes/${id}/ativo`, { ativo }),

  listarMembros: (id: number) =>
    api.get<GrupoClienteMembro[]>(`/api/grupos-clientes/${id}/membros`),

  adicionarMembro: (id: number, clienteId: number) =>
    api.post(`/api/grupos-clientes/${id}/membros`, { clienteId }),

  removerMembro: (id: number, clienteId: number) =>
    api.delete(`/api/grupos-clientes/${id}/membros/${clienteId}`)
}
