import { useEffect, useRef, useState } from 'react'
import { FiMessageCircle, FiBell } from 'react-icons/fi'
import { whatsappAdminApi, type WhatsappStatus, type MensagemTemplate } from '../../api/whatsappAdminApi'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { Switch } from '../../components/ui/Switch'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { comprimirImagem } from '../../utils/imageProcessing'
import { AdminWhatsappConversas } from './AdminWhatsappConversas'
import styles from './AdminWhatsapp.module.css'
import btnStyles from '../../components/ui/Button.module.css'

// Mesmo teto de IMAGEM_MAX_CHARS em WhatsappConfigService (backend) — ~2MB de imagem original em base64.
const IMAGEM_MAX_CARACTERES = 2_800_000

type AbaWhatsapp = 'conexao' | 'mensagens' | 'conversas'

const ABAS: { id: AbaWhatsapp; label: string; permission: string }[] = [
  { id: 'conexao', label: 'Conexão', permission: 'WHATSAPP_CONEXAO' },
  { id: 'mensagens', label: 'Mensagens', permission: 'WHATSAPP_MENSAGENS' },
  { id: 'conversas', label: 'Conversas', permission: 'WHATSAPP_CONVERSAS' },
]

const ESTADO_LABEL: Record<string, string> = {
  CONECTADO: 'Conectado',
  DESCONECTADO: 'Desconectado',
  AGUARDANDO_SCAN: 'Aguardando scan',
  ERRO: 'Erro',
}

const GRUPO_ICON: Record<string, React.ElementType> = {
  chatbot: FiMessageCircle,
  notificacao: FiBell,
}

const GRUPO_LABELS: Record<string, string> = {
  chatbot: 'Conversa do Chatbot',
  notificacao: 'Notificações de Status do Pedido',
}

interface NovaMsg { label: string; texto: string }
const NOVA_VAZIA: NovaMsg = { label: '', texto: '' }

