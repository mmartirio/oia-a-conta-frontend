import { useEffect, useRef, useState } from 'react'
import { FiUser, FiSend, FiMessageSquare, FiEdit2, FiCheck, FiX } from 'react-icons/fi'
import { whatsappConversaApi } from '../../api/whatsappConversaApi'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNotification } from '../../contexts/NotificationContext'
import { formatRelativeTime, formatDateTime } from '../../utils/formatters'
import type { ConversaResumo, MensagemWhatsapp } from '../../types'
import styles from './AdminWhatsappConversas.module.css'

interface WhatsappEvento {
  restauranteId: number
  telefone: string
  direcao: 'ENVIADA' | 'RECEBIDA'
  texto: string
  criadoEm: string
}

function truncar(texto: string, max = 48): string {
  if (texto.length <= max) return texto
  return `${texto.slice(0, max - 1).trimEnd()}…`
}

// Contatos "@lid" são um identificador de roteamento que o WhatsApp usa no
// lugar do número real (recurso de privacidade) — a API não expõe o número
// verdadeiro pra esse tipo de contato, então o chatbot pergunta direto ao
// cliente no primeiro contato e guarda em "numeroReal". Continuamos usando o
// "telefone" (lid) só pra rotear o envio das mensagens.
function ehContatoLid(telefone: string): boolean {
  return telefone.endsWith('@lid')
}

function telefoneExibicao(telefone: string, numeroReal?: string | null): string {
  if (numeroReal) return numeroReal
  return ehContatoLid(telefone) ? 'Aguardando número' : telefone
}

function nomeExibicao(telefone: string, clienteNome?: string | null, numeroReal?: string | null): string {
  if (clienteNome) return clienteNome
  return telefoneExibicao(telefone, numeroReal)
}

