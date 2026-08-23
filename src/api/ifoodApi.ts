import api from './axios'

export interface IfoodStatus {
  conectado: boolean
  merchantId?: string
  merchantNome?: string
  conectadoEm?: string
  catalogoSincronizadoEm?: string
}

export interface IfoodVinculoIniciar {
  userCode: string
  verificationUrl: string
  verificationUrlComplete: string
  expiresIn: number
}

export type IfoodVinculoStatusValor = 'NAO_INICIADO' | 'AGUARDANDO_AUTORIZACAO' | 'CONECTADO' | 'EXPIRADO'

export interface IfoodVinculoStatus {
  status: IfoodVinculoStatusValor
}

export interface IfoodCatalogoSync {
  categoriasSincronizadas: number
  itensSincronizados: number
  itensPausados: number
  sincronizadoEm: string
}

export const ifoodApi = {
  status: () =>
    api.get<IfoodStatus>('/api/ifood/admin/status'),

  vincular: () =>
    api.post<IfoodVinculoIniciar>('/api/ifood/admin/vincular'),

  vincularStatus: () =>
    api.get<IfoodVinculoStatus>('/api/ifood/admin/vincular/status'),

  desconectar: () =>
    api.delete('/api/ifood/admin/desconectar'),

  sincronizarCatalogo: () =>
    api.post<IfoodCatalogoSync>('/api/ifood/admin/catalogo/sincronizar'),
}
