// Períodos do Financeiro — sempre dias inteiros, no horário LOCAL.
//
// O backend recebe LocalDateTime e descarta o fuso: mandar toISOString()
// ("...T03:00:00.000Z") fazia "Hoje" começar às 03:00 e jogava as vendas da
// madrugada pro dia errado. Por isso as datas vão sem fuso ("2026-10-16T00:00:00").

export type Periodo = 'HOJE' | 'ONTEM' | 'SETE' | 'MES' | 'MES_ANTERIOR' | 'CUSTOM'

export interface Intervalo {
  inicio: string      // LocalDateTime pro backend
  fim: string
  inicioData: string  // YYYY-MM-DD (despesas)
  fimData: string
  dias: number
}

const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function intervalo(inicio: Date, fim: Date): Intervalo {
  const i = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const f = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())
  return {
    inicio: `${ymd(i)}T00:00:00`,
    fim: `${ymd(f)}T23:59:59`,
    inicioData: ymd(i),
    fimData: ymd(f),
    dias: Math.round((f.getTime() - i.getTime()) / 86_400_000) + 1,
  }
}

export function intervaloDoPeriodo(p: Periodo, customInicio?: string, customFim?: string): Intervalo | null {
  const hoje = new Date()
  switch (p) {
    case 'HOJE': return intervalo(hoje, hoje)
    case 'ONTEM': { const o = new Date(hoje); o.setDate(o.getDate() - 1); return intervalo(o, o) }
    case 'SETE': { const i = new Date(hoje); i.setDate(i.getDate() - 6); return intervalo(i, hoje) }
    case 'MES': return intervalo(new Date(hoje.getFullYear(), hoje.getMonth(), 1), hoje)
    case 'MES_ANTERIOR': return intervalo(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), new Date(hoje.getFullYear(), hoje.getMonth(), 0))
    case 'CUSTOM':
      if (!customInicio || !customFim || customFim < customInicio) return null
      return intervalo(new Date(`${customInicio}T12:00:00`), new Date(`${customFim}T12:00:00`))
  }
}

// Mês "2026-10" → intervalo do mês inteiro (até hoje, se for o mês atual).
export function intervaloDoMes(mes: string): Intervalo & { diasNoMes: number; diasDecorridos: number; ehMesAtual: boolean } {
  const [a, m] = mes.split('-').map(Number)
  const inicio = new Date(a, m - 1, 1)
  const ultimo = new Date(a, m, 0)
  const hoje = new Date()
  const ehMesAtual = hoje.getFullYear() === a && hoje.getMonth() === m - 1
  const fim = ehMesAtual ? hoje : ultimo
  const base = intervalo(inicio, fim)
  return { ...base, diasNoMes: ultimo.getDate(), diasDecorridos: base.dias, ehMesAtual }
}

export function mesAtual() {
  const h = new Date()
  return `${h.getFullYear()}-${pad(h.getMonth() + 1)}`
}

export function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function moedaCurta(v: number) {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

export function dataCurta(isoOuYmd: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOuYmd) ? new Date(`${isoOuYmd}T12:00:00`) : new Date(isoOuYmd)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export const METODO_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
}
