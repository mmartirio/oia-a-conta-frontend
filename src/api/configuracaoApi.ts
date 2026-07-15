import api from './axios'
import type { RestauranteConfig } from '../types'

export const configuracaoApi = {
  get: () =>
    api.get<RestauranteConfig>('/api/configuracoes'),

  atualizarStatusLoja: (fechado: boolean, motivo?: string) =>
    api.put<RestauranteConfig>('/api/configuracoes/status-loja', { fechado, motivo }),

  atualizarAlertaPedido: (alertaPedidoSom: string) =>
    api.put<RestauranteConfig>('/api/configuracoes/alerta-pedido', { alertaPedidoSom }),

  atualizarPix: (pixChave: string) =>
    api.put<RestauranteConfig>('/api/configuracoes/pix', { pixChave }),

  atualizarComissoes: (data: { comissaoGarcon: number; comissaoEntregador: number; comissaoCozinheiro: number }) =>
    api.put<RestauranteConfig>('/api/configuracoes/comissoes', data),

  atualizarTaxasMaquininha: (data: { taxaDebito: number; taxaCreditoVista: number; taxaCreditoParcelado: number }) =>
    api.put<RestauranteConfig>('/api/configuracoes/taxas-maquininha', data),
}
