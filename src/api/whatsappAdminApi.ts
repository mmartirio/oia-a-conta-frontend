import api from './axios'

export interface WhatsappStatus {
  estado: 'CONECTADO' | 'DESCONECTADO' | 'AGUARDANDO_SCAN' | 'ERRO'
  qrCodeBase64?: string
  qrCodeRaw?: string
  mensagem?: string
}

export interface MensagemTemplate {
  chave: string
  label: string
  texto: string
  textoPadrao: string | null
  personalizado: boolean
  sistema: boolean
  ativo: boolean
  grupo: string
  ordem: number
  variavelHint?: string
}

export interface AutomacaoMensagem {
  id: number
  acionador: string
  mensagem: string
  ativo: boolean
}

export const whatsappAdminApi = {
  status: () =>
    api.get<WhatsappStatus>('/api/whatsapp/admin/status'),

  conectar: () =>
    api.post<WhatsappStatus>('/api/whatsapp/admin/conectar'),

  desconectar: () =>
    api.delete('/api/whatsapp/admin/desconectar'),

  listarMensagens: () =>
    api.get<MensagemTemplate[]>('/api/whatsapp/admin/mensagens'),

  criarMensagem: (label: string, texto: string, grupo: string) =>
    api.post<MensagemTemplate>('/api/whatsapp/admin/mensagens', { label, texto, grupo }),

  salvarMensagem: (chave: string, texto: string) =>
    api.put(`/api/whatsapp/admin/mensagens/${chave}`, { texto }),

  // Desativa mensagem de sistema ou exclui mensagem customizada
  remover: (chave: string) =>
    api.delete(`/api/whatsapp/admin/mensagens/${chave}`),

  // Restaura mensagem de sistema ao texto padrão (reativa se estava desativada)
  restaurar: (chave: string) =>
    api.post(`/api/whatsapp/admin/mensagens/${chave}/restaurar`),

  salvarOrdem: (itens: { chave: string; ordem: number }[]) =>
    api.put('/api/whatsapp/admin/mensagens/ordem', itens),

  chatbotStatus: () =>
    api.get<{ ativo: boolean }>('/api/whatsapp/admin/chatbot-status'),

  atualizarChatbotStatus: (ativo: boolean) =>
    api.put<{ ativo: boolean }>('/api/whatsapp/admin/chatbot-status', { ativo }),

  // Imagem do cardápio numerado enviada pelo lembrete de 10 min do chatbot —
  // data URI base64; "" = sem imagem configurada.
  cardapioImagem: () =>
    api.get<{ imagemBase64: string }>('/api/whatsapp/admin/cardapio-imagem'),

  atualizarCardapioImagem: (imagemBase64: string) =>
    api.put('/api/whatsapp/admin/cardapio-imagem', { imagemBase64 }),

  listarAutomacoes: () =>
    api.get<AutomacaoMensagem[]>('/api/whatsapp/admin/automacoes'),

  criarAutomacao: (acionador: string, mensagem: string) =>
    api.post<AutomacaoMensagem>('/api/whatsapp/admin/automacoes', { acionador, mensagem }),

  atualizarAutomacao: (id: number, acionador: string, mensagem: string, ativo?: boolean) =>
    api.put<AutomacaoMensagem>(`/api/whatsapp/admin/automacoes/${id}`, { acionador, mensagem, ativo }),

  removerAutomacao: (id: number) =>
    api.delete(`/api/whatsapp/admin/automacoes/${id}`),
}