export function AdminWhatsapp() {
  const { user } = useAuth()
  const { conversasWhatsappNaoLidas } = useNotification()
  const abasPermitidas = user?.permissoes
    ? ABAS.filter(a => user.permissoes!.includes(a.permission))
    : ABAS
  const abasComBadge = abasPermitidas.map(a =>
    a.id === 'conversas' && conversasWhatsappNaoLidas > 0
      ? { ...a, badge: conversasWhatsappNaoLidas }
      : a
  )
  const [aba, setAba] = useState<AbaWhatsapp>(abasPermitidas[0]?.id ?? 'conexao')
  const [status, setStatus] = useState<WhatsappStatus | null>(null)
  const [mensagens, setMensagens] = useState<MensagemTemplate[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingConectar, setLoadingConectar] = useState(false)
  const [textos, setTextos] = useState<Record<string, string>>({})
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [salvoOk, setSalvoOk] = useState<Record<string, boolean>>({})
  const [salvandoOrdem, setSalvandoOrdem] = useState(false)
  const [novaMsg, setNovaMsg] = useState<Record<string, NovaMsg>>({})
  const [criando, setCriando] = useState<Record<string, boolean>>({})
  const [formAberto, setFormAberto] = useState<Record<string, boolean>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [confirmDesconectar, setConfirmDesconectar] = useState(false)
  const [confirmRestaurar, setConfirmRestaurar] = useState<MensagemTemplate | null>(null)
  const [confirmRemover, setConfirmRemover] = useState<MensagemTemplate | null>(null)
  const [chatbotAtivo, setChatbotAtivo] = useState(true)
  const [loadingChatbotStatus, setLoadingChatbotStatus] = useState(true)
  const [salvandoChatbotStatus, setSalvandoChatbotStatus] = useState(false)
  const [imagemCardapio, setImagemCardapio] = useState<string>('')
  const [salvandoImagemCardapio, setSalvandoImagemCardapio] = useState(false)
  const toast = useToast()

  const carregarStatus = async () => {
    try {
      const r = await whatsappAdminApi.status()
      setStatus(prev => {
        if (
          r.data.estado === 'AGUARDANDO_SCAN' &&
          !r.data.qrCodeBase64 &&
          prev?.estado === 'AGUARDANDO_SCAN' &&
          prev.qrCodeBase64
        ) {
          return { ...r.data, qrCodeBase64: prev.qrCodeBase64, qrCodeRaw: prev.qrCodeRaw }
        }
        return r.data
      })
      return r.data
    } finally {
      setLoadingStatus(false)
    }
  }

  const carregarMensagens = async () => {
    const r = await whatsappAdminApi.listarMensagens()
    setMensagens(r.data)
    const map: Record<string, string> = {}
    const mapLabels: Record<string, string> = {}
    r.data.forEach(m => { map[m.chave] = m.texto; mapLabels[m.chave] = m.label })
    setTextos(map)
    setLabels(mapLabels)
  }

  useEffect(() => {
    carregarStatus()
    carregarMensagens()
    whatsappAdminApi.chatbotStatus()
      .then(r => setChatbotAtivo(r.data.ativo))
      .catch(() => {})
      .finally(() => setLoadingChatbotStatus(false))
    whatsappAdminApi.cardapioImagem()
      .then(r => setImagemCardapio(r.data.imagemBase64))
      .catch(() => {})
  }, [])

  const handleUploadCardapioImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSalvandoImagemCardapio(true)
    try {
      const dataUri = await comprimirImagem(file, { maxCaracteres: IMAGEM_MAX_CARACTERES })
      await whatsappAdminApi.atualizarCardapioImagem(dataUri)
      setImagemCardapio(dataUri)
      toast.success('Imagem do cardápio atualizada')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Não foi possível salvar a imagem')
    } finally {
      setSalvandoImagemCardapio(false)
    }
  }

  const handleRemoverCardapioImagem = async () => {
    setSalvandoImagemCardapio(true)
    try {
      await whatsappAdminApi.atualizarCardapioImagem('')
      setImagemCardapio('')
    } finally {
      setSalvandoImagemCardapio(false)
    }
  }

  const handleToggleChatbot = async (ativo: boolean) => {
    setSalvandoChatbotStatus(true)
    try {
      const r = await whatsappAdminApi.atualizarChatbotStatus(ativo)
      setChatbotAtivo(r.data.ativo)
      toast.success(r.data.ativo ? 'Chatbot ativado' : 'Chatbot desativado')
    } catch {
      toast.error('Erro ao atualizar o status do chatbot')
    } finally {
      setSalvandoChatbotStatus(false)
    }
  }

  useEffect(() => {
    if (status?.estado === 'AGUARDANDO_SCAN') {
      pollRef.current = setInterval(async () => {
        const s = await carregarStatus()
        if (s.estado === 'CONECTADO') clearInterval(pollRef.current!)
      }, 4000)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [status?.estado])

  const handleConectar = async () => {
    setLoadingConectar(true)
    try {
      const r = await whatsappAdminApi.conectar()
      setStatus(r.data)
    } finally {
      setLoadingConectar(false)
    }
  }

  const handleDesconectar = async () => {
    await whatsappAdminApi.desconectar()
    await carregarStatus()
    setConfirmDesconectar(false)
  }

  const handleSalvar = async (chave: string) => {
    setSalvando(s => ({ ...s, [chave]: true }))
    try {
      await whatsappAdminApi.salvarMensagem(chave, textos[chave], labels[chave])
      await carregarMensagens()
      setSalvoOk(s => ({ ...s, [chave]: true }))
      setTimeout(() => setSalvoOk(s => ({ ...s, [chave]: false })), 2500)
    } finally {
      setSalvando(s => ({ ...s, [chave]: false }))
    }
  }

  const handleRestaurar = async () => {
    if (!confirmRestaurar) return
    await whatsappAdminApi.restaurar(confirmRestaurar.chave)
    await carregarMensagens()
    setConfirmRestaurar(null)
  }

  const handleRemover = async () => {
    if (!confirmRemover) return
    await whatsappAdminApi.remover(confirmRemover.chave)
    await carregarMensagens()
    setConfirmRemover(null)
  }

  const moverMensagem = async (chave: string, direcao: 'cima' | 'baixo', grupo: string) => {
    const grupoMsgs = mensagens.filter(m => m.grupo === grupo)
    const idx = grupoMsgs.findIndex(m => m.chave === chave)
    if (idx < 0) return
    if (direcao === 'cima' && idx === 0) return
    if (direcao === 'baixo' && idx === grupoMsgs.length - 1) return

    const outro = direcao === 'cima' ? grupoMsgs[idx - 1] : grupoMsgs[idx + 1]
    setSalvandoOrdem(true)
    try {
      await whatsappAdminApi.salvarOrdem([
        { chave, ordem: outro.ordem },
        { chave: outro.chave, ordem: grupoMsgs[idx].ordem },
      ])
      await carregarMensagens()
    } finally {
      setSalvandoOrdem(false)
    }
  }

  const handleCriar = async (grupo: string) => {
    const form = novaMsg[grupo] ?? NOVA_VAZIA
    if (!form.label.trim() || !form.texto.trim()) return
    setCriando(c => ({ ...c, [grupo]: true }))
    try {
      await whatsappAdminApi.criarMensagem(form.label.trim(), form.texto.trim(), grupo)
      await carregarMensagens()
      setNovaMsg(n => ({ ...n, [grupo]: NOVA_VAZIA }))
      setFormAberto(f => ({ ...f, [grupo]: false }))
    } finally {
      setCriando(c => ({ ...c, [grupo]: false }))
    }
  }

  const grupos = ['chatbot', 'notificacao']

  const estadoVariant = status
    ? status.estado === 'CONECTADO' ? 'success'
    : status.estado === 'AGUARDANDO_SCAN' ? 'warning'
    : status.estado === 'ERRO' ? 'danger'
    : 'default'
    : 'default'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>WhatsApp</h1>

      <Tabs tabs={abasComBadge} activeTab={aba} onChange={id => setAba(id as AbaWhatsapp)} />

      {aba === 'conexao' && (
      <section className={`${styles.card} ${styles.cardConexao}`}>
        <h2 className={styles.sectionTitle}>Conexão</h2>

        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Status:</span>
          {loadingStatus
            ? <Badge variant="default" size="md">Verificando...</Badge>
            : <Badge variant={estadoVariant as 'success' | 'warning' | 'danger' | 'default'} size="md">{ESTADO_LABEL[status?.estado ?? ''] ?? '—'}</Badge>
          }
        </div>

        {status?.estado === 'AGUARDANDO_SCAN' && status.qrCodeBase64 && (
          <div className={styles.qrBox}>
            <p className={styles.qrInstrucao}>
              Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo → Escaneie o QR code
            </p>
            <img className={styles.qrImage} src={status.qrCodeBase64} alt="QR Code WhatsApp" />
            <p className={styles.qrPolling}>Verificando conexão automaticamente a cada 4 segundos...</p>
          </div>
        )}

        {status?.estado === 'AGUARDANDO_SCAN' && !status.qrCodeBase64 && status.qrCodeRaw && (
          <div className={styles.qrBox}>
            <p className={styles.qrInstrucao}>Escaneie o código abaixo com o WhatsApp:</p>
            <pre className={styles.qrRaw}>{status.qrCodeRaw}</pre>
          </div>
        )}

        {status?.estado === 'ERRO' && status.mensagem && (
          <p className={styles.erroMsg}>Erro: {status.mensagem}</p>
        )}

        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Chatbot:</span>
          {!loadingChatbotStatus && (
            <Switch
              checked={chatbotAtivo}
              onChange={handleToggleChatbot}
              disabled={salvandoChatbotStatus}
              label={chatbotAtivo ? 'Ativo' : 'Desativado'}
            />
          )}
        </div>
        {!chatbotAtivo && (
          <p className={styles.sectionHint}>
            O bot não responde automaticamente, mas a conexão do WhatsApp continua ativa e as mensagens
            recebidas continuam aparecendo em Conversas — o atendimento fica manual até reativar.
          </p>
        )}

        <div className={styles.statusRow} style={{ alignItems: 'flex-start', marginTop: '1rem' }}>
          <span className={styles.statusLabel}>Cardápio numerado:</span>
          <div>
            <p className={styles.sectionHint} style={{ margin: '0 0 0.5rem' }}>
              Imagem enviada pelo bot quando o cliente não finaliza o pedido em 10 minutos. Desenhe a imagem
              com os produtos numerados e cadastre o mesmo número em cada produto no Cardápio, pra o bot
              entender quando o cliente responder só com os números.
            </p>
            {imagemCardapio && (
              <img src={imagemCardapio} alt="Cardápio numerado" style={{ maxWidth: 220, borderRadius: 8, display: 'block', marginBottom: '0.5rem' }} />
            )}
            <label className={`${btnStyles.btn} ${btnStyles.sm} ${btnStyles.outline}`} style={{ display: 'inline-flex', cursor: salvandoImagemCardapio ? 'not-allowed' : 'pointer', opacity: salvandoImagemCardapio ? 0.5 : 1 }}>
              {salvandoImagemCardapio ? 'Salvando...' : imagemCardapio ? 'Trocar imagem' : 'Enviar imagem'}
              <input type="file" accept="image/*" onChange={handleUploadCardapioImagem} disabled={salvandoImagemCardapio} style={{ display: 'none' }} />
            </label>
            {imagemCardapio && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoverCardapioImagem}
                disabled={salvandoImagemCardapio}
                style={{ marginLeft: '0.5rem' }}
              >
                Remover
              </Button>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {status?.estado !== 'CONECTADO' && (
            <button
              className="btn btn-primary"
              onClick={handleConectar}
              disabled={loadingConectar || status?.estado === 'AGUARDANDO_SCAN'}
            >
              {loadingConectar ? 'Gerando QR code...'
                : status?.estado === 'AGUARDANDO_SCAN' ? 'Aguardando scan...'
                : 'Conectar WhatsApp'}
            </button>
          )}
          {status?.estado === 'CONECTADO' && (
            <button className={styles.btnDesconectar} onClick={() => setConfirmDesconectar(true)}>
              Desconectar
            </button>
          )}
          {status?.estado !== 'AGUARDANDO_SCAN' && (
            <button className={styles.btnRefresh} onClick={() => { setLoadingStatus(true); carregarStatus() }}>
              Atualizar status
            </button>
          )}
        </div>
      </section>
      )}

      {/* ── Mensagens por grupo ── */}
      {aba === 'mensagens' && (
      <div className={styles.gruposCol}>
      {grupos.map(grupo => {
        const grupoMsgs = mensagens.filter(m => m.grupo === grupo)
        const aberto = !!formAberto[grupo]
        const form = novaMsg[grupo] ?? NOVA_VAZIA
        const GrupoIcon = GRUPO_ICON[grupo]
        return (
          <section key={grupo} className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {GrupoIcon && <GrupoIcon size={17} className={styles.grupoIcon} />}
                  {GRUPO_LABELS[grupo] ?? grupo}
                </h2>
                <p className={styles.sectionHint}>
                  {grupo === 'chatbot'
                    ? 'Mensagens enviadas durante a conversa. Use ▲▼ para reordenar.'
                    : 'Enviadas automaticamente quando o status do pedido muda.'}
                </p>
              </div>
              <button
                className={styles.btnAdicionar}
                onClick={() => setFormAberto(f => ({ ...f, [grupo]: !aberto }))}
              >
                {aberto ? '✕ Cancelar' : '+ Adicionar'}
              </button>
            </div>

            {/* ── Formulário inline para nova mensagem ── */}
            {aberto && (
              <div className={styles.novaForm}>
                <label className={styles.mensagemLabel}>1. Nome da mensagem (só pra você identificar):</label>
                <input
                  className={styles.novaInput}
                  placeholder="Ex: Promoção do dia"
                  value={form.label}
                  onChange={e => setNovaMsg(n => ({ ...n, [grupo]: { ...form, label: e.target.value } }))}
                />
                <label className={styles.mensagemLabel}>2. O bot envia:</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Texto da mensagem..."
                  rows={3}
                  value={form.texto}
                  onChange={e => setNovaMsg(n => ({ ...n, [grupo]: { ...form, texto: e.target.value } }))}
                />
                <button
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', fontSize: '0.8125rem' }}
                  onClick={() => handleCriar(grupo)}
                  disabled={criando[grupo] || !form.label.trim() || !form.texto.trim()}
                >
                  {criando[grupo] ? 'Salvando...' : 'Criar mensagem'}
                </button>
              </div>
            )}

            <div className={styles.mensagensList}>
              {grupoMsgs.map((m, idx) => (
                <div key={m.chave} className={styles.mensagemItem}>
                  <div className={styles.mensagemHeader}>
                    <div className={styles.mensagemHeaderLeft}>
                      <div className={styles.ordemBtns}>
                        <button
                          className={styles.btnOrdem}
                          onClick={() => moverMensagem(m.chave, 'cima', grupo)}
                          disabled={idx === 0 || salvandoOrdem}
                          title="Mover para cima"
                        >▲</button>
                        <button
                          className={styles.btnOrdem}
                          onClick={() => moverMensagem(m.chave, 'baixo', grupo)}
                          disabled={idx === grupoMsgs.length - 1 || salvandoOrdem}
                          title="Mover para baixo"
                        >▼</button>
                      </div>
                    </div>
                    <div className={styles.mensagemBadges}>
                      {!m.ativo && (
                        <span className={styles.badgeRemovida}>Removida</span>
                      )}
                      {m.personalizado && m.sistema && m.ativo && (
                        <span className={styles.badgeCustom}>Editada</span>
                      )}
                      {!m.sistema && (
                        <span className={styles.badgeNova}>Criada por você</span>
                      )}
                    </div>
                  </div>
                  <span className={styles.mensagemLabel}>Quando isso acontece:</span>
                  <input
                    className={styles.novaInput}
                    style={{ margin: '0.125rem 0 0.5rem' }}
                    value={labels[m.chave] ?? m.label}
                    onChange={e => setLabels(l => ({ ...l, [m.chave]: e.target.value }))}
                    disabled={!m.ativo}
                  />
                  {m.variavelHint && (
                    <p className={styles.variavelHint}>{m.variavelHint}</p>
                  )}
                  <span className={styles.mensagemLabel} style={{ display: 'block', marginTop: '0.375rem', marginBottom: '0.375rem' }}>O bot envia:</span>
                  <textarea
                    className={`${styles.textarea} ${!m.ativo ? styles.textareaDesativada : ''}`}
                    value={textos[m.chave] ?? ''}
                    onChange={e => setTextos(t => ({ ...t, [m.chave]: e.target.value }))}
                    rows={3}
                    disabled={!m.ativo}
                  />
                  {!m.ativo && (
                    <p className={styles.avisoRemovida}>
                      Esta mensagem está removida — o bot irá pular esta etapa. Restaure para reativá-la.
                    </p>
                  )}
                  <div className={styles.mensagemActions}>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
                      onClick={() => handleSalvar(m.chave)}
                      disabled={salvando[m.chave] || !m.ativo}
                    >
                      {salvando[m.chave] ? 'Salvando...' : 'Salvar'}
                    </button>
                    {m.sistema && (
                      <button
                        className={styles.btnRestaurar}
                        onClick={() => setConfirmRestaurar(m)}
                        title="Restaurar o texto original padrão"
                      >
                        Restaurar padrão
                      </button>
                    )}
                    <button
                      className={styles.btnRemover}
                      onClick={() => setConfirmRemover(m)}
                    >
                      Remover
                    </button>
                    {salvoOk[m.chave] && (
                      <span className={styles.salvoOk}>Salvo!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      </div>
      )}

      {aba === 'conversas' && <AdminWhatsappConversas />}

      <ConfirmDialog
        isOpen={confirmDesconectar}
        title="Desconectar WhatsApp"
        message="Deseja desconectar o WhatsApp? O bot ficará offline."
        confirmLabel="Desconectar"
        danger
        onConfirm={handleDesconectar}
        onCancel={() => setConfirmDesconectar(false)}
      />

      <ConfirmDialog
        isOpen={!!confirmRestaurar}
        title="Restaurar mensagem"
        message="Restaurar o texto padrão desta mensagem?"
        confirmLabel="Restaurar"
        onConfirm={handleRestaurar}
        onCancel={() => setConfirmRestaurar(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmRemover}
        title="Remover mensagem"
        message={confirmRemover?.sistema
          ? `Remover a mensagem "${confirmRemover?.label}" do chatbot? O bot irá pular esta etapa.`
          : `Remover a mensagem "${confirmRemover?.label}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        danger
        onConfirm={handleRemover}
        onCancel={() => setConfirmRemover(null)}
      />
    </div>
  )
}
