import { useEffect, useState, type ReactNode } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiClock, FiSlash, FiXCircle, FiPauseCircle } from 'react-icons/fi'
import { gestorApi } from '../../api/gestorApi'
import ui from './Painel.module.css'

// Peças compartilhadas do painel do gestor — mesmo visual em todas as telas.

// Cor do tema já resolvida (o recharts passa cor como atributo SVG, onde
// var(--x) não é confiável em todo navegador).
export function corTema(variavel: string, padrao: string) {
  if (typeof window === 'undefined') return padrao
  const v = getComputedStyle(document.documentElement).getPropertyValue(variavel).trim()
  return v || padrao
}

export function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function data(iso: string | null | undefined) {
  if (!iso) return '—'
  // "2026-10-16" (LocalDate) é interpretado como UTC pelo Date — força meio-dia
  // pra não virar o dia anterior no fuso do Brasil.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

// id → nome das empresas (auth-service); os contratos só têm o id. Uma
// chamada só, compartilhada entre as telas enquanto o painel está aberto.
let cacheNomes: Promise<Record<number, string>> | null = null
export function useNomesEmpresas() {
  const [nomes, setNomes] = useState<Record<number, string>>({})
  useEffect(() => {
    if (!cacheNomes) {
      cacheNomes = gestorApi.listarRestaurantes()
        .then(r => Object.fromEntries(r.data.map(x => [x.id, x.nome])))
        .catch(() => { cacheNomes = null; return {} })
    }
    cacheNomes.then(setNomes)
  }, [])
  return (id: number | null | undefined) => (id == null ? '—' : nomes[id] ?? `Empresa #${id}`)
}

export function PageHeader({ titulo, subtitulo, acoes }: { titulo: ReactNode; subtitulo?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className={ui.pageHeader}>
      <div>
        <h1 className={ui.pageTitle}>{titulo}</h1>
        {subtitulo && <p className={ui.pageSubtitle}>{subtitulo}</p>}
      </div>
      {acoes && <div className={ui.pageActions}>{acoes}</div>}
    </header>
  )
}

export function Kpi({ rotulo, valor, detalhe, tom }: {
  rotulo: string
  valor: ReactNode
  detalhe?: ReactNode
  tom?: 'neutro' | 'bom' | 'alerta' | 'critico'
}) {
  return (
    <div className={`${ui.kpi} ${tom ? ui[`kpi_${tom}`] : ''}`}>
      <div className={ui.kpiRotulo}>{rotulo}</div>
      <div className={ui.kpiValor}>{valor}</div>
      {detalhe && <div className={ui.kpiDetalhe}>{detalhe}</div>}
    </div>
  )
}

export function Secao({ titulo, acoes, children, semPadding }: {
  titulo?: ReactNode
  acoes?: ReactNode
  children: ReactNode
  semPadding?: boolean
}) {
  return (
    <section className={ui.secao}>
      {(titulo || acoes) && (
        <div className={ui.secaoHeader}>
          {titulo && <h2 className={ui.secaoTitulo}>{titulo}</h2>}
          {acoes && <div className={ui.pageActions}>{acoes}</div>}
        </div>
      )}
      <div className={semPadding ? undefined : ui.secaoCorpo}>{children}</div>
    </section>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className={ui.vazio}>{children}</p>
}

// Status sempre com ícone + texto (nunca só cor).
const STATUS_CONTRATO: Record<string, { rotulo: string; tom: string; Icone: typeof FiCheckCircle }> = {
  ATIVO: { rotulo: 'Ativo', tom: 'bom', Icone: FiCheckCircle },
  TRIAL: { rotulo: 'Em teste', tom: 'info', Icone: FiClock },
  INADIMPLENTE: { rotulo: 'Inadimplente', tom: 'alerta', Icone: FiAlertTriangle },
  BLOQUEADO: { rotulo: 'Bloqueado', tom: 'critico', Icone: FiSlash },
  CANCELADO: { rotulo: 'Cancelado', tom: 'neutro', Icone: FiXCircle },
}
const STATUS_PAGAMENTO: Record<string, { rotulo: string; tom: string; Icone: typeof FiCheckCircle }> = {
  PAGO: { rotulo: 'Pago', tom: 'bom', Icone: FiCheckCircle },
  PENDENTE: { rotulo: 'Pendente', tom: 'alerta', Icone: FiClock },
  FALHOU: { rotulo: 'Falhou', tom: 'critico', Icone: FiXCircle },
  ESTORNADO: { rotulo: 'Estornado', tom: 'neutro', Icone: FiPauseCircle },
}
const STATUS_TICKET: Record<string, { rotulo: string; tom: string; Icone: typeof FiCheckCircle }> = {
  ABERTO: { rotulo: 'Aberto', tom: 'alerta', Icone: FiAlertTriangle },
  EM_ANDAMENTO: { rotulo: 'Em andamento', tom: 'info', Icone: FiClock },
  RESOLVIDO: { rotulo: 'Resolvido', tom: 'bom', Icone: FiCheckCircle },
  FECHADO: { rotulo: 'Fechado', tom: 'neutro', Icone: FiXCircle },
}

function Selo({ mapa, status }: { mapa: typeof STATUS_CONTRATO; status: string }) {
  const s = mapa[status] ?? { rotulo: status, tom: 'neutro', Icone: FiPauseCircle }
  return (
    <span className={`${ui.selo} ${ui[`selo_${s.tom}`]}`}>
      <s.Icone size={12} aria-hidden /> {s.rotulo}
    </span>
  )
}

export const SeloContrato = ({ status }: { status: string }) => <Selo mapa={STATUS_CONTRATO} status={status} />
export const SeloPagamento = ({ status }: { status: string }) => <Selo mapa={STATUS_PAGAMENTO} status={status} />
export const SeloTicket = ({ status }: { status: string }) => <Selo mapa={STATUS_TICKET} status={status} />
export const ROTULO_STATUS_CONTRATO = Object.fromEntries(Object.entries(STATUS_CONTRATO).map(([k, v]) => [k, v.rotulo]))
export const ROTULO_STATUS_TICKET = Object.fromEntries(Object.entries(STATUS_TICKET).map(([k, v]) => [k, v.rotulo]))

// Filtro em "chips" (um clique) — usado no lugar de selects nas listas.
export function Chips<T extends string>({ opcoes, valor, onChange }: {
  opcoes: { id: T; rotulo: string; contagem?: number }[]
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <div className={ui.chips} role="tablist">
      {opcoes.map(o => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={valor === o.id}
          className={`${ui.chip} ${valor === o.id ? ui.chipAtivo : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.rotulo}
          {o.contagem != null && <span className={ui.chipContagem}>{o.contagem}</span>}
        </button>
      ))}
    </div>
  )
}

// Abas da página (troca de seção sem sair da tela) — o estado vai na URL
// (?aba=) pelo chamador, assim o link pra uma aba específica funciona.
export function Abas<T extends string>({ abas, ativa, onChange }: {
  abas: { id: T; rotulo: string; badge?: number }[]
  ativa: T
  onChange: (v: T) => void
}) {
  return (
    <nav className={ui.abas} role="tablist">
      {abas.map(a => (
        <button
          key={a.id}
          type="button"
          role="tab"
          aria-selected={ativa === a.id}
          className={`${ui.aba} ${ativa === a.id ? ui.abaAtiva : ''}`}
          onClick={() => onChange(a.id)}
        >
          {a.rotulo}
          {!!a.badge && <span className={ui.abaBadge}>{a.badge}</span>}
        </button>
      ))}
    </nav>
  )
}

export { ui }
