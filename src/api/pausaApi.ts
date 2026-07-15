import api from './axios'
import axios from 'axios'

export type TipoPausa = 'PROGRAMADA' | 'ENCERRAMENTO_ANTECIPADO'

export interface Pausa {
  id: number
  tipo: TipoPausa
  titulo?: string
  motivo?: string
  inicio: string
  fim: string
}

export interface PausaStatus {
  aberto: boolean
  motivo?: string
  reaberturaPrevista?: string
}

const publicApi = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || '',
})

export const pausaApi = {
  criar: (data: { titulo: string; inicio: string; fim: string }) =>
    api.post<Pausa>('/api/configuracoes/pausas', data),

  criarEncerramentoAntecipado: (data: { motivo: string }) =>
    api.post<Pausa>('/api/configuracoes/pausas/encerramento-antecipado', data),

  listar: () =>
    api.get<Pausa[]>('/api/configuracoes/pausas'),

  cancelar: (id: number) =>
    api.delete(`/api/configuracoes/pausas/${id}`),

  // Público, sem auth — usado na vitrine (CardapioPublico) para mostrar o banner de "fechado".
  status: (restauranteId: number) =>
    publicApi.get<PausaStatus>('/api/configuracoes/pausas/status', { params: { restauranteId } }),
}
