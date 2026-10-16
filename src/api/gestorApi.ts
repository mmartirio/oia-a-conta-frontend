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

export const gestorApi = {
  listarRestaurantes: () => api.get<RestauranteResumo[]>('/api/restaurantes/nomes'),
  buscarRestaurante: (id: number) => api.get<RestauranteCadastro>(`/api/restaurantes/${id}`),
  listarAdmins: () => api.get<UsuarioAdmin[]>('/api/usuarios/admins'),
  listarUsuariosPorRestaurante: (restauranteId: number) =>
    api.get<UsuarioAdmin[]>(`/api/usuarios/restaurante/${restauranteId}`),
  resetSenha: (userId: number) =>
    api.post<{ mensagem: string; novaSenha: string }>(`/api/usuarios/${userId}/reset-senha`, {}),
}
