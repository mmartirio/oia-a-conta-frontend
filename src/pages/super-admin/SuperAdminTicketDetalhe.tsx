import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { billingApi, type Ticket, type MensagemTicket } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import styles from './SuperAdmin.module.css'

export function SuperAdminTicketDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [resposta, setResposta] = useState('')
  const [sending, setSending] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const carregar = () => {
    billingApi.buscarTicket(Number(id))
      .then(r => setTicket(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(carregar, [id])
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [ticket?.mensagens])

  const handleStatus = async (status: string) => {
    await billingApi.atualizarStatusTicket(Number(id), status)
    carregar()
  }

  const handleResponder = async () => {
    if (!resposta.trim()) return
    setSending(true)
    try {
      await billingApi.adicionarMensagem(Number(id), resposta)
      setResposta('')
      carregar()
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className={styles.loading}>Carregando...</p>
  if (!ticket) return <p className={styles.loading}>Ticket não encontrado</p>

  return (
    <div>
      <div className={styles.toolbar}>
        <Button variant="ghost" onClick={() => navigate('/super-admin/tickets')}>← Voltar</Button>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Ticket #{ticket.id}</h1>
      </div>

      <div className={styles.metricCard} style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem' }}>{ticket.titulo}</h2>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>{ticket.descricao}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO'].map(s => (
              <Button key={s} size="sm" variant={ticket.status === s ? 'primary' : 'ghost'}
                onClick={() => handleStatus(s)}>
                {s.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Conversa</h2>
      <div ref={threadRef} className={styles.thread} style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
        {ticket.mensagens?.map((m: MensagemTicket) => (
          <div key={m.id} className={`${styles.message} ${m.remetenteTipo === 'SUPORTE' ? styles.messageSuporte : styles.messageCliente}`}>
            <div className={styles.messageHeader}>{m.remetenteNome} · {new Date(m.createdAt).toLocaleString('pt-BR')}</div>
            <div className={styles.messageText}>{m.mensagem}</div>
          </div>
        ))}
        {(!ticket.mensagens || ticket.mensagens.length === 0) && (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Nenhuma mensagem ainda</p>
        )}
      </div>

      <div className={styles.replyBox}>
        <textarea
          className={styles.replyInput}
          placeholder="Digite sua resposta..."
          value={resposta}
          onChange={e => setResposta(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleResponder() }}
        />
        <Button loading={sending} onClick={handleResponder}>Enviar</Button>
      </div>
    </div>
  )
}
