import type { StatusMesa, StatusPedido, MetodoPagamento } from '../types'

// ── Máscaras ─────────────────────────────────────────────────────────────────

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(isoString))
}

export function parseDate(dateStr: string): Date | null {
  const [day, month, year] = dateStr.split('/').map(Number)
  if (!day || !month || !year) return null
  const d = new Date(year, month - 1, day)
  return isNaN(d.getTime()) ? null : d
}

export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
}

export function formatCurrency(value?: number | null): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value ?? 0)
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString))
}

export function formatTime(isoString?: string | null): string {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString))
}

export const STATUS_MESA_LABEL: Record<StatusMesa, string> = {
  DISPONIVEL: 'Disponível',
  OCUPADA: 'Ocupada',
  AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento'
}

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  ENVIADO: 'Enviado',
  PREPARANDO: 'Preparando',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue'
}

export const METODO_PAGAMENTO_LABEL: Record<MetodoPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito'
}
