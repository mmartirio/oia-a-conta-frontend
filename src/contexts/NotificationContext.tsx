import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { StompSubscription } from '@stomp/stompjs'
import { useAuth } from './AuthContext'
import { useWebSocket } from './WebSocketContext'
import { playAlertaCozinha, playAlertaGarcon } from '../utils/audio'
import type { NotificacaoMessage } from '../types'

interface LocalNotification extends NotificacaoMessage {
  localId: number
}

interface NotificationContextValue {
  notifications: LocalNotification[]
  dismiss: (id: number) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { subscribe, unsubscribe, connected } = useWebSocket()
  const [notifications, setNotifications] = useState<LocalNotification[]>([])
  const subsRef = useRef<(StompSubscription | null)[]>([])

  const addNotification = (notif: NotificacaoMessage) => {
    setNotifications(prev => [{ ...notif, localId: Date.now() }, ...prev].slice(0, 50))
  }

  const dismiss = (localId: number) => {
    setNotifications(prev => prev.filter(n => n.localId !== localId))
  }

  const clearAll = () => setNotifications([])

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

  return (
    <NotificationContext.Provider value={{ notifications, dismiss, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}
