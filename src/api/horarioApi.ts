import api from './axios'
import type { HorarioFuncionamento } from '../types'

export const horarioApi = {
  listar: () =>
    api.get<HorarioFuncionamento[]>('/api/configuracoes/horarios'),

  salvarSemana: (horarios: HorarioFuncionamento[]) =>
    api.put<HorarioFuncionamento[]>('/api/configuracoes/horarios', horarios),
}
