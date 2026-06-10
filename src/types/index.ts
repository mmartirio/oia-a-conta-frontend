export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'GARCON' | 'COZINHA'
export type StatusMesa = 'DISPONIVEL' | 'OCUPADA' | 'AGUARDANDO_PAGAMENTO'
export type StatusPedido = 'ENVIADO' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE'
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
