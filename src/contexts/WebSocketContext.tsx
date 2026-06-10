import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Client, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from './AuthContext'

interface WebSocketContextValue {
  connected: boolean
  subscribe: (destination: string, callback: (msg: unknown) => void) => StompSubscription | null
  unsubscribe: (sub: StompSubscription | null) => void
  client: React.MutableRefObject<Client | null>
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const clientRef = useRef<Client | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) {
      clientRef.current?.deactivate()
      setConnected(false)
      return
    }

    const token = localStorage.getItem('token')
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_WS_URL ?? ''}/ws`) as unknown as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token ?? ''}` },
      reconnectDelay: 5000,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false)
    })

    client.activate()
    clientRef.current = client

    return () => { client.deactivate() }
  }, [user])

  const subscribe = (destination: string, callback: (msg: unknown) => void): StompSubscription | null => {
    if (!clientRef.current?.connected) return null
    return clientRef.current.subscribe(destination, (frame) => {
      try { callback(JSON.parse(frame.body)) }
      catch { callback(frame.body) }
    })
  }

  const unsubscribe = (sub: StompSubscription | null) => {
    sub?.unsubscribe()
  }

  return (
    <WebSocketContext.Provider value={{ connected, subscribe, unsubscribe, client: clientRef }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider')
  return ctx
}
