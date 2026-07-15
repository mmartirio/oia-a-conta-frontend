import api from './axios'
import type { ConversaResumo, MensagemWhatsapp, Page } from '../types'

export const whatsappConversaApi = {
  listarConversas: () =>
    api.get<ConversaResumo[]>('/api/whatsapp/admin/conversas'),

  contarNaoLidas: () =>
    api.get<{ quantidade: number }>('/api/whatsapp/admin/conversas/contagem-nao-lidas'),

  listarMensagens: (telefone: string, page = 0) =>
    api.get<Page<MensagemWhatsapp>>(`/api/whatsapp/admin/conversas/${encodeURIComponent(telefone)}/mensagens`, { params: { page } }),

  enviarMensagem: (telefone: string, texto: string) =>
    api.post<void>(`/api/whatsapp/admin/conversas/${encodeURIComponent(telefone)}/mensagens`, { texto }),

  renomear: (telefone: string, nome: string) =>
    api.put<void>(`/api/whatsapp/admin/conversas/${encodeURIComponent(telefone)}/nome`, { nome }),
}
