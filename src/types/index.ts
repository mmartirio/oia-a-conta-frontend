export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'GARCON' | 'COZINHA'
export type StatusEntrega = 'AGUARDANDO' | 'CONFIRMADA' | 'ACEITA' | 'PRONTO_PARA_ENTREGA' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADA'
export type StatusMesa = 'DISPONIVEL' | 'OCUPADA' | 'AGUARDANDO_PAGAMENTO'
export type StatusPedido = 'ENVIADO' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO'
export type StatusComanda = 'ABERTA' | 'FECHADA'
export type MetodoPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO'
export type TipoNotificacao = 'NOVO_PEDIDO' | 'PEDIDO_PRONTO'

export interface Usuario {
  id: number
  nome: string
  email: string
  role: Role
  restauranteId?: number
  ativo: boolean
  grupoId?: number | null
  grupoNome?: string | null
  // Presente só quando o usuário tem um grupo atribuído — nesse caso, essas
  // permissões definem o que ele acessa (substituem o role pra navegação e
  // pro backend). Sem grupo, undefined/null — acesso continua guiado pelo role.
  permissoes?: string[] | null
}

export interface Grupo {
  id: number
  nome: string
  permissoes: string[]
  totalUsuarios: number
  padrao: boolean
  createdAt: string
}

export interface Restaurante {
  id: number
  nome: string
  slug: string
  plano: string
  ativo: boolean
}

export interface Mesa {
  id: number
  numero: number
  capacidade: number
  status: StatusMesa
  restauranteId: number
}

export interface Categoria {
  id: number
  nome: string
  ativo: boolean
  restauranteId: number
}

export interface Produto {
  id: number
  nome: string
  descricao?: string
  preco: number
  imagemBase64: string | null
  ativo: boolean
  categoriaId: number
  restauranteId: number
}

export interface ItemPedido {
  id: number
  produtoId: number
  produtoNome: string
  quantidade: number
  precoUnitario: number
  observacao?: string
}

export interface Pedido {
  id: number
  comandaId: number
  itens: ItemPedido[]
  status: StatusPedido
  total: number
  observacao?: string
  criadoEm: string
}

export interface Comanda {
  id: number
  mesaId: number
  mesaNumero: number
  garconId: number
  garconNome: string
  status: StatusComanda
  metodoPagamento?: MetodoPagamento
  pedidos: Pedido[]
  total: number
  criadoEm: string
  fechadoEm?: string
}

export interface NotificacaoMessage {
  id: number
  tipo: TipoNotificacao
  pedidoId?: number
  comandaId?: number
  restauranteId: number
  garconId?: number
  garconNome?: string
  mesaNumero?: number
  mensagem?: string
  timestamp: string
}

export interface AuthResponse {
  token: string
  usuario: Usuario
}

export interface ItemPedidoRequest {
  produtoId: number
  quantidade: number
  observacao?: string
}

export interface PedidoRequest {
  itens: ItemPedidoRequest[]
  observacao?: string
}

export interface RestauranteConfig {
  pixChave?: string
  comissaoGarcon?: number
  comissaoEntregador?: number
  comissaoCozinheiro?: number
  fechadoManualmente?: boolean
  motivoFechamentoManual?: string | null
  alertaPedidoSom?: string
  taxaDebito?: number
  taxaCreditoVista?: number
  taxaCreditoParcelado?: number
}

export interface DadosEmpresa {
  nome: string
  cnpj: string | null
  telefone: string | null
  enderecoRua: string | null
  enderecoNumero: string | null
  enderecoBairro: string | null
  enderecoCidade: string | null
  enderecoComplemento: string | null
  slug: string
  plano: string
  ativo: boolean
  logoBase64: string | null
  corPrimaria: string | null
  corSecundaria: string | null
  corAccent: string | null
  corTexto: string | null
  backgroundBase64: string | null
  backgroundOpacidade: number | null
  latitude: number | null
  longitude: number | null
}

export interface DadosEmpresaRequest {
  nome: string
  slug?: string
  cnpj?: string
  telefone?: string
  enderecoRua?: string
  enderecoNumero?: string
  enderecoBairro?: string
  enderecoCidade?: string
  enderecoComplemento?: string
}

export type DiaSemana = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface HorarioFuncionamento {
  id?: number
  diaSemana: DiaSemana
  horaAbertura: string
  horaFechamento: string
}

export interface ItemEntrega {
  id: number
  produtoId: number
  produtoNome: string
  quantidade: number
  precoUnitario: number
  observacao?: string
}

export interface Entrega {
  id: number
  clienteNome: string
  clienteTelefone?: string
  status: StatusEntrega
  metodoPagamento: string
  itens: ItemEntrega[]
  total: number
  enderecoRua: string
  enderecoNumero: string
  enderecoBairro?: string
  enderecoCidade: string
  enderecoComplemento?: string
  observacao?: string
  entregadorNome?: string
  entregadorId?: number
  origemWhatsapp?: boolean
  criadoEm: string
  latitude?: number | null
  longitude?: number | null
  localizacaoAtualizadaEm?: string | null
}

export interface ItemEntregaRequest {
  produtoId: number
  quantidade: number
  observacao?: string
}

export interface EntregaRequest {
  clienteNome: string
  clienteTelefone?: string
  enderecoRua: string
  enderecoNumero: string
  enderecoBairro?: string
  enderecoCidade: string
  enderecoComplemento?: string
  metodoPagamento: string
  parcelas?: number
  observacao?: string
  itens: ItemEntregaRequest[]
  origemPdv?: boolean
}

export interface ComissaoInfo {
  funcionarioId: number
  nome: string
  role: string
  totalBase: number
  percentual: number
  valorComissao: number
}

export interface ResumoFinanceiro {
  totalGeral: number
  totalComandas: number
  totalEntregas: number
  qtdComandas: number
  qtdEntregas: number
  breakdownPorMetodo: Record<string, number>
  totalDespesas: number
  lucroLiquido: number
}

export type CategoriaDespesa = 'ALUGUEL' | 'INSUMOS' | 'SALARIOS' | 'ENERGIA' | 'MANUTENCAO' | 'OUTROS'

export interface Despesa {
  id: number
  categoria: CategoriaDespesa
  descricao?: string
  valor: number
  data: string
}

export interface DespesaRequest {
  categoria: CategoriaDespesa
  descricao?: string
  valor: number
  data: string
}

export interface EvolucaoDiaria {
  data: string
  totalComandas: number
  totalEntregas: number
  totalDespesas: number
}

export interface ComparativoFinanceiro {
  atual: ResumoFinanceiro
  anterior: ResumoFinanceiro
  variacaoPercentual: number
}

export type DirecaoMensagemWhatsapp = 'ENVIADA' | 'RECEBIDA'

export interface ConversaResumo {
  telefone: string
  clienteNome: string | null
  numeroReal: string | null
  ultimaMensagem: string
  direcao: DirecaoMensagemWhatsapp
  criadoEm: string
  naoLida: boolean
}

export interface MensagemWhatsapp {
  id: number
  direcao: DirecaoMensagemWhatsapp
  texto: string
  criadoEm: string
}
