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

export interface ItemPedido {
  produtoId: number
  produtoNome: string
  precoUnitario: number
  quantidade: number
}

export const publicApi = {
  getRestaurante: (slug: string) =>
    api.get<RestaurantePublico>(`/api/auth/publico/restaurante/${slug}`),

  getCardapio: (restauranteId: number) =>
    api.get<CategoriaPublico[]>(`/api/catalog/publico/${restauranteId}/cardapio`),

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
