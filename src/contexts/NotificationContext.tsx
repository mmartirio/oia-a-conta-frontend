import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { StompSubscription } from '@stomp/stompjs'
import { useAuth } from './AuthContext'
import { useWebSocket } from './WebSocketContext'
import { playAlertaCozinha, playAlertaGarcon, playAlertaPedidoCliente, pararAlertaPedidoCliente, desbloquearAudioPedido, playNotificacaoWhatsapp, playNotificacaoFalada, type TipoAlertaPedido } from '../utils/audio'
import { entregaApi } from '../api/entregaApi'
import { configuracaoApi } from '../api/configuracaoApi'
import { whatsappConversaApi } from '../api/whatsappConversaApi'
import type { NotificacaoMessage, Entrega } from '../types'

export interface LocalNotification extends NotificacaoMessage {
  localId: number
}

interface WhatsappEvento {
  restauranteId: number
  telefone: string
  direcao: 'ENVIADA' | 'RECEBIDA'
  texto: string
  criadoEm: string
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
  atualizarPreferenciaNotificacaoFalada: (falada: boolean) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { subscribe, unsubscribe, connected } = useWebSocket()
  const [notifications, setNotifications] = useState<LocalNotification[]>([])
  const [pedidosPendentes, setPedidosPendentes] = useState<Entrega[]>([])
  const [conversasWhatsappNaoLidas, setConversasWhatsappNaoLidas] = useState(0)
  const [tipoAlertaPedido, setTipoAlertaPedido] = useState<TipoAlertaPedido>('SOM_1')
  const tipoAlertaPedidoRef = useRef<TipoAlertaPedido>(tipoAlertaPedido)
  const notificacaoWhatsappFaladaRef = useRef(false)
  const subsRef = useRef<(StompSubscription | null)[]>([])
  const alertaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoRejeitandoRef = useRef<Set<number>>(new Set())
  const ultimoAlertaTocadoEmRef = useRef(0)
  const checagemInicialNaoLidasRef = useRef(false)
  // Fica true quando o navegador bloqueia o play() por política de autoplay
  // (nenhum gesto do usuário ainda nesta navegação) — tocamos de verdade no
  // próximo clique/tecla, em vez de perder a notificação silenciosamente.
  const somWhatsappPendenteRef = useRef(false)

