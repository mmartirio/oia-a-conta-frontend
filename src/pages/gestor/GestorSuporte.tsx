import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiMessageCircle } from 'react-icons/fi'
import type { Ticket } from '../../api/billingApi'
import { gestorApi } from '../../api/gestorApi'
import { GestorWhatsapp } from './GestorWhatsapp'
import {
  Abas, Chips, PageHeader, ROTULO_STATUS_TICKET, SeloTicket, Secao, Vazio, data, ui, useNomesEmpresas,
} from './painelUi'

// Tickets + WhatsApp de suporte numa tela só (antes eram dois itens de menu).
type Aba = 'tickets' | 'whatsapp'
type FiltroTicket = 'ATIVOS' | 'TODOS' | Ticket['status']

const PESO_PRIORIDADE: Record<Ticket['prioridade'], number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
const ROTULO_PRIORIDADE: Record<Ticket['prioridade'], string> = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' }

export function GestorSuporte() {
  const navigate = useNavigate()
  const nomeEmpresa = useNomesEmpresas()
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'tickets'
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [filtro, setFiltro] = useState<FiltroTicket>('ATIVOS')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    gestorApi.todosTickets().then(r => setTickets(r.data.content)).catch(() => setTickets([]))
  }, [])

  const solicitante = (t: Ticket) => t.origem === 'WHATSAPP'
    ? (t.whatsappNome || t.whatsappTelefone || 'Contato do WhatsApp')
    : t.restauranteId != null ? nomeEmpresa(t.restauranteId) : (t.restauranteNome || '—')

  const contagem = useMemo(() => {
    const c: Record<string, number> = {}
    ;(tickets ?? []).forEach(t => { c[t.status] = (c[t.status] ?? 0) + 1 })
    return c
  }, [tickets])
  const ativos = (contagem.ABERTO ?? 0) + (contagem.EM_ANDAMENTO ?? 0)

  const termo = busca.trim().toLowerCase()
  const visiveis = (tickets ?? [])
    .filter(t => filtro === 'TODOS' || (filtro === 'ATIVOS' ? (t.status === 'ABERTO' || t.status === 'EM_ANDAMENTO') : t.status === filtro))
    .filter(t => !termo || t.titulo.toLowerCase().includes(termo) || solicitante(t).toLowerCase().includes(termo)
      || String(t.id) === termo)
    // Abertos primeiro, por prioridade; depois os mais recentes.
    .sort((a, b) => {
      const ativoA = a.status === 'ABERTO' || a.status === 'EM_ANDAMENTO' ? 0 : 1
      const ativoB = b.status === 'ABERTO' || b.status === 'EM_ANDAMENTO' ? 0 : 1
      return ativoA - ativoB || PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]
        || new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    })

  return (
    <div>
      <PageHeader titulo="Suporte" subtitulo="Chamados dos restaurantes, abertos pelo painel ou pelo WhatsApp de suporte." />

      <Abas
        ativa={aba}
        onChange={a => setParams(a === 'tickets' ? {} : { aba: a }, { replace: true })}
        abas={[
          { id: 'tickets', rotulo: 'Tickets', badge: ativos },
          { id: 'whatsapp', rotulo: 'WhatsApp de suporte' },
        ]}
      />

      {aba === 'tickets' && (
        <>
          <div className={ui.filtros}>
            <input className={ui.busca} placeholder="Buscar por título, empresa ou contato..." value={busca}
              onChange={e => setBusca(e.target.value)} />
            <Chips
              valor={filtro}
              onChange={setFiltro}
              opcoes={[
                { id: 'ATIVOS' as FiltroTicket, rotulo: 'Em aberto', contagem: ativos },
                ...(['RESOLVIDO', 'FECHADO'] as const).map(s => ({ id: s as FiltroTicket, rotulo: ROTULO_STATUS_TICKET[s], contagem: contagem[s] ?? 0 })),
                { id: 'TODOS' as FiltroTicket, rotulo: 'Todos', contagem: tickets?.length ?? 0 },
              ]}
            />
          </div>

          <Secao semPadding>
            {tickets === null ? <Vazio>Carregando...</Vazio> : visiveis.length === 0 ? (
              <Vazio>{filtro === 'ATIVOS' ? 'Nenhum chamado em aberto. 🎉' : 'Nenhum ticket encontrado.'}</Vazio>
            ) : (
              <ul className={ui.lista}>
                {visiveis.map(t => (
                  <li key={t.id} className={ui.listaItem} onClick={() => navigate(`/gestor/suporte/${t.id}`)}>
                    <div className={ui.listaPrincipal}>
                      <span className={ui.listaTitulo}>{t.titulo}</span>
                      <span className={ui.listaSub}>
                        {t.origem === 'WHATSAPP' && <><FiMessageCircle size={12} aria-label="via WhatsApp" /> </>}
                        {solicitante(t)} · #{t.id} · {data(t.updatedAt || t.createdAt)} · prioridade {ROTULO_PRIORIDADE[t.prioridade].toLowerCase()}
                        {t.mensagens?.length ? ` · ${t.mensagens.length} mensagem(ns)` : ''}
                      </span>
                    </div>
                    <SeloTicket status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </>
      )}

      {aba === 'whatsapp' && <GestorWhatsapp embutido />}
    </div>
  )
}

// /gestor/tickets/:id (endereço antigo) → /gestor/suporte/:id
export function RedirectTicketAntigo() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/gestor/suporte/${id}`} replace />
}
