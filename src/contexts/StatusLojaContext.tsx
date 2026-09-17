import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { pausaApi, type PausaStatus } from '../api/pausaApi'

const INTERVALO_ATUALIZACAO_STATUS_MS = 60_000

interface StatusLojaContextValue {
  statusLoja: PausaStatus | null
  recarregarStatusLoja: () => void
}

const StatusLojaContext = createContext<StatusLojaContextValue | null>(null)

// Status efetivo da loja (fechamento manual + pausas + horário de
// funcionamento) — usado pelo badge do sidebar e pela tela de Configurações.
// Fica num contexto (em vez de cada tela buscar por conta própria) pra que
// uma ação que muda o status (reabrir/fechar, agendar pausa, salvar
// horários) atualize o sidebar na hora, sem esperar o próximo poll.
export function StatusLojaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [statusLoja, setStatusLoja] = useState<PausaStatus | null>(null)

  const recarregarStatusLoja = () => {
    if (!user?.restauranteId) return
    pausaApi.status(user.restauranteId).then(r => setStatusLoja(r.data)).catch(() => {})
  }

  useEffect(() => {
    if (!user?.restauranteId) return
    recarregarStatusLoja()
    const interval = setInterval(recarregarStatusLoja, INTERVALO_ATUALIZACAO_STATUS_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.restauranteId])

  return (
    <StatusLojaContext.Provider value={{ statusLoja, recarregarStatusLoja }}>
      {children}
    </StatusLojaContext.Provider>
  )
}

export function useStatusLoja(): StatusLojaContextValue {
  const ctx = useContext(StatusLojaContext)
  if (!ctx) throw new Error('useStatusLoja must be used within StatusLojaProvider')
  return ctx
}
