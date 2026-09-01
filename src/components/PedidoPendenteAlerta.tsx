import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification, PRAZO_ACEITE_PEDIDO_MS } from '../contexts/NotificationContext'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '../utils/formatters'
import styles from './PedidoPendenteAlerta.module.css'

function formatarContagem(ms: number): string {
  const totalSegundos = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(totalSegundos / 60)
  const seg = totalSegundos % 60
  return `${min}:${String(seg).padStart(2, '0')}`
}

// Alerta global de pedido de cliente (WhatsApp/cardápio) aguardando aceite ou
// rejeição da cozinha. Não pode ser fechado clicando fora/Esc — só sai da
// tela quando o pedido é aceito ou recusado, de propósito (não é um modal
// dispensável qualquer, é uma decisão que precisa ser tomada).
export function PedidoPendenteAlerta() {
  const { user } = useAuth()
  const { pedidosPendentes, confirmarPedidoPendente, rejeitarPedidoPendente } = useNotification()
  const toast = useToast()
  const navigate = useNavigate()

  const [processando, setProcessando] = useState(false)
  const [rejeitando, setRejeitando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [restanteMs, setRestanteMs] = useState(PRAZO_ACEITE_PEDIDO_MS)

  // Mais antigo primeiro (a lista vem em ordem decrescente de criação)
  const pedido = pedidosPendentes[pedidosPendentes.length - 1]

  useEffect(() => {
    if (!pedido) return
    const prazoFinal = new Date(pedido.criadoEm).getTime() + PRAZO_ACEITE_PEDIDO_MS
    const atualizar = () => setRestanteMs(prazoFinal - Date.now())
    atualizar()
    const interval = setInterval(atualizar, 1000)
    return () => clearInterval(interval)
  }, [pedido?.id, pedido?.criadoEm])

  if (!user || (user.role !== 'ADMIN' && user.role !== 'COZINHA')) return null
  if (!pedido) return null

  // Esse alerta só aparece pra ADMIN ou COZINHA (ver o early-return acima) —
  // e COZINHA não tem rota de Delivery (só ADMIN tem — ver App.tsx). Um ADMIN
  // de Grupo restrito também pode não ter a permissão DELIVERY liberada.
  // Navegar sem checar isso mandava a cozinha pra tela de "Acesso Negado" em
  // vez de abrir o Delivery de verdade.
  const podeAcessarDelivery =
    user?.role === 'ADMIN' &&
    (!user?.permissoes || user.permissoes.includes('DELIVERY'))

  const handleConfirmar = async () => {
    setProcessando(true)
    try {
      await confirmarPedidoPendente(pedido.id)
      toast.success('Pedido aceito! Enviado para a cozinha.')
      if (podeAcessarDelivery) navigate('/delivery')
    } catch {
      toast.error('Erro ao aceitar o pedido. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const handleRejeitar = async () => {
    if (!motivo.trim()) return
    setProcessando(true)
    try {
      await rejeitarPedidoPendente(pedido.id, motivo.trim())
      toast.success('Pedido recusado. O cliente foi avisado.')
      setRejeitando(false)
      setMotivo('')
    } catch {
      toast.error('Erro ao recusar o pedido. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {pedidosPendentes.length > 1 && (
          <span className={styles.contador}>
            {pedidosPendentes.length} pedidos aguardando
          </span>
        )}

        <h2 className={styles.titulo}>🔔 Novo pedido!</h2>

        <p className={`${styles.contagem} ${restanteMs <= 30000 ? styles.contagemUrgente : ''}`}>
          Recusa automática em <strong>{formatarContagem(restanteMs)}</strong> se não for decidido
        </p>

        <div className={styles.resumo}>
          <p className={styles.cliente}>{pedido.clienteNome}</p>
          {pedido.clienteTelefone && <p className={styles.telefone}>{pedido.clienteTelefone}</p>}
          <p className={styles.endereco}>
            {pedido.enderecoRua}
            {pedido.enderecoNumero ? `, ${pedido.enderecoNumero}` : ''}
            {pedido.enderecoBairro ? ` — ${pedido.enderecoBairro}` : ''}
          </p>

          <ul className={styles.itens}>
            {pedido.itens.map(i => (
              <li key={i.id}>{i.quantidade}× {i.produtoNome}</li>
            ))}
          </ul>

          {pedido.observacao && <p className={styles.obs}>📝 {pedido.observacao}</p>}

          <div className={styles.rodape}>
            <span className={styles.pagamento}>{pedido.metodoPagamento}</span>
            <span className={styles.total}>{formatCurrency(pedido.total)}</span>
          </div>
        </div>

        {rejeitando ? (
          <div className={styles.rejeitarBox}>
            <label className={styles.rejeitarLabel}>Motivo da recusa (o cliente vai receber esta mensagem):</label>
            <textarea
              className={styles.rejeitarInput}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={2}
              autoFocus
              disabled={processando}
            />
            <div className={styles.rejeitarAcoes}>
              <button
                className={styles.btnVoltar}
                onClick={() => { setRejeitando(false); setMotivo('') }}
                disabled={processando}
              >
                Voltar
              </button>
              <button
                className={styles.btnConfirmarRecusa}
                onClick={handleRejeitar}
                disabled={processando || !motivo.trim()}
              >
                Confirmar recusa
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.acoes}>
            <button
              className={styles.btnRejeitar}
              onClick={() => setRejeitando(true)}
              disabled={processando}
              aria-label="Rejeitar pedido"
              title="Rejeitar pedido"
            >
              ✕
            </button>
            <button
              className={styles.btnAceitar}
              onClick={handleConfirmar}
              disabled={processando}
            >
              {processando ? 'Enviando...' : '✓ Aceitar pedido'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
