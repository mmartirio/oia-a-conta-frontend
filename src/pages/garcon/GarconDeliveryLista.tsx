import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { entregaApi } from '../../api/entregaApi'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatCurrency, formatDateTime } from '../../utils/formatters'
import type { Entrega } from '../../types'
import styles from './GarconDeliveryLista.module.css'

type StatusAtivo = 'AGUARDANDO' | 'ACEITA' | 'PRONTO_PARA_ENTREGA' | 'SAIU_PARA_ENTREGA'

const COLUNAS: { statuses: StatusAtivo[]; label: string; cor: string }[] = [
  { statuses: ['AGUARDANDO'],                                label: 'Novo Pedido', cor: '#6366f1' },
  { statuses: ['ACEITA'],                                    label: 'Produção',    cor: '#f59e0b' },
  { statuses: ['PRONTO_PARA_ENTREGA', 'SAIU_PARA_ENTREGA'], label: 'Entrega',     cor: '#22c55e' },
]

const ACOES: Record<StatusAtivo, { label: string; fn: (id: number) => Promise<unknown> }> = {
  AGUARDANDO:           { label: 'Aceitar',  fn: (id) => entregaApi.aceitar(id) },
  ACEITA:               { label: 'Pronto',   fn: (id) => entregaApi.prontoParaEntrega(id) },
  PRONTO_PARA_ENTREGA:  { label: 'Saiu',     fn: (id) => entregaApi.saiu(id) },
  SAIU_PARA_ENTREGA:    { label: 'Entregue', fn: (id) => entregaApi.entregar(id) },
}

export function GarconDeliveryLista() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const basePath  = location.pathname.startsWith('/admin') ? '/admin' : '/garcon'

  const [entregas,    setEntregas]    = useState<Entrega[]>([])
  const [loading,     setLoading]     = useState(true)
  const [atualizando, setAtualizando] = useState<number | null>(null)
  const [verEntregues, setVerEntregues] = useState(false)
  const prevIdsRef = useRef<Set<number>>(new Set())

  const load = useCallback(async () => {
    try {
      const r = await entregaApi.listar()
      setEntregas(r.data)
      const novosIds = new Set(
        r.data.filter((e: Entrega) => e.status === 'AGUARDANDO').map((e: Entrega) => e.id)
      )
      const temNovo = [...novosIds].some(id => !prevIdsRef.current.has(id))
      if (temNovo && prevIdsRef.current.size > 0) {
        document.title = '🔔 Novo pedido! — Delivery'
        setTimeout(() => { document.title = 'Delivery' }, 5000)
      }
      prevIdsRef.current = novosIds
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  const avancar = async (id: number, status: StatusAtivo) => {
    setAtualizando(id)
    try { await ACOES[status].fn(id); load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      alert(msg ?? 'Erro')
    } finally { setAtualizando(null) }
  }

  const cancelar = async (id: number) => {
    if (!confirm('Cancelar esta entrega?')) return
    setAtualizando(id)
    try { await entregaApi.cancelar(id); load() }
    catch { alert('Erro ao cancelar') }
    finally { setAtualizando(null) }
  }

  const ativas    = entregas.filter(e => e.status !== 'ENTREGUE' && e.status !== 'CANCELADA')
  const entregues = entregas.filter(e => e.status === 'ENTREGUE')
  const total     = ativas.reduce((s, e) => s + e.total, 0)

  if (loading) return <p style={{ padding: '2rem', color: 'var(--color-text-secondary)' }}>Carregando...</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Delivery</h1>
          <p className={styles.subtitle}>
            {ativas.length} ativo{ativas.length !== 1 ? 's' : ''} · {formatCurrency(total)} em aberto
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" size="sm" onClick={load}>Atualizar</Button>
          <Button onClick={() => navigate(`${basePath}/delivery/novo`)}>+ Nova Entrega</Button>
        </div>
      </div>

      <div className={styles.kanban}>
        {COLUNAS.map(col => {
          const cards = entregas.filter(e => col.statuses.includes(e.status as StatusAtivo))
          return (
            <div key={col.label} className={styles.coluna}>
              <div className={styles.colunaHeader} style={{ borderColor: col.cor }}>
                <span className={styles.colunaLabel} style={{ color: col.cor }}>{col.label}</span>
                <span className={styles.colunaBadge} style={{ background: col.cor }}>{cards.length}</span>
              </div>

              <div className={styles.cards}>
                {cards.length === 0 && (
                  <div className={styles.vazio}>Nenhum pedido</div>
                )}
                {cards.map(e => (
                  <div
                    key={e.id}
                    className={`${styles.card} ${e.origemWhatsapp ? styles.cardWpp : ''}`}
                    style={{ borderTopColor: col.cor }}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardId}>#{e.id}</span>
                      {e.origemWhatsapp && (
                        <span className={styles.wppBadge}>WhatsApp</span>
                      )}
                      <span className={styles.cardTime}>{formatDateTime(e.criadoEm)}</span>
                    </div>

                    <p className={styles.cardCliente}>{e.clienteNome}</p>
                    {e.clienteTelefone && (
                      <p className={styles.cardTel}>{e.clienteTelefone}</p>
                    )}

                    <p className={styles.cardEndereco}>
                      {e.enderecoRua}
                      {e.enderecoNumero ? `, ${e.enderecoNumero}` : ''}
                      {e.enderecoBairro ? ` — ${e.enderecoBairro}` : ''}
                      {e.enderecoCidade ? `, ${e.enderecoCidade}` : ''}
                    </p>

                    {e.entregadorNome && (
                      <p className={styles.cardEntregador}>🏍️ {e.entregadorNome}</p>
                    )}

                    <div className={styles.cardFooter}>
                      <span className={styles.cardTotal}>{formatCurrency(e.total)}</span>
                      <div className={styles.cardAcoes}>
                        <a
                          className={styles.mapsLink}
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            [e.enderecoRua, e.enderecoNumero, e.enderecoBairro, e.enderecoCidade]
                              .filter(Boolean).join(', ')
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir no Maps"
                        >
                          Maps
                        </a>
                        {ACOES[e.status as StatusAtivo] && (
                          <Button
                            size="sm"
                            loading={atualizando === e.id}
                            onClick={() => avancar(e.id, e.status as StatusAtivo)}
                          >
                            {ACOES[e.status as StatusAtivo].label}
                          </Button>
                        )}
                        <button
                          className={styles.btnCancelar}
                          onClick={() => cancelar(e.id)}
                          disabled={atualizando === e.id}
                          title="Cancelar entrega"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {entregues.length > 0 && (
        <div className={styles.entreguesSection}>
          <button
            className={styles.entreguesToggle}
            onClick={() => setVerEntregues(v => !v)}
          >
            {verEntregues ? '▲' : '▼'} Concluídas hoje ({entregues.length})
          </button>
          {verEntregues && (
            <div className={styles.entreguesList}>
              {entregues.map(e => (
                <div key={e.id} className={styles.entregueRow}>
                  <span className={styles.entregueId}>#{e.id}</span>
                  <span className={styles.entregueCliente}>{e.clienteNome}</span>
                  <span className={styles.entregueEndereco}>
                    {e.enderecoRua}{e.enderecoNumero ? `, ${e.enderecoNumero}` : ''}
                  </span>
                  <Badge variant="success" size="sm">Entregue</Badge>
                  <span className={styles.entregueTotal}>{formatCurrency(e.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
