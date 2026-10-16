import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiMessageCircle } from 'react-icons/fi'
import { billingApi, type Ticket, type MensagemTicket } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../contexts/ToastContext'
import { PageHeader, ROTULO_STATUS_TICKET, SeloTicket, Secao, Vazio, ui, useNomesEmpresas } from './painelUi'
import styles from './Gestor.module.css'

const STATUS = ['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO'] as const

export function GestorTicketDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const nomeEmpresa = useNomesEmpresas()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [resposta, setResposta] = useState('')
  const [sending, setSending] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const carregar = () => {
    billingApi.buscarTicket(Number(id))
      .then(r => setTicket(r.data))
      .catch(() => setTicket(null))
      .finally(() => setLoading(false))
  }

  useEffect(carregar, [id])
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [ticket?.mensagens])

  const handleStatus = async (status: string) => {
    try {
      await billingApi.atualizarStatusTicket(Number(id), status)
      carregar()
    } catch {
      toast.error('Erro ao alterar o status')
    }
  }

  const handleResponder = async () => {
    if (!resposta.trim()) return
    setSending(true)
    try {
      await billingApi.adicionarMensagem(Number(id), resposta)
      setResposta('')
      // Responder um ticket aberto já o coloca em andamento.
      if (ticket?.status === 'ABERTO') await billingApi.atualizarStatusTicket(Number(id), 'EM_ANDAMENTO')
      carregar()
    } catch {
      toast.error('Erro ao enviar a resposta')
    } finally {
      setSending(false)
    }
  }

  const voltar = (
    <Button variant="ghost" size="sm" onClick={() => navigate('/gestor/suporte')} style={{ marginBottom: '0.75rem' }}>
      <FiArrowLeft size={15} /> Suporte
    </Button>
  )

  if (loading) return <>{voltar}<Vazio>Carregando...</Vazio></>
  if (!ticket) return <>{voltar}<Vazio>Ticket não encontrado.</Vazio></>

  const solicitante = ticket.origem === 'WHATSAPP'
    ? <><FiMessageCircle size={13} /> {ticket.whatsappNome || ticket.whatsappTelefone} (WhatsApp)</>
    : ticket.restauranteId != null
      ? <a href={`/gestor/empresas/${ticket.restauranteId}`} onClick={e => { e.preventDefault(); navigate(`/gestor/empresas/${ticket.restauranteId}`) }}>
          {nomeEmpresa(ticket.restauranteId)}
        </a>
      : (ticket.restauranteNome || '—')

  return (
    <div>
      {voltar}
      <PageHeader
        titulo={<>{ticket.titulo} <span className={ui.secundario}>#{ticket.id}</span></>}
        subtitulo={<><SeloTicket status={ticket.status} /> &nbsp;{solicitante} · aberto em {new Date(ticket.createdAt).toLocaleString('pt-BR')}</>}
      />

      <Secao titulo="Descrição" acoes={
        <div className={ui.chips}>
          {STATUS.map(s => (
            <button
              key={s}
              type="button"
              className={`${ui.chip} ${ticket.status === s ? ui.chipAtivo : ''}`}
              onClick={() => ticket.status !== s && handleStatus(s)}
            >
              {ROTULO_STATUS_TICKET[s]}
            </button>
          ))}
        </div>
      }>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.descricao || '—'}</p>
        {ticket.origem === 'WHATSAPP' && (
          <p className={ui.nota} style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            Chamado via WhatsApp — as respostas daqui são enviadas de volta para o contato.
          </p>
        )}
      </Secao>

      <Secao titulo="Conversa">
        <div ref={threadRef} className={styles.thread} style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {ticket.mensagens?.map((m: MensagemTicket) => (
            <div key={m.id} className={`${styles.message} ${m.remetenteTipo === 'SUPORTE' ? styles.messageSuporte : styles.messageCliente}`}>
              <div className={styles.messageHeader}>{m.remetenteNome} · {new Date(m.createdAt).toLocaleString('pt-BR')}</div>
              <div className={styles.messageText}>{m.mensagem}</div>
            </div>
          ))}
          {(!ticket.mensagens || ticket.mensagens.length === 0) && <Vazio>Nenhuma mensagem ainda.</Vazio>}
        </div>

        <div className={styles.replyBox}>
          <textarea
            className={styles.replyInput}
            placeholder="Digite sua resposta... (Ctrl+Enter envia)"
            value={resposta}
            onChange={e => setResposta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleResponder() }}
          />
          <Button loading={sending} onClick={handleResponder} disabled={!resposta.trim()}>Enviar</Button>
        </div>
      </Secao>
    </div>
  )
}
