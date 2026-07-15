import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { StompSubscription } from '@stomp/stompjs'
import { useAuth } from './AuthContext'
import { useWebSocket } from './WebSocketContext'
import { playAlertaCozinha, playAlertaGarcon, playAlertaPedidoCliente, type TipoAlertaPedido } from '../utils/audio'
import { entregaApi } from '../api/entregaApi'
import { configuracaoApi } from '../api/configuracaoApi'
import { whatsappConversaApi } from '../api/whatsappConversaApi'
import type { NotificacaoMessage, Entrega } from '../types'

interface LocalNotification extends NotificacaoMessage {
  localId: number
}

const INTERVALO_ALERTA_PEDIDO_MS = 8000
const VERIFICACAO_PRAZO_MS = 5000

// Prazo pra cozinha decidir um pedido de cliente antes dele ser recusado
// automaticamente — exportado pra o modal (PedidoPendenteAlerta) mostrar a
// contagem regressiva usando o mesmo valor.
export const PRAZO_ACEITE_PEDIDO_MS = 2 * 60 * 1000
const JUSTIFICATIVA_AUTO_REJEITAR = 'O restaurante não aceitou o pedido!'

interface NotificationContextValue {
  notifications: LocalNotification[]
  dismiss: (id: number) => void
  clearAll: () => void
  pedidosPendentes: Entrega[]
  confirmarPedidoPendente: (id: number) => Promise<void>
  rejeitarPedidoPendente: (id: number, motivo: string) => Promise<void>
  conversasWhatsappNaoLidas: number
  recarregarConversasWhatsappNaoLidas: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { subscribe, unsubscribe, connected } = useWebSocket()
  const [notifications, setNotifications] = useState<LocalNotification[]>([])
  const [pedidosPendentes, setPedidosPendentes] = useState<Entrega[]>([])
  const [conversasWhatsappNaoLidas, setConversasWhatsappNaoLidas] = useState(0)
  const [tipoAlertaPedido, setTipoAlertaPedido] = useState<TipoAlertaPedido>('SOM_1')
  const subsRef = useRef<(StompSubscription | null)[]>([])
  const alertaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoRejeitandoRef = useRef<Set<number>>(new Set())

  const addNotification = (notif: NotificacaoMessage) => {
    setNotifications(prev => [{ ...notif, localId: Date.now() }, ...prev].slice(0, 50))
  }

  const dismiss = (localId: number) => {
    setNotifications(prev => prev.filter(n => n.localId !== localId))
  }

  const clearAll = () => setNotifications([])

  const carregarPedidosPendentes = () => {
    entregaApi.listarAguardando(0)
      .then(r => setPedidosPendentes(r.data.content))
      .catch(() => {})
  }

  const recarregarConversasWhatsappNaoLidas = () => {
    whatsappConversaApi.contarNaoLidas()
      .then(r => setConversasWhatsappNaoLidas(r.data.quantidade))
      .catch(() => {})
  }

  const confirmarPedidoPendente = async (id: number) => {
    await entregaApi.confirmar(id)
    setPedidosPendentes(prev => prev.filter(e => e.id !== id))
  }

  const rejeitarPedidoPendente = async (id: number, motivo: string) => {
    await entregaApi.rejeitar(id, motivo)
    setPedidosPendentes(prev => prev.filter(e => e.id !== id))
  }

  useEffect(() => {
    if (!user || !connected) return

    subsRef.current.forEach(unsubscribe)
    subsRef.current = []

    if (user.role === 'COZINHA' || user.role === 'ADMIN') {
      const sub = subscribe(
        `/topic/cozinha/${user.restauranteId}`,
        (msg) => {
          addNotification(msg as NotificacaoMessage)
          playAlertaCozinha()
        }
      )
      subsRef.current.push(sub)

      // Pedidos de cliente (WhatsApp/cardápio) aguardando aceite/rejeição —
      // toca um alerta próprio, em loop, até a lista ficar vazia (ver efeito abaixo)
      carregarPedidosPendentes()
      configuracaoApi.get()
        .then(r => setTipoAlertaPedido((r.data.alertaPedidoSom as TipoAlertaPedido) || 'SOM_1'))
        .catch(() => {})
      const subEntregas = subscribe(
        `/topic/entregas/${user.restauranteId}`,
        () => carregarPedidosPendentes()
      )
      subsRef.current.push(subEntregas)

      // Badge de "conversas novas" no WhatsApp — recarrega a contagem sempre
      // que uma mensagem (enviada ou recebida) chega nesse tópico.
      recarregarConversasWhatsappNaoLidas()
      const subWhatsapp = subscribe(
        `/topic/whatsapp/${user.restauranteId}`,
        () => recarregarConversasWhatsappNaoLidas()
      )
      subsRef.current.push(subWhatsapp)
    }

    if (user.role === 'GARCON' || user.role === 'ADMIN') {
      const sub = subscribe(
        `/topic/garcon/${user.restauranteId}/${user.id}`,
        (msg) => {
          addNotification(msg as NotificacaoMessage)
          playAlertaGarcon()
        }
      )
      subsRef.current.push(sub)
    }

    return () => {
      subsRef.current.forEach(unsubscribe)
      subsRef.current = []
    }
  }, [user, connected])

  useEffect(() => {
    if (alertaIntervalRef.current) {
      clearInterval(alertaIntervalRef.current)
      alertaIntervalRef.current = null
    }
    if (pedidosPendentes.length === 0) return
    playAlertaPedidoCliente(tipoAlertaPedido)
    alertaIntervalRef.current = setInterval(() => playAlertaPedidoCliente(tipoAlertaPedido), INTERVALO_ALERTA_PEDIDO_MS)
    return () => {
      if (alertaIntervalRef.current) clearInterval(alertaIntervalRef.current)
    }
  }, [pedidosPendentes.length, tipoAlertaPedido])

  // Se a cozinha não decidir em PRAZO_ACEITE_PEDIDO_MS, recusa automaticamente
  // com uma justificativa padrão (o cliente recebe essa mensagem no WhatsApp).
  useEffect(() => {
    if (pedidosPendentes.length === 0) return
    const interval = setInterval(() => {
      const agora = Date.now()
      pedidosPendentes.forEach(p => {
        if (autoRejeitandoRef.current.has(p.id)) return
        const criadoEm = new Date(p.criadoEm).getTime()
        if (agora - criadoEm < PRAZO_ACEITE_PEDIDO_MS) return
        autoRejeitandoRef.current.add(p.id)
        entregaApi.rejeitar(p.id, JUSTIFICATIVA_AUTO_REJEITAR)
          .then(() => setPedidosPendentes(prev => prev.filter(e => e.id !== p.id)))
          .catch(() => {})
          .finally(() => autoRejeitandoRef.current.delete(p.id))
      })
    }, VERIFICACAO_PRAZO_MS)
    return () => clearInterval(interval)
  }, [pedidosPendentes])

  return (
    <NotificationContext.Provider value={{
      notifications, dismiss, clearAll,
      pedidosPendentes, confirmarPedidoPendente, rejeitarPedidoPendente,
      conversasWhatsappNaoLidas, recarregarConversasWhatsappNaoLidas,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}
