import api from './axios'
import type { DadosEmpresa, DadosEmpresaRequest } from '../types'

export interface CoresRequest {
  corPrimaria?: string
  corSecundaria?: string
  corAccent?: string
  corTexto?: string
}

export const restauranteApi = {
  buscarDados: () =>
    api.get<DadosEmpresa>('/api/auth/restaurante'),

  atualizarDados: (data: DadosEmpresaRequest) =>
    api.put<DadosEmpresa>('/api/auth/restaurante', data),

  atualizarCores: (data: CoresRequest) =>
    api.put<DadosEmpresa>('/api/auth/restaurante/cores', data),

  // Ajuste manual do marcador no mapa do Dashboard — sobrepõe a geocodificação
  // automática do endereço quando ela erra o ponto exato.
  atualizarLocalizacao: (latitude: number, longitude: number) =>
    api.put<DadosEmpresa>('/api/auth/restaurante/localizacao', { latitude, longitude }),

  atualizarLogo: (logoBase64: string | null) =>
    api.put<DadosEmpresa>('/api/auth/restaurante/logo', { logoBase64 }),

  // backgroundOpacidade precisa ir junto mesmo quando só o slider muda —
  // o endpoint substitui a imagem pelo valor enviado (null limpa o fundo).
  atualizarBackground: (backgroundBase64: string | null, backgroundOpacidade?: number) =>
    api.put<DadosEmpresa>('/api/auth/restaurante/background', { backgroundBase64, backgroundOpacidade }),
}