  // O alerta de pedido de cliente pode ser disparado por dois caminhos que às
  // vezes coincidem (mensagem STOMP recebida + a lista de pendentes mudando
  // de tamanho logo em seguida) — sem essa proteção, os dois tocam o som em
  // sequência, dobrado.
  const playAlertaPedidoClienteDedup = (tipo: TipoAlertaPedido) => {
    const agora = Date.now()
    if (agora - ultimoAlertaTocadoEmRef.current < 1000) return
    ultimoAlertaTocadoEmRef.current = agora
    playAlertaPedidoCliente(tipo)
  }

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
      .catch(err => console.error('Falha ao carregar pedidos aguardando aceite:', err))
  }

  // Respeita o toggle "notificação falada substitui a padrão" salvo em
  // Configurações — ver AdminConfiguracoes. Se o navegador bloquear por
  // autoplay (comum logo após um F5, antes de qualquer clique/tecla nesta
  // navegação), marca como pendente pra tocar de verdade no próximo gesto.
  const playNotificacaoWhatsappOuFalada = () => {
    const tocar = notificacaoWhatsappFaladaRef.current ? playNotificacaoFalada : playNotificacaoWhatsapp
    tocar().catch(() => { somWhatsappPendenteRef.current = true })
  }

  const atualizarPreferenciaNotificacaoFalada = (falada: boolean) => {
    notificacaoWhatsappFaladaRef.current = falada
  }

  const recarregarConversasWhatsappNaoLidas = () => {
    whatsappConversaApi.contarNaoLidas()
      .then(r => {
        setConversasWhatsappNaoLidas(r.data.quantidade)
        // Ao abrir a plataforma, se já existirem mensagens não lidas de
        // antes (não é uma mensagem nova chegando agora), avisa uma vez.
        if (!checagemInicialNaoLidasRef.current) {
          checagemInicialNaoLidasRef.current = true
          if (r.data.quantidade > 0) playNotificacaoWhatsappOuFalada()
        }
      })
      .catch(() => {})
  }

  const confirmarPedidoPendente = async (id: number) => {
    await entregaApi.confirmar(id)
    pararAlertaPedidoCliente()
    setPedidosPendentes(prev => prev.filter(e => e.id !== id))
  }

  const rejeitarPedidoPendente = async (id: number, motivo: string) => {
    await entregaApi.rejeitar(id, motivo)
    pararAlertaPedidoCliente()
    setPedidosPendentes(prev => prev.filter(e => e.id !== id))
  }

  useEffect(() => {
    tipoAlertaPedidoRef.current = tipoAlertaPedido
  }, [tipoAlertaPedido])

  // Navegadores só liberam áudio programático depois de alguma interação do
  // usuário na página — sem isso, o alerta de pedido pode falhar
  // silenciosamente na primeira vez (a Promise de audio.play() é rejeitada).
  // Destrava no primeiro clique/tecla/toque, antes que um pedido de verdade
  // precise tocar.
  useEffect(() => {
    const desbloquear = () => {
      desbloquearAudioPedido()
      if (somWhatsappPendenteRef.current) {
        somWhatsappPendenteRef.current = false
        playNotificacaoWhatsappOuFalada()
      }
      window.removeEventListener('pointerdown', desbloquear)
      window.removeEventListener('keydown', desbloquear)
    }
    window.addEventListener('pointerdown', desbloquear)
    window.addEventListener('keydown', desbloquear)
    return () => {
      window.removeEventListener('pointerdown', desbloquear)
      window.removeEventListener('keydown', desbloquear)
    }
  }, [])

  useEffect(() => {
    if (!user || !connected) return
    // NotificationProvider envolve todas as rotas, inclusive o cardápio
    // público (/cardapio/:slug) — se o dono do restaurante estiver logado
    // nessa mesma aba/navegador (token no localStorage) e abrir o link
    // público, não pode assinar as notificações sonoras por lá também.
    if (window.location.pathname.startsWith('/cardapio')) return

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
        .then(r => {
          setTipoAlertaPedido((r.data.alertaPedidoSom as TipoAlertaPedido) || 'SOM_1')
          notificacaoWhatsappFaladaRef.current = r.data.notificacaoWhatsappFalada ?? false
        })
        .catch(() => {})
      // Toca o alerta assim que a mensagem chega no tópico (igual ao fluxo da
      // cozinha) em vez de depender só do efeito abaixo — antes, o som só
      // disparava se o GET de carregarPedidosPendentes() tivesse sucesso E
      // mudasse pedidosPendentes.length; qualquer falha nessa chamada (ou um
      // pedido novo chegando enquanto a lista já tinha o mesmo tamanho) fazia
      // o som não tocar, mesmo com o pedido criado normalmente no backend.
      const subEntregas = subscribe(
        `/topic/entregas/${user.restauranteId}`,
        () => {
          playAlertaPedidoClienteDedup(tipoAlertaPedidoRef.current)
          carregarPedidosPendentes()
        }
      )
      subsRef.current.push(subEntregas)

      // Badge de "conversas novas" no WhatsApp — recarrega a contagem sempre
      // que uma mensagem (enviada ou recebida) chega nesse tópico, e toca a
      // notificação sonora só pra mensagem NOVA do cliente (RECEBIDA) — uma
      // mensagem que o próprio admin acabou de enviar não deve soar alerta.
      recarregarConversasWhatsappNaoLidas()
      const subWhatsapp = subscribe(
        `/topic/whatsapp/${user.restauranteId}`,
        (payload) => {
          const evento = payload as WhatsappEvento
          if (evento.direcao === 'RECEBIDA') playNotificacaoWhatsappOuFalada()
          recarregarConversasWhatsappNaoLidas()
        }
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

  // Toca (com dedup) sempre que a lista de pendentes muda de tamanho — cobre
  // tanto o caso de um pedido já estar pendente ao carregar a página (sem
  // passar pelo STOMP) quanto reforça o alerta da subscription acima; e
  // mantém a repetição a cada INTERVALO_ALERTA_PEDIDO_MS enquanto ainda
  // houver pedido pendente.
  useEffect(() => {
    if (alertaIntervalRef.current) {
      clearInterval(alertaIntervalRef.current)
      alertaIntervalRef.current = null
    }
    if (pedidosPendentes.length === 0) {
      pararAlertaPedidoCliente()
      return
    }
    playAlertaPedidoClienteDedup(tipoAlertaPedido)
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
      atualizarPreferenciaNotificacaoFalada,
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
