import { useEffect, useState, useCallback } from 'react'
import { pedidoApi } from '../../api/pedidoApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { formatTime } from '../../utils/formatters'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { useAuth } from '../../contexts/AuthContext'
import type { Pedido } from '../../types'
import styles from './CozinhaPedidos.module.css'

type Coluna = 'ENVIADO' | 'PREPARANDO' | 'PRONTO'

const COLUNAS: { key: Coluna; label: string; variant: 'info' | 'warning' | 'success' }[] = [
  { key: 'ENVIADO',    label: 'Novos',       variant: 'info' },
  { key: 'PREPARANDO', label: 'Preparando',  variant: 'warning' },
  { key: 'PRONTO',     label: 'Prontos',     variant: 'success' }
]

export function CozinhaPedidos() {
  const { user } = useAuth()
  const { subscribe, unsubscribe, connected } = useWebSocket()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  const load = useCallback(() => {
    pedidoApi.listarAtivos().then(r => setPedidos(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  useEffect(() => {
    if (!connected || !user) return
    const sub = subscribe(`/topic/cozinha/${user.restauranteId}`, () => load())
    return () => unsubscribe(sub)
  }, [connected, user, load])

  const moverParaPreparando = async (pedido: Pedido) => {
    setUpdating(pedido.id)
    try {
      await pedidoApi.marcarPreparando(pedido.id)
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: 'PREPARANDO' } : p))
    } finally {
      setUpdating(null)
    }
  }

  const moverParaPronto = async (pedido: Pedido) => {
    setUpdating(pedido.id)
    try {
      await pedidoApi.marcarPronto(pedido.id)
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: 'PRONTO' } : p))
    } finally {
      setUpdating(null)
    }
  }

  const pedidosPorStatus = (status: Coluna) => pedidos.filter(p => p.status === status)

  if (loading) return <p className={styles.loading}>Carregando pedidos...</p>

  return (
    <div className={styles.board}>
      {COLUNAS.map(col => (
        <div key={col.key} className={styles.coluna}>
          <div className={styles.colunaHeader}>
            <span className={styles.colunaTitle}>{col.label}</span>
            <Badge variant={col.variant} size="md">
              {pedidosPorStatus(col.key).length}
            </Badge>
          </div>

          <div className={styles.cards}>
            {pedidosPorStatus(col.key).length === 0 ? (
              <p className={styles.empty}>Nenhum pedido</p>
            ) : (
              pedidosPorStatus(col.key).map(p => (
                <Card key={p.id} className={styles.pedidoCard} padding="sm">
                  <div className={styles.pedidoTop}>
                    <span className={styles.pedidoId}>#{p.id}</span>
                    <span className={styles.pedidoTime}>{formatTime(p.criadoEm)}</span>
                  </div>

                  <ul className={styles.itens}>
                    {p.itens.map(item => (
                      <li key={item.id} className={styles.item}>
                        <span className={styles.itemQtd}>{item.quantidade}×</span>
                        <span className={styles.itemNome}>{item.produtoNome}</span>
                      </li>
                    ))}
                  </ul>

                  {p.observacao && (
                    <p className={styles.obs}>📝 {p.observacao}</p>
                  )}

                  <div className={styles.pedidoActions}>
                    {col.key === 'ENVIADO' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={updating === p.id}
                        onClick={() => moverParaPreparando(p)}
                        fullWidth
                      >
                        Iniciar Preparo
                      </Button>
                    )}
                    {col.key === 'PREPARANDO' && (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={updating === p.id}
                        onClick={() => moverParaPronto(p)}
                        fullWidth
                      >
                        Marcar Pronto ✓
                      </Button>
                    )}
                    {col.key === 'PRONTO' && (
                      <p className={styles.aguardandoMsg}>Aguardando garçom</p>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
