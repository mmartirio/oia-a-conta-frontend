import api from './axios'

// Conexão da conta Mercado Pago do restaurante (OAuth) — recebe o pagamento
// online dos pedidos do cardápio. Ver MercadoPagoContaService no order-service.
export interface StatusConexaoMercadoPago {
  disponivel: boolean
  conectado: boolean
  mpUserId?: string
  conectadoEm?: string
}

export const pagamentoOnlineApi = {
  status: () => api.get<StatusConexaoMercadoPago>('/api/pagamento-online/conexao'),
  iniciarConexao: () => api.post<{ url: string }>('/api/pagamento-online/conexao/iniciar'),
  concluirConexao: (code: string, state: string) =>
    api.post<StatusConexaoMercadoPago>('/api/pagamento-online/conexao/concluir', { code, state }),
  desconectar: () => api.delete<void>('/api/pagamento-online/conexao'),
}
