import { useEffect, useRef, useState } from 'react'
import { whatsappAdminApi, type WhatsappStatus, type MensagemTemplate } from '../../api/whatsappAdminApi'
import styles from './AdminWhatsapp.module.css'

const ESTADO_LABEL: Record<string, string> = {
  CONECTADO: 'Conectado',
  DESCONECTADO: 'Desconectado',
  AGUARDANDO_SCAN: 'Aguardando scan',
  ERRO: 'Erro',
}

const GRUPO_LABELS: Record<string, string> = {
  chatbot: '💬 Conversa do Chatbot',
  notificacao: '🔔 Notificações de Status do Pedido',
}

interface NovaMsg { label: string; texto: string }
const NOVA_VAZIA: NovaMsg = { label: '', texto: '' }

export function AdminWhatsapp() {
  const [status, setStatus] = useState<WhatsappStatus | null>(null)
  const [mensagens, setMensagens] = useState<MensagemTemplate[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingConectar, setLoadingConectar] = useState(false)
  const [textos, setTextos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [salvoOk, setSalvoOk] = useState<Record<string, boolean>>({})
  const [salvandoOrdem, setSalvandoOrdem] = useState(false)
  const [novaMsg, setNovaMsg] = useState<Record<string, NovaMsg>>({})
  const [criando, setCriando] = useState<Record<string, boolean>>({})
  const [formAberto, setFormAberto] = useState<Record<string, boolean>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    r.data.forEach(m => { map[m.chave] = m.texto })
    setTextos(map)
  }

  useEffect(() => {
    carregarStatus()
    carregarMensagens()
  }, [])

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
    if (!confirm('Deseja desconectar o WhatsApp? O bot ficará offline.')) return
    await whatsappAdminApi.desconectar()
    await carregarStatus()
  }

  const handleSalvar = async (chave: string) => {
    setSalvando(s => ({ ...s, [chave]: true }))
    try {
      await whatsappAdminApi.salvarMensagem(chave, textos[chave])
      await carregarMensagens()
      setSalvoOk(s => ({ ...s, [chave]: true }))
      setTimeout(() => setSalvoOk(s => ({ ...s, [chave]: false })), 2500)
    } finally {
      setSalvando(s => ({ ...s, [chave]: false }))
    }
  }

  const handleRestaurar = async (m: MensagemTemplate) => {
    if (!confirm('Restaurar o texto padrão desta mensagem?')) return
    await whatsappAdminApi.restaurar(m.chave)
    await carregarMensagens()
  }

  const handleRemover = async (m: MensagemTemplate) => {
    const msg = m.sistema
      ? `Remover a mensagem "${m.label}" do chatbot? O bot irá pular esta etapa.`
      : `Remover a mensagem "${m.label}"? Esta ação não pode ser desfeita.`
    if (!confirm(msg)) return
    await whatsappAdminApi.remover(m.chave)
    await carregarMensagens()
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

  const estadoClass = status
    ? status.estado === 'CONECTADO' ? styles.badgeConectado
    : status.estado === 'AGUARDANDO_SCAN' ? styles.badgeAguardando
    : status.estado === 'ERRO' ? styles.badgeErro
    : styles.badgeDesconectado
    : styles.badgeDesconectado

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>WhatsApp</h1>

      {/* ── Conexão ── */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Conexão</h2>

        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Status:</span>
          {loadingStatus
            ? <span className={styles.badgeDesconectado}>Verificando...</span>
            : <span className={estadoClass}>{ESTADO_LABEL[status?.estado ?? ''] ?? '—'}</span>
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
            <button className={styles.btnDesconectar} onClick={handleDesconectar}>
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

      {/* ── Mensagens por grupo ── */}
      {grupos.map(grupo => {
        const grupoMsgs = mensagens.filter(m => m.grupo === grupo)
        const aberto = !!formAberto[grupo]
        const form = novaMsg[grupo] ?? NOVA_VAZIA
        return (
          <section key={grupo} className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>{GRUPO_LABELS[grupo] ?? grupo}</h2>
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
                <input
                  className={styles.novaInput}
                  placeholder="Nome da mensagem (ex: Promoção do dia)"
                  value={form.label}
                  onChange={e => setNovaMsg(n => ({ ...n, [grupo]: { ...form, label: e.target.value } }))}
                />
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
                      <span className={styles.mensagemLabel}>{m.label}</span>
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
                  {m.variavelHint && (
                    <p className={styles.variavelHint}>{m.variavelHint}</p>
                  )}
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
                        onClick={() => handleRestaurar(m)}
                        title="Restaurar o texto original padrão"
                      >
                        Restaurar padrão
                      </button>
                    )}
                    <button
                      className={styles.btnRemover}
                      onClick={() => handleRemover(m)}
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
  )
}