export function AdminWhatsappConversas() {
  const { user } = useAuth()
  const { subscribe, unsubscribe, connected } = useWebSocket()
  const toast = useToast()
  const { recarregarConversasWhatsappNaoLidas } = useNotification()

  const [conversas, setConversas] = useState<ConversaResumo[]>([])
  const [loadingConversas, setLoadingConversas] = useState(true)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const selecionadoRef = useRef<string | null>(null)

  const [mensagens, setMensagens] = useState<MensagemWhatsapp[]>([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [pagina, setPagina] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  useEffect(() => { selecionadoRef.current = selecionado }, [selecionado])

  useEffect(() => {
    whatsappConversaApi.listarConversas()
      .then(r => setConversas(r.data))
      .finally(() => setLoadingConversas(false))
  }, [])

  useEffect(() => {
    if (!connected || !user) return
    const sub = subscribe(`/topic/whatsapp/${user.restauranteId}`, (payload) => {
      const evento = payload as WhatsappEvento

      setConversas(prev => {
        const existente = prev.find(c => c.telefone === evento.telefone)
        const atualizada: ConversaResumo = {
          telefone: evento.telefone,
          clienteNome: existente?.clienteNome ?? null,
          numeroReal: existente?.numeroReal ?? null,
          ultimaMensagem: evento.texto,
          direcao: evento.direcao,
          criadoEm: evento.criadoEm,
          naoLida: evento.direcao === 'RECEBIDA' && selecionadoRef.current !== evento.telefone,
        }
        return [atualizada, ...prev.filter(c => c.telefone !== evento.telefone)]
      })

      if (selecionadoRef.current === evento.telefone) {
        setMensagens(prev => [...prev, {
          id: Date.now(),
          direcao: evento.direcao,
          texto: evento.texto,
          criadoEm: evento.criadoEm,
        }])
      }
    })
    return () => unsubscribe(sub)
  }, [connected, user])

  const selecionarConversa = async (telefone: string) => {
    if (telefone === selecionado) return
    setSelecionado(telefone)
    setMensagens([])
    setPagina(0)
    setTotalPages(0)
    setResposta('')
    setEditandoNome(false)
    setLoadingMensagens(true)
    setConversas(prev => prev.map(c => c.telefone === telefone ? { ...c, naoLida: false } : c))
    try {
      const r = await whatsappConversaApi.listarMensagens(telefone, 0)
      setMensagens([...r.data.content].reverse())
      setPagina(r.data.number)
      setTotalPages(r.data.totalPages)
      recarregarConversasWhatsappNaoLidas()
    } finally {
      setLoadingMensagens(false)
    }
  }

  const carregarMensagensAntigas = async () => {
    if (!selecionado) return
    const proximaPagina = pagina + 1
    setCarregandoMais(true)
    try {
      const r = await whatsappConversaApi.listarMensagens(selecionado, proximaPagina)
      setMensagens(prev => [...[...r.data.content].reverse(), ...prev])
      setPagina(r.data.number)
    } finally {
      setCarregandoMais(false)
    }
  }

  const handleEnviarResposta = async () => {
    const texto = resposta.trim()
    if (!texto || !selecionado) return
    setEnviando(true)
    try {
      await whatsappConversaApi.enviarMensagem(selecionado, texto)
      setResposta('')
    } catch {
      toast.error('Erro ao enviar a mensagem. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const iniciarEdicaoNome = () => {
    if (!selecionado) return
    setNovoNome(conversaSelecionada?.clienteNome ?? '')
    setEditandoNome(true)
  }

  const handleSalvarNome = async () => {
    if (!selecionado) return
    setSalvandoNome(true)
    try {
      await whatsappConversaApi.renomear(selecionado, novoNome.trim())
      const nomeSalvo = novoNome.trim() || null
      setConversas(prev => prev.map(c => c.telefone === selecionado ? { ...c, clienteNome: nomeSalvo } : c))
      setEditandoNome(false)
    } catch {
      toast.error('Erro ao salvar o nome. Tente novamente.')
    } finally {
      setSalvandoNome(false)
    }
  }

  const conversaSelecionada = conversas.find(c => c.telefone === selecionado)
  const temMensagensAntigas = pagina + 1 < totalPages

  return (
    <div className={styles.layout}>
      {/* ── Lista de conversas ── */}
      <section className={styles.listaCol}>
        {loadingConversas ? (
          <div className={styles.loadingBox}><Spinner /></div>
        ) : conversas.length === 0 ? (
          <EmptyState
            icon={FiMessageSquare}
            title="Nenhuma conversa ainda"
            description="As conversas com clientes pelo WhatsApp aparecerão aqui."
          />
        ) : (
          <ul className={styles.lista}>
            {conversas.map(c => {
              const ativa = c.telefone === selecionado
              return (
                <li key={c.telefone}>
                  <button
                    type="button"
                    className={`${styles.itemConversa} ${ativa ? styles.itemAtivo : ''}`}
                    onClick={() => selecionarConversa(c.telefone)}
                  >
                    <span className={`${styles.direcaoIcon} ${c.direcao === 'ENVIADA' ? styles.direcaoEnviada : styles.direcaoRecebida}`}>
                      {c.direcao === 'ENVIADA' ? <FiSend size={13} /> : <FiUser size={13} />}
                    </span>
                    <span className={styles.itemInfo}>
                      <span className={styles.itemNome}>{nomeExibicao(c.telefone, c.clienteNome, c.numeroReal)}</span>
                      <span className={styles.itemPreview}>{truncar(c.ultimaMensagem)}</span>
                    </span>
                    <span className={styles.itemHora}>{formatRelativeTime(c.criadoEm)}</span>
                    {c.naoLida && <span className={styles.itemNaoLidaDot} aria-label="Conversa não lida" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Thread da conversa selecionada ── */}
      <section className={styles.threadCol}>
        {!selecionado ? (
          <div className={styles.placeholder}>
            <FiMessageSquare size={32} className={styles.placeholderIcon} />
            <p>Selecione uma conversa para ver o histórico de mensagens.</p>
          </div>
        ) : (
          <>
            <div className={styles.threadHeader}>
              <FiUser size={16} className={styles.threadHeaderIcon} />
              {editandoNome ? (
                <div className={styles.editNomeBox}>
                  <input
                    type="text"
                    className={styles.editNomeInput}
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSalvarNome() }}
                    placeholder="Nome do cliente"
                    autoFocus
                    disabled={salvandoNome}
                  />
                  <button type="button" className={styles.editNomeBtn} onClick={handleSalvarNome} disabled={salvandoNome} aria-label="Salvar nome">
                    <FiCheck size={15} />
                  </button>
                  <button type="button" className={styles.editNomeBtn} onClick={() => setEditandoNome(false)} disabled={salvandoNome} aria-label="Cancelar">
                    <FiX size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <span className={styles.threadHeaderNome}>
                    {nomeExibicao(selecionado, conversaSelecionada?.clienteNome, conversaSelecionada?.numeroReal)}
                  </span>
                  {conversaSelecionada?.clienteNome && (
                    <span className={styles.threadHeaderTelefone}>
                      {telefoneExibicao(selecionado, conversaSelecionada?.numeroReal)}
                    </span>
                  )}
                  <button type="button" className={styles.editNomeTrigger} onClick={iniciarEdicaoNome} aria-label="Editar nome do cliente">
                    <FiEdit2 size={14} />
                  </button>
                </>
              )}
            </div>

            <div className={styles.threadBody}>
              {loadingMensagens ? (
                <div className={styles.loadingBox}><Spinner /></div>
              ) : (
                <>
                  {temMensagensAntigas && (
                    <button
                      type="button"
                      className={styles.btnCarregarMais}
                      onClick={carregarMensagensAntigas}
                      disabled={carregandoMais}
                    >
                      {carregandoMais ? 'Carregando...' : 'Carregar mensagens antigas'}
                    </button>
                  )}
                  {mensagens.map(m => (
                    <div
                      key={m.id}
                      className={`${styles.bolha} ${m.direcao === 'ENVIADA' ? styles.bolhaEnviada : styles.bolhaRecebida}`}
                    >
                      <p className={styles.bolhaTexto}>{m.texto}</p>
                      <span className={styles.bolhaHora} title={formatDateTime(m.criadoEm)}>
                        {formatRelativeTime(m.criadoEm)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className={styles.threadComposer}>
              <textarea
                className={styles.composerInput}
                placeholder="Escreva uma mensagem..."
                value={resposta}
                onChange={e => setResposta(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleEnviarResposta()
                  }
                }}
                rows={1}
                disabled={enviando}
              />
              <button
                type="button"
                className={styles.composerBtn}
                onClick={handleEnviarResposta}
                disabled={enviando || !resposta.trim()}
                aria-label="Enviar mensagem"
              >
                <FiSend size={16} />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
