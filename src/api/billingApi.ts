import api from './axios'
import type { AxiosResponse } from 'axios'
import type { Page } from '../types'

// Alguns usos (agregações client-side em GestorPagamentos/Cobrancas/Dashboard, que juntam
// pagamentos de todos os contratos numa lista única ordenada) precisam da lista completa,
// não de uma página — mantemos esse helper só para esses casos específicos.
function unwrapPage<T>(promise: Promise<AxiosResponse<Page<T>>>): Promise<AxiosResponse<T[]>> {
  return promise.then((r) => ({ ...r, data: r.data.content }))
}

export interface Plano {
  id: number
  nome: string
  descricao: string
  precoMensal: number
  // null = sem limite (ex: plano PRO).
  limiteUsuarios: number | null
  limiteMesas: number | null
  // Só usada quando o plano NÃO exige modalidade — ver
  // funcionalidadesMesas/funcionalidadesDelivery abaixo.
  funcionalidades: string
  periodoTeste: boolean
  diasTeste: number
  ativo: boolean
  destaque: boolean
  // Só planos como o Startup exigem escolher a modalidade de operação
  // (mesas ou delivery) no cadastro — ver Contrato.modalidadeOperacao.
  exigeModalidadeOperacao: boolean
  // Recursos exibidos no seletor Presencial/Delivery do card do plano —
  // só preenchidas quando exigeModalidadeOperacao é true.
  funcionalidadesMesas: string | null
  funcionalidadesDelivery: string | null
  // Limite de atendentes de WhatsApp — qual campo vale depende da
  // modalidade do contrato (ver backend, BillingService.buscarRestricoesOperacao).
  // null = sem limite.
  limiteAtendentesWhatsapp: number | null
  limiteAtendentesWhatsappMesas: number | null
  limiteAtendentesWhatsappDelivery: number | null
}

export interface Contrato {
  id: number
  restauranteId: number
  plano: Plano
  status: 'TRIAL' | 'ATIVO' | 'INADIMPLENTE' | 'BLOQUEADO' | 'CANCELADO'
  dataInicio: string
  dataVencimento: string
  dataProximoVencimento: string
  // Preenchida só quando plano.exigeModalidadeOperacao é true.
  modalidadeOperacao: 'MESAS' | 'DELIVERY' | null
  // Trocas gratuitas de modalidade já usadas (máximo 2) — da 3ª em diante
  // só o suporte pode trocar, e cada troca é cobrada (ver saldoEncargosModalidade).
  trocasModalidadeGratisUsadas: number
  // Encargos pendentes de trocas de modalidade além do limite gratuito,
  // somados automaticamente no próximo pagamento registrado.
  saldoEncargosModalidade: number
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
  restauranteId: number | null
  restauranteNome: string
  titulo: string
  descricao: string
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'FECHADO'
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  origem?: 'PAINEL' | 'WHATSAPP'
  whatsappTelefone?: string | null
  whatsappNome?: string | null
  mensagens: MensagemTicket[]
  createdAt: string
  updatedAt: string
}

export interface LinkSocial {
  id: number
  tipo: 'INSTAGRAM' | 'WHATSAPP'
  url: string
  ativo: boolean
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

  // Contratos — paginação real (lista de Empresas)
  listarContratos: (page = 0) =>
    api.get<Page<Contrato>>('/api/contratos', { params: { page } }),
  // Lista completa (sem paginação visível) — usada onde o contrato é só um dado de apoio
  // para agregações client-side (GestorPagamentos, GestorCobrancas, GestorDashboard).
  listarTodosContratos: () =>
    unwrapPage(api.get<Page<Contrato>>('/api/contratos?size=1000')),
  meuContrato: () => api.get<Contrato>('/api/contratos/meu'),
  buscarContratoPorRestaurante: (id: number) => api.get<Contrato>(`/api/contratos/restaurante/${id}`),
  criarContrato: (restauranteId: number, planoId: number) =>
    api.post<Contrato>('/api/contratos', { restauranteId, planoId }),
  atualizarStatusContrato: (id: number, status: string) =>
    api.put<Contrato>(`/api/contratos/${id}/status`, { status }),
  // Troca de modalidade pedida pelo dono via suporte — só SUPER_ADMIN.
  atualizarModalidadeContrato: (id: number, modalidadeOperacao: 'MESAS' | 'DELIVERY') =>
    api.put<Contrato>(`/api/contratos/${id}/modalidade`, { modalidadeOperacao }),
  // Troca de modalidade/plano feita pelo próprio dono, direto no painel de Configurações.
  alterarMinhaModalidade: (modalidadeOperacao: 'MESAS' | 'DELIVERY') =>
    api.put<Contrato>('/api/contratos/meu/modalidade', { modalidadeOperacao }),
  alterarMeuPlano: (planoId: number, modalidadeOperacao?: 'MESAS' | 'DELIVERY') =>
    api.put<Contrato>('/api/contratos/meu/plano', { planoId, modalidadeOperacao }),
  pagamentoManual: (contratoId: number, valor: number, observacao = '') =>
    api.post<Pagamento>(`/api/contratos/${contratoId}/pagamento-manual`, { valor, observacao }),
  // Paginação real — usada na tela de detalhe de uma única empresa (GestorEmpresaDetalhe).
  listarPagamentos: (contratoId: number, page = 0) =>
    api.get<Page<Pagamento>>(`/api/contratos/${contratoId}/pagamentos`, { params: { page } }),
  // Lista completa de um contrato — usada nas agregações (Pagamentos/Cobrancas/Dashboard/AdminAssinatura).
  listarTodosPagamentos: (contratoId: number) =>
    unwrapPage(api.get<Page<Pagamento>>(`/api/contratos/${contratoId}/pagamentos?size=1000`)),

  // Tickets — paginação real
  listarTickets: (page = 0) =>
    api.get<Page<Ticket>>('/api/tickets', { params: { page } }),
  meusTickets: () => api.get<Ticket[]>('/api/tickets/meus'),
  buscarTicket: (id: number) => api.get<Ticket>(`/api/tickets/${id}`),
  criarTicket: (data: { titulo: string; descricao: string; prioridade?: string }) =>
    api.post<Ticket>('/api/tickets', data),
  atualizarStatusTicket: (id: number, status: string) =>
    api.put<Ticket>(`/api/tickets/${id}/status`, { status }),
  adicionarMensagem: (ticketId: number, mensagem: string) =>
    api.post<MensagemTicket>(`/api/tickets/${ticketId}/mensagens`, { mensagem }),

  // Links sociais (rodapé da landing page)
  listarLinksSociais: () => api.get<LinkSocial[]>('/api/links-sociais'),
  listarTodosLinksSociais: () => api.get<LinkSocial[]>('/api/links-sociais/todos'),
  criarLinkSocial: (link: Partial<LinkSocial>) => api.post<LinkSocial>('/api/links-sociais', link),
  atualizarLinkSocial: (id: number, link: Partial<LinkSocial>) =>
    api.put<LinkSocial>(`/api/links-sociais/${id}`, link),
  deletarLinkSocial: (id: number) => api.delete<void>(`/api/links-sociais/${id}`),

  // Financeiro
  relatorioReceita: (inicio: string, fim: string) =>
    api.get<Record<string, unknown>>(`/api/financeiro/billing/receita?inicio=${inicio}&fim=${fim}`),
  bloquearInadimplentes: () =>
    api.post('/api/financeiro/billing/bloquear-inadimplentes', {}),
}
