import api from './axios'
import type { RestauranteConfig } from '../types'

export const configuracaoApi = {
  get: () =>
    api.get<RestauranteConfig>('/api/configuracoes'),

  salvar: (data: Partial<RestauranteConfig>) =>
    api.put<RestauranteConfig>('/api/configuracoes', data),
}
