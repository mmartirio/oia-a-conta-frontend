import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || '',
})

export interface RestaurantePublico {
  id: number
  nome: string
  slug: string
  telefone: string
  logoUrl: string | null
  corPrimaria: string | null
  corSecundaria: string | null
  corAccent: string | null
  corTexto: string | null
  backgroundUrl: string | null
  backgroundOpacidade: number | null
}

export interface ProdutoPublico {
  id: number
  nome: string
  descricao: string
  preco: number
  imagemBase64: string | null
  ativo: boolean
}

export interface CategoriaPublico {
  id: number
  nome: string
  produtos: ProdutoPublico[]
}

export interface ComboGrupoProdutoPublico {
  produtoId: number
  nome: string
  preco: number
}

export interface ComboGrupoPublico {
  id: number
  nome: string
  quantidade: number
  produtos: ComboGrupoProdutoPublico[]
}

export interface ComboPublico {
  id: number
  nome: string
  descricao?: string
  preco: number
  imagemBase64: string | null
  ativo: boolean
  grupos: ComboGrupoPublico[]
}

export interface CardapioPublicoData {
  categorias: CategoriaPublico[]
  combos: ComboPublico[]
  promocaoAtiva: boolean
  promocaoDescricao?: string
  promocaoValorDesconto?: number
  promocaoTipoDesconto?: 'PERCENTUAL' | 'FIXO'
}

export interface ItemPedido {
  produtoId?: number
  produtoNome: string
  precoUnitario: number
  quantidade: number
  comboId?: number
  comboQuantidade?: number
}

export const publicApi = {
  getRestaurante: (slug: string) =>
    api.get<RestaurantePublico>(`/api/auth/publico/restaurante/${slug}`),

  getCardapio: (restauranteId: number) =>
    api.get<CardapioPublicoData>(`/api/catalog/publico/${restauranteId}/cardapio`),

  fazerPedido: (restauranteId: number, data: {
    clienteNome: string
    telefone: string
    endereco: string
    metodoPagamento: string
    observacao?: string
    itens: ItemPedido[]
  }) => api.post<{ mensagem: string; telefone: string; entregaId: number }>(
    `/api/whatsapp/publico/${restauranteId}/pedido`, data
  ),
}
