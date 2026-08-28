import api from './axios'
import type { WhatsappStatus } from './whatsappAdminApi'

export const whatsappPlataformaApi = {
  status: () =>
    api.get<WhatsappStatus>('/api/whatsapp/plataforma/status'),

  conectar: () =>
    api.post<WhatsappStatus>('/api/whatsapp/plataforma/conectar'),

  desconectar: () =>
    api.delete('/api/whatsapp/plataforma/desconectar'),
}
