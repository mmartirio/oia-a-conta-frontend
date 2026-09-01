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
  donoConta?: boolean
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
  ordem: number
}

export interface Produto {
  id: number
  nome: string
  descricao?: string
  preco: number
  imagemBase64: string | null
  numeroCardapio?: number | null
  ativo: boolean
  categoriaId: number
  restauranteId: number
}

export interface Cliente {
  id: number
  nome: string
  telefone: string
  email?: string
  dataNascimento?: string
  enderecoRua?: string
  enderecoNumero?: string
  enderecoBairro?: string
  enderecoCidade?: string
  enderecoComplemento?: string
  enderecoCep?: string
  observacoes?: string
  ativo: boolean
  restauranteId: number
  createdAt: string
}

export interface GrupoCliente {
  id: number
  nome: string
  descricao?: string
  ativo: boolean
  totalMembros: number
  restauranteId: number
  createdAt: string
}

export interface GrupoClienteMembro {
  clienteId: number
  clienteNome: string
  clienteTelefone: string
  adicionadoEm: string
}

export type TipoMovimentacaoEstoque = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA' | 'ESTORNO'

export interface Estoque {
  produtoId: number
  produtoNome: string
  quantidade: number
  quantidadeMinima: number
  controlado: boolean
  abaixoDoMinimo: boolean
}

export type TipoDesconto = 'PERCENTUAL' | 'FIXO'
export type TipoAlvo = 'TODOS' | 'GRUPO' | 'INDIVIDUAL'

export interface Cupom {
  id: number
  codigo: string
  tipoDesconto: TipoDesconto
  valorDesconto: number
  tipoAlvo: TipoAlvo
  grupoClienteId?: number
  grupoClienteNome?: string
  clienteId?: number
  clienteNome?: string
  validoDe: string
  validoAte: string
  ativo: boolean
  restauranteId: number
}

export interface Promocao {
  id: number
  nome: string
  descricao?: string
  tipoDesconto: TipoDesconto
  valorDesconto: number
  tipoAlvo: TipoAlvo
  grupoClienteId?: number
  grupoClienteNome?: string
  requisitoGastoMinimo?: number
  validoDe: string
  validoAte: string
  ativo: boolean
  restauranteId: number
}

export interface ComboGrupoProduto {
  produtoId: number
  nome: string
  preco: number
}

export interface ComboGrupo {
  id: number
  nome: string
  quantidade: number
  produtos: ComboGrupoProduto[]
}

export interface Combo {
  id: number
  nome: string
  descricao?: string
  preco: number
  imagemBase64: string | null
  numeroCardapio?: number | null
  ativo: boolean
  grupos: ComboGrupo[]
  restauranteId: number
}

export interface MovimentacaoEstoque {
  id: number
  produtoId: number
  tipo: TipoMovimentacaoEstoque
  quantidade: number
  quantidadeResultante: number
  motivo?: string
  referenciaExterna?: string
  criadoPorNome?: string
  criadoEm: string
}

export interface ItemPedido {
  id: number
  produtoId: number
  produtoNome: string
  quantidade: number
  precoUnitario: number
  observacao?: string
  comboId?: number
  comboNome?: string
}

export interface Pedido {
  id: number
  comandaId: number | null
  mesaNumero?: number | null
  garconNome?: string | null
  entregaId?: number | null
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
  subtotal?: number
  desconto?: number
  total: number
  clienteId?: number
  descontoTipo?: 'CUPOM' | 'PROMOCAO'
  descontoOrigemDescricao?: string
  criadoEm: string
  fechadoEm?: string
  aguardandoPagamentoEm?: string
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
  produtoId?: number
  produtoNome?: string
  precoUnitario?: number
  quantidade: number
  observacao?: string
  comboId?: number
  comboQuantidade?: number
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
  notificacaoWhatsappFalada?: boolean
  freteTaxaBase?: number
  freteValorPorKm?: number
  entregadorExterno?: boolean
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
  motivoRejeicao?: string | null
  entregadorNome?: string
  entregadorId?: number
  origemWhatsapp?: boolean
  origemIfood?: boolean
  pagamentoConfirmadoCaixa?: boolean
  criadoEm: string
  entregueEm?: string | null
  latitude?: number | null
  longitude?: number | null
  localizacaoAtualizadaEm?: string | null
  enderecoLatitude?: number | null
  enderecoLongitude?: number | null
  distanciaKm?: number | null
  valorFrete?: number | null
}

export interface ItemEntregaRequest {
  produtoId?: number
  produtoNome?: string
  precoUnitario?: number
  quantidade: number
  observacao?: string
  comboId?: number
  comboQuantidade?: number
}

export interface EntregaRequest {
  clienteNome: string
  clienteTelefone?: string
  enderecoRua: string
  enderecoNumero: string
  enderecoBairro?: string
  enderecoCidade: string
  enderecoComplemento?: string
  enderecoLatitude?: number
  enderecoLongitude?: number
  metodoPagamento: string
  parcelas?: number
  observacao?: string
  itens: ItemEntregaRequest[]
  origemPdv?: boolean
}

export interface FreteCalculado {
  distanciaKm: number | null
  valorFrete: number | null
  disponivel: boolean
}

export interface ParadaRota {
  entregaId: number
  ordem: number
  clienteNome: string
  enderecoResumo: string
  distanciaKm: number
  duracaoMin: number
  urgente: boolean
}

export interface RotaSugerida {
  paradas: ParadaRota[]
  distanciaTotalKm: number
  duracaoTotalMin: number
  semCoordenadas: number[]
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
