import api from './axios'

export interface UsuarioAdmin {
  id: number
  nome: string
  email: string
  role: string
  ativo: boolean
  restauranteId: number | null
  createdAt: string
}

// Identificação/dados cadastrais das empresas — os contratos (billing) só
// têm restauranteId; isso vem do auth-service (SUPER_ADMIN).
export interface RestauranteResumo {
  id: number
  nome: string
  slug: string
  ativo: boolean
}

export interface RestauranteCadastro extends RestauranteResumo {
  cnpj: string | null
  telefone: string | null
  emailResponsavel: string | null
  enderecoRua: string | null
  enderecoNumero: string | null
  enderecoBairro: string | null
  enderecoCidade: string | null
  enderecoComplemento: string | null
  dataBloqueio: string | null
  whatsappConfigurado: boolean
  createdAt: string | null
}

// Painel do gestor — números agregados calculados no billing-service.
export interface ContratoAtencao {
  contratoId: number
  restauranteId: number
  planoNome: string
  valor: number
  status: string
  dataVencimento: string | null
  cartao: boolean
}

export interface ResumoPainel {
  totalEmpresas: number
  porStatus: Record<string, number>
  mrr: number
  receitaMesAtual: number
  receitaMesAnterior: number
  serieReceita: { mes: string; receita: number }[]
  assinaturasCartao: number
  pagamentosFalhos30d: number
  ticketsAbertos: number
  vencendo7dias: ContratoAtencao[]
  atrasados: ContratoAtencao[]
}

export interface PagamentoPainel {
  id: number
  valor: number
  status: 'PENDENTE' | 'PAGO' | 'ESTORNADO' | 'FALHOU'
  metodo: string | null
  observacao: string | null
  dataPagamento: string | null
  createdAt: string
  contratoId: number
  restauranteId: number
  planoNome: string
}

export const gestorApi = {
  resumo: () => api.get<ResumoPainel>('/api/financeiro/billing/resumo'),
  todosPagamentos: () => api.get<PagamentoPainel[]>('/api/financeiro/billing/pagamentos'),
  // Todos os tickets de uma vez (filtro/busca no navegador — volume pequeno).
  todosTickets: () =>
    api.get<{ content: import('./billingApi').Ticket[] }>('/api/tickets', { params: { size: 500 } }),
  ticketsDaEmpresa: (restauranteId: number) =>
    api.get<import('./billingApi').Ticket[]>(`/api/tickets/restaurante/${restauranteId}`),
  listarRestaurantes: () => api.get<RestauranteResumo[]>('/api/restaurantes/nomes'),
  buscarRestaurante: (id: number) => api.get<RestauranteCadastro>(`/api/restaurantes/${id}`),
  listarAdmins: () => api.get<UsuarioAdmin[]>('/api/usuarios/admins'),
  listarUsuariosPorRestaurante: (restauranteId: number) =>
    api.get<UsuarioAdmin[]>(`/api/usuarios/restaurante/${restauranteId}`),
  resetSenha: (userId: number) =>
    api.post<{ mensagem: string; novaSenha: string }>(`/api/usuarios/${userId}/reset-senha`, {}),
}
