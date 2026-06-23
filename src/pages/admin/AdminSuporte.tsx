import { useEffect, useState, useRef } from 'react'
import { billingApi, type Ticket, type MensagemTicket } from '../../api/billingApi'
import styles from './AdminSuporte.module.css'

const STATUS_LABEL: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em andamento', RESOLVIDO: 'Resolvido', FECHADO: 'Fechado',
}
const STATUS_CLS: Record<string, string> = {
  ABERTO: styles.sAberto, EM_ANDAMENTO: styles.sAndamento,
  RESOLVIDO: styles.sResolvido, FECHADO: styles.sFechado,
}
const PRIO_LABEL: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica',
}
const PRIO_CLS: Record<string, string> = {
  BAIXA: styles.pBaixa, MEDIA: styles.pMedia, ALTA: styles.pAlta, CRITICA: styles.pCritica,
}

function fmtData(s: string) {
  return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminSuporte() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketAtivo, setTicketAtivo] = useState<Ticket | null>(null)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novaPrio, setNovaPrio] = useState('MEDIA')
  const [criando, setCriando] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const mensagensRef = useRef<HTMLDivElement>(null)

  const carregar = async () => {
    const r = await billingApi.meusTickets()
    setTickets(r.data)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (mensagensRef.current) {
      mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight
    }
  }, [ticketAtivo?.mensagens])

  const abrirTicket = async (t: Ticket) => {
    const r = await billingApi.buscarTicket(t.id)
    setTicketAtivo(r.data)
  }

  const criarTicket = async () => {
    if (!novoTitulo.trim() || !novaDesc.trim()) return
    setCriando(true)
    try {
      await billingApi.criarTicket({ titulo: novoTitulo, descricao: novaDesc, prioridade: novaPrio })
      setNovoTitulo(''); setNovaDesc(''); setNovaPrio('MEDIA')
      setShowForm(false)
      await carregar()
    } finally {
      setCriando(false)
    }
  }

  const enviarMensagem = async () => {
    if (!ticketAtivo || !novaMensagem.trim()) return
    setEnviando(true)
    try {
      await billingApi.adicionarMensagem(ticketAtivo.id, novaMensagem)
      setNovaMensagem('')
      const r = await billingApi.buscarTicket(ticketAtivo.id)
      setTicketAtivo(r.data)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Suporte</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancelar' : '+ Abrir ticket'}
        </button>
      </div>

      {/* Formulário novo ticket */}
      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Novo ticket</h2>
          <div className={styles.formRow}>
            <label className={styles.label}>Assunto</label>
            <input
              className={styles.input}
              value={novoTitulo}
              onChange={e => setNovoTitulo(e.target.value)}
              placeholder="Descreva brevemente o problema"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Descrição</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={novaDesc}
              onChange={e => setNovaDesc(e.target.value)}
              placeholder="Detalhe o problema, passos para reproduzir, etc."
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Prioridade</label>
            <select className={styles.input} value={novaPrio} onChange={e => setNovaPrio(e.target.value)}>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <button className="btn btn-primary" onClick={criarTicket} disabled={criando || !novoTitulo.trim() || !novaDesc.trim()}>
              {criando ? 'Abrindo...' : 'Abrir ticket'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        {/* Lista de tickets */}
        <div className={styles.lista}>
          {loading ? (
            <p className={styles.empty}>Carregando...</p>
          ) : tickets.length === 0 ? (
            <div className={styles.listaVazia}>
              <span>🎫</span>
              <p>Nenhum ticket aberto.</p>
              <p>Clique em "Abrir ticket" para solicitar suporte.</p>
            </div>
          ) : (
            tickets.map(t => (
              <button
                key={t.id}
                className={`${styles.ticketItem} ${ticketAtivo?.id === t.id ? styles.ticketItemAtivo : ''}`}
                onClick={() => abrirTicket(t)}
              >
                <div className={styles.ticketItemHeader}>
                  <span className={styles.ticketItemId}>#{t.id}</span>
                  <span className={`${styles.badge} ${STATUS_CLS[t.status] ?? ''}`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <p className={styles.ticketItemTitulo}>{t.titulo}</p>
                <div className={styles.ticketItemMeta}>
                  <span className={`${styles.prioBadge} ${PRIO_CLS[t.prioridade] ?? ''}`}>
                    {PRIO_LABEL[t.prioridade] ?? t.prioridade}
                  </span>
                  <span className={styles.ticketItemData}>{fmtData(t.createdAt)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detalhe do ticket */}
        {ticketAtivo ? (
          <div className={styles.detalhe}>
            <div className={styles.detalheHeader}>
              <div>
                <p className={styles.detalheId}>Ticket #{ticketAtivo.id}</p>
                <h2 className={styles.detalheTitulo}>{ticketAtivo.titulo}</h2>
              </div>
              <div className={styles.detalheBadges}>
                <span className={`${styles.badge} ${STATUS_CLS[ticketAtivo.status] ?? ''}`}>
                  {STATUS_LABEL[ticketAtivo.status] ?? ticketAtivo.status}
                </span>
                <span className={`${styles.prioBadge} ${PRIO_CLS[ticketAtivo.prioridade] ?? ''}`}>
                  {PRIO_LABEL[ticketAtivo.prioridade] ?? ticketAtivo.prioridade}
                </span>
              </div>
            </div>

            {/* Descrição original */}
            <div className={styles.descricao}>
              <p className={styles.descricaoLabel}>Descrição</p>
              <p className={styles.descricaoTexto}>{ticketAtivo.descricao}</p>
            </div>

            {/* Mensagens */}
            <div className={styles.mensagensWrap} ref={mensagensRef}>
              {(ticketAtivo.mensagens ?? []).length === 0 ? (
                <p className={styles.semMensagens}>Nenhuma resposta ainda. Aguarde o contato do suporte.</p>
              ) : (
                (ticketAtivo.mensagens ?? []).map((m: MensagemTicket) => (
                  <div
                    key={m.id}
                    className={`${styles.mensagem} ${m.remetenteTipo === 'CLIENTE' ? styles.mensagemCliente : styles.mensagemSuporte}`}
                  >
                    <div className={styles.mensagemHeader}>
                      <span className={styles.mensagemRemetente}>{m.remetenteNome}</span>
                      <span className={styles.mensagemData}>{fmtData(m.createdAt)}</span>
                    </div>
                    <p className={styles.mensagemTexto}>{m.mensagem}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input de resposta */}
            {ticketAtivo.status !== 'FECHADO' && ticketAtivo.status !== 'RESOLVIDO' && (
              <div className={styles.replyWrap}>
                <textarea
                  className={styles.replyInput}
                  rows={3}
                  placeholder="Adicione uma mensagem..."
                  value={novaMensagem}
                  onChange={e => setNovaMensagem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviarMensagem() }}
                />
                <button
                  className="btn btn-primary"
                  onClick={enviarMensagem}
                  disabled={enviando || !novaMensagem.trim()}
                >
                  {enviando ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            )}
            {(ticketAtivo.status === 'RESOLVIDO' || ticketAtivo.status === 'FECHADO') && (
              <p className={styles.ticketFechado}>Este ticket está {STATUS_LABEL[ticketAtivo.status].toLowerCase()} e não aceita novas mensagens.</p>
            )}
          </div>
        ) : (
          <div className={styles.semSelecao}>
            <span>💬</span>
            <p>Selecione um ticket para ver os detalhes</p>
          </div>
        )}
      </div>
    </div>
  )
}
