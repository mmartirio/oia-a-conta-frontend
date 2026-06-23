import api from './axios'

export interface Plano {
  id: number
  nome: string
  descricao: string
  precoMensal: number
  limiteUsuarios: number
  limiteMesas: number
  funcionalidades: string
  periodoTeste: boolean
  diasTeste: number
  ativo: boolean
  destaque: boolean
}

export interface Contrato {
  id: number
  restauranteId: number
  plano: Plano
  status: 'TRIAL' | 'ATIVO' | 'INADIMPLENTE' | 'BLOQUEADO' | 'CANCELADO'
  dataInicio: string
  dataVencimento: string
  dataProximoVencimento: string
}

export interface Pagamento {
  id: number
  valor: number
  dataPagamento: string
  status: 'PENDENTE' | 'PAGO' | 'ESTORNADO' | 'FALHOU'
  metodo: string
  observacao: string
  createdAt: string
}

export interface Ticket {
  id: number
  restauranteId: number
  restauranteNome: string
  titulo: string
  descricao: string
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'FECHADO'
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  mensagens: MensagemTicket[]
  createdAt: string
  updatedAt: string
}

export interface MensagemTicket {
  id: number
  remetenteNome: string
  remetenteTipo: 'CLIENTE' | 'SUPORTE'
  mensagem: string
  createdAt: string
}

export const billingApi = {
  // Planos
  listarPlanos: () => api.get<Plano[]>('/api/planos'),
  listarTodosPlanos: () => api.get<Plano[]>('/api/planos/todos'),
  criarPlano: (plano: Partial<Plano>) => api.post<Plano>('/api/planos', plano),
  atualizarPlano: (id: number, plano: Partial<Plano>) => api.put<Plano>(`/api/planos/${id}`, plano),

  // Contratos
  listarContratos: () => api.get<Contrato[]>('/api/contratos'),
  meuContrato: () => api.get<Contrato>('/api/contratos/meu'),
  buscarContratoPorRestaurante: (id: number) => api.get<Contrato>(`/api/contratos/restaurante/${id}`),
  criarContrato: (restauranteId: number, planoId: number) =>
    api.post<Contrato>('/api/contratos', { restauranteId, planoId }),
  atualizarStatusContrato: (id: number, status: string) =>
    api.put<Contrato>(`/api/contratos/${id}/status`, { status }),
  pagamentoManual: (contratoId: number, valor: number, observacao = '') =>
    api.post<Pagamento>(`/api/contratos/${contratoId}/pagamento-manual`, { valor, observacao }),
  listarPagamentos: (contratoId: number) =>
    api.get<Pagamento[]>(`/api/contratos/${contratoId}/pagamentos`),

  // Tickets
  listarTickets: () => api.get<Ticket[]>('/api/tickets'),
  meusTickets: () => api.get<Ticket[]>('/api/tickets/meus'),
  buscarTicket: (id: number) => api.get<Ticket>(`/api/tickets/${id}`),
  criarTicket: (data: { titulo: string; descricao: string; prioridade?: string }) =>
    api.post<Ticket>('/api/tickets', data),
  atualizarStatusTicket: (id: number, status: string) =>
    api.put<Ticket>(`/api/tickets/${id}/status`, { status }),
  adicionarMensagem: (ticketId: number, mensagem: string) =>
    api.post<MensagemTicket>(`/api/tickets/${ticketId}/mensagens`, { mensagem }),

  // Financeiro
  relatorioReceita: (inicio: string, fim: string) =>
    api.get<Record<string, unknown>>(`/api/financeiro/billing/receita?inicio=${inicio}&fim=${fim}`),
  bloquearInadimplentes: () =>
    api.post('/api/financeiro/billing/bloquear-inadimplentes', {}),
}
