import { useEffect, useRef, useState } from 'react'
import { whatsappPlataformaApi } from '../../api/whatsappPlataformaApi'
import type { WhatsappStatus } from '../../api/whatsappAdminApi'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Badge } from '../../components/ui/Badge'
import styles from './Gestor.module.css'
import whatsStyles from '../admin/AdminWhatsapp.module.css'

const ESTADO_LABEL: Record<string, string> = {
  CONECTADO: 'Conectado',
  DESCONECTADO: 'Desconectado',
  AGUARDANDO_SCAN: 'Aguardando scan',
  ERRO: 'Erro',
}

export function GestorWhatsapp() {
  const [status, setStatus] = useState<WhatsappStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingConectar, setLoadingConectar] = useState(false)
  const [confirmDesconectar, setConfirmDesconectar] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const carregarStatus = async () => {
    try {
      const r = await whatsappPlataformaApi.status()
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

  useEffect(() => { carregarStatus() }, [])

  useEffect(() => {
    if (status?.estado === 'AGUARDANDO_SCAN') {
      pollRef.current = setInterval(async () => {
        const s = await carregarStatus()
        if (s.estado === 'CONECTADO') clearInterval(pollRef.current!)
      }, 4000)
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [status?.estado])

  const handleConectar = async () => {
    setLoadingConectar(true)
    try {
      const r = await whatsappPlataformaApi.conectar()
      setStatus(r.data)
    } finally {
      setLoadingConectar(false)
    }
  }

  const handleDesconectar = async () => {
    await whatsappPlataformaApi.desconectar()
    await carregarStatus()
    setConfirmDesconectar(false)
  }

  const estadoVariant = status
    ? status.estado === 'CONECTADO' ? 'success'
    : status.estado === 'AGUARDANDO_SCAN' ? 'warning'
    : status.estado === 'ERRO' ? 'danger'
    : 'default'
    : 'default'

  return (
    <div>
      <h1 className={styles.pageTitle}>WhatsApp de Suporte</h1>
      <p className={styles.loading} style={{ marginTop: 0 }}>
        Número usado pra receber chamados dos administradores dos restaurantes — cada mensagem
        recebida aqui vira (ou atualiza) um ticket em <strong>Suporte</strong>, e a resposta dada
        por lá volta automaticamente pro mesmo contato no WhatsApp.
      </p>

      <section className={`${whatsStyles.card} ${whatsStyles.cardConexao}`}>
        <div className={whatsStyles.statusRow}>
          <span className={whatsStyles.statusLabel}>Status:</span>
          {loadingStatus
            ? <Badge variant="default" size="md">Verificando...</Badge>
            : <Badge variant={estadoVariant as 'success' | 'warning' | 'danger' | 'default'} size="md">{ESTADO_LABEL[status?.estado ?? ''] ?? '—'}</Badge>
          }
        </div>

        {status?.estado === 'AGUARDANDO_SCAN' && status.qrCodeBase64 && (
          <div className={whatsStyles.qrBox}>
            <p className={whatsStyles.qrInstrucao}>
              Abra o WhatsApp no celular (o número dedicado ao suporte) → Dispositivos conectados
              → Conectar dispositivo → Escaneie o QR code
            </p>
            <img className={whatsStyles.qrImage} src={status.qrCodeBase64} alt="QR Code WhatsApp" />
            <p className={whatsStyles.qrPolling}>Verificando conexão automaticamente a cada 4 segundos...</p>
          </div>
        )}

        {status?.estado === 'AGUARDANDO_SCAN' && !status.qrCodeBase64 && status.qrCodeRaw && (
          <div className={whatsStyles.qrBox}>
            <p className={whatsStyles.qrInstrucao}>Escaneie o código abaixo com o WhatsApp:</p>
            <pre className={whatsStyles.qrRaw}>{status.qrCodeRaw}</pre>
          </div>
        )}

        {status?.estado === 'ERRO' && status.mensagem && (
          <p className={whatsStyles.erroMsg}>Erro: {status.mensagem}</p>
        )}

        <div className={whatsStyles.actions}>
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
            <button className={whatsStyles.btnDesconectar} onClick={() => setConfirmDesconectar(true)}>
              Desconectar
            </button>
          )}
          {status?.estado !== 'AGUARDANDO_SCAN' && (
            <button className={whatsStyles.btnRefresh} onClick={() => { setLoadingStatus(true); carregarStatus() }}>
              Atualizar status
            </button>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmDesconectar}
        title="Desconectar WhatsApp"
        message="Deseja desconectar o WhatsApp de suporte? Novos chamados por esse número deixarão de ser recebidos."
        confirmLabel="Desconectar"
        danger
        onConfirm={handleDesconectar}
        onCancel={() => setConfirmDesconectar(false)}
      />
    </div>
  )
}
