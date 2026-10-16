import api from './axios'

export interface IfoodStatus {
  conectado: boolean
  merchantId?: string
  merchantNome?: string
  conectadoEm?: string
  catalogoSincronizadoEm?: string
}

export interface IfoodLojaDisponivel {
  id: string
  name: string
  corporateName?: string
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

  // Lojas já autorizadas pra esta aplicação no iFood (pelo Portal do
  // Parceiro) e ainda não vinculadas a nenhum restaurante daqui.
  lojasDisponiveis: () =>
    api.get<IfoodLojaDisponivel[]>('/api/ifood/admin/lojas-disponiveis'),

  vincular: (merchantId: string) =>
    api.post<void>('/api/ifood/admin/vincular', { merchantId }),

  desconectar: () =>
    api.delete('/api/ifood/admin/desconectar'),

  sincronizarCatalogo: () =>
    api.post<IfoodCatalogoSync>('/api/ifood/admin/catalogo/sincronizar'),
}
