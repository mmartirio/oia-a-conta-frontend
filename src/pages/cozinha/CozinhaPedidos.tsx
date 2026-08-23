import { useEffect, useState, useCallback, useRef } from 'react'
import { FiFileText, FiCheck, FiX, FiPrinter } from 'react-icons/fi'
import { pedidoApi } from '../../api/pedidoApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
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

const COLUNA_CLASSE: Record<Coluna, string> = {
  ENVIADO: 'colunaInfo',
  PREPARANDO: 'colunaWarning',
  PRONTO: 'colunaSuccess'
}

const AUTO_IMPRIMIR_KEY = 'cozinha_auto_imprimir'

export function CozinhaPedidos() {
  const { user } = useAuth()
  const { subscribe, unsubscribe, connected } = useWebSocket()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState<Pedido | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [imprimindo, setImprimindo] = useState<Pedido | null>(null)
  const [autoImprimir, setAutoImprimir] = useState(() => localStorage.getItem(AUTO_IMPRIMIR_KEY) === '1')

  // Refs pra evitar closures presas no valor antigo dentro do load() (useCallback
  // com deps vazias) e pra não reimprimir um pedido "novo" a cada poll/refresh.
  const autoImprimirRef = useRef(autoImprimir)
  const pedidosVistosRef = useRef<Set<number>>(new Set())
  const primeiraCargaRef = useRef(true)

  useEffect(() => {
    autoImprimirRef.current = autoImprimir
    localStorage.setItem(AUTO_IMPRIMIR_KEY, autoImprimir ? '1' : '0')
  }, [autoImprimir])

  // Precisa do pequeno delay pra garantir que o React já renderizou o bloco
  // .reciboImpressao com os dados desse pedido antes do print() abrir o
  // diálogo (o state ainda não commitou no DOM no mesmo tick).
  const imprimirComanda = useCallback((p: Pedido) => {
    setImprimindo(p)
    setTimeout(() => window.print(), 50)
  }, [])

  const load = useCallback(() => {
    pedidoApi.listarAtivos().then(r => {
      const dados = r.data

      if (autoImprimirRef.current && !primeiraCargaRef.current) {
        const novos = dados.filter(p => p.status === 'ENVIADO' && !pedidosVistosRef.current.has(p.id))
        novos.forEach((p, i) => {
          setTimeout(() => imprimirComanda(p), i * 1000)
          // Com impressão automática ligada, a comanda já sai impressa na mão
          // do cozinheiro — então o pedido já entra direto em preparo, sem
          // precisar clicar "Iniciar Preparo" manualmente pra cada um.
          pedidoApi.marcarPreparando(p.id)
            .then(() => setPedidos(prev => prev.map(pp => pp.id === p.id ? { ...pp, status: 'PREPARANDO' } : pp)))
            .catch(() => {})
        })
      }
      dados.forEach(p => pedidosVistosRef.current.add(p.id))
      primeiraCargaRef.current = false

      setPedidos(dados)
    }).finally(() => setLoading(false))
  }, [imprimirComanda])

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

  const confirmarCancelamento = async () => {
    if (!cancelando) return
    setCancelLoading(true)
    try {
      await pedidoApi.cancelar(cancelando.id)
      setPedidos(prev => prev.filter(p => p.id !== cancelando.id))
      setCancelando(null)
    } finally {
      setCancelLoading(false)
    }
  }

  const pedidosPorStatus = (status: Coluna) => pedidos.filter(p => p.status === status)

  // Botão manual pra imprimir tudo que está esperando ir pra produção de uma
  // vez — útil com o auto-imprimir desligado, ou pra reimprimir a fila atual.
  const imprimirTodosNovos = () => {
    pedidosPorStatus('ENVIADO').forEach((p, i) => setTimeout(() => imprimirComanda(p), i * 1000))
  }

  if (loading) return <p className={styles.loading}>Carregando pedidos...</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cozinha</h1>
        <div className={styles.headerActions}>
          <button
            className={styles.btnImprimirTodos}
            onClick={imprimirTodosNovos}
            disabled={pedidosPorStatus('ENVIADO').length === 0}
            title="Imprimir manualmente todos os pedidos novos"
          >
            <FiPrinter size={14} /> Imprimir
          </button>
          <label className={styles.autoImprimirLabel}>
            <input
              type="checkbox"
              checked={autoImprimir}
              onChange={e => setAutoImprimir(e.target.checked)}
            />
            Imprimir automaticamente
          </label>
        </div>
      </div>

      <div className={styles.board}>
        {COLUNAS.map(col => (
          <div key={col.key} className={`${styles.coluna} ${styles[COLUNA_CLASSE[col.key]]}`}>
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
                      <button
                        className={styles.btnImprimir}
                        onClick={() => imprimirComanda(p)}
                        title="Imprimir comanda"
                      >
                        <FiPrinter size={14} />
                      </button>
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
                      <p className={styles.obs}><FiFileText size={13} /> {p.observacao}</p>
                    )}

                    <div className={styles.pedidoActions}>
                      {col.key === 'ENVIADO' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={updating === p.id}
                            onClick={() => moverParaPreparando(p)}
                            fullWidth
                          >
                            Iniciar Preparo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelando(p)}
                          >
                            <FiX size={14} /> Cancelar
                          </Button>
                        </>
                      )}
                      {col.key === 'PREPARANDO' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            loading={updating === p.id}
                            onClick={() => moverParaPronto(p)}
                            fullWidth
                          >
                            Marcar Pronto <FiCheck size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelando(p)}
                          >
                            <FiX size={14} /> Cancelar
                          </Button>
                        </>
                      )}
                      {col.key === 'PRONTO' && (
                        <p className={styles.aguardandoMsg}>
                          {p.entregaId ? 'Aguardando entregador' : 'Aguardando garçom'}
                        </p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!cancelando}
        title="Cancelar pedido"
        message={`Cancelar o pedido #${cancelando?.id}? Essa ação não pode ser desfeita.`}
        confirmLabel="Cancelar Pedido"
        danger
        loading={cancelLoading}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCancelando(null)}
      />

      {/* Comanda de cozinha — escondida na tela, só some a visibilidade em
          @media print (ver CozinhaPedidos.module.css), mesma técnica do
          recibo de caixa (PdvSalao) e da comanda de entrega (GarconDeliveryLista). */}
      {imprimindo && (
        <div className={styles.reciboImpressao}>
          <p className={styles.reciboCentro}>*** PEDIDO #{imprimindo.id} ***</p>
          <p>{imprimindo.entregaId ? 'DELIVERY' : imprimindo.mesaNumero != null ? `Mesa ${imprimindo.mesaNumero}` : ''}</p>
          {imprimindo.garconNome && <p>Garçom: {imprimindo.garconNome}</p>}
          <p>Horário: {formatTime(imprimindo.criadoEm)}</p>
          <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
          {imprimindo.itens.map(item => (
            <p key={item.id} className={styles.reciboItem}>
              {item.quantidade}x {item.produtoNome}
              {item.observacao && <span className={styles.reciboItemObs}> — {item.observacao}</span>}
            </p>
          ))}
          {imprimindo.observacao && (
            <>
              <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
              <p>Obs: {imprimindo.observacao}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
