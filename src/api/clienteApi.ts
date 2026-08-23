import api from './axios'
import type { Cliente } from '../types'

export interface ClientePayload {
  nome: string
  telefone: string
  email?: string
  dataNascimento?: string
  enderecoRua?: string
  enderecoNumero?: string
  enderecoBairro?: string
  enderecoCidade?: string
  enderecoComplemento?: string
  enderecoCep?: string
  observacoes?: string
}

export const clienteApi = {
  listar: (apenasAtivos?: boolean) =>
    api.get<Cliente[]>('/api/clientes', { params: apenasAtivos ? { apenasAtivos: true } : {} }),

  buscarPorTelefone: (telefone: string) =>
    api.get<Cliente>('/api/clientes/buscar', { params: { telefone } }),

  buscarPorId: (id: number) =>
    api.get<Cliente>(`/api/clientes/${id}`),

  criar: (data: ClientePayload) =>
    api.post<Cliente>('/api/clientes', data),

  atualizar: (id: number, data: ClientePayload) =>
    api.put<Cliente>(`/api/clientes/${id}`, data),

  alterarAtivo: (id: number, ativo: boolean) =>
    api.patch<Cliente>(`/api/clientes/${id}/ativo`, { ativo })
}
