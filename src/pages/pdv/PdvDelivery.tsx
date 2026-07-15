import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { pdvApi } from '../../api/pdvApi'
import { useToast } from '../../contexts/ToastContext'
import { Pagination } from '../../components/ui/Pagination'
import type { Entrega, RestauranteConfig } from '../../types'
import styles from './PdvDelivery.module.css'
import buttonStyles from '../../components/ui/Button.module.css'

function metodoTag(m: string) {
  if (m === 'PIX') return styles.tagPix
  if (m === 'DINHEIRO') return styles.tagDinheiro
  return styles.tagCartao
}

function metodoLabel(m: string) {
  const map: Record<string, string> = {
    PIX: 'PIX',
    DINHEIRO: 'Dinheiro',
    CARTAO_CREDITO: 'Crédito',
    CARTAO_DEBITO: 'Débito',
  }
  return map[m] ?? m
}

export function PdvDelivery() {
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [config, setConfig] = useState<RestauranteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [pixEntrega, setPixEntrega] = useState<Entrega | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const toast = useToast()

  const carregar = async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        pdvApi.listarEntregasPendentes(page),
        pdvApi.getConfig(),
      ])
      setEntregas(r1.data.content)
      setTotalPages(r1.data.totalPages)
      setConfig(r2.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [page])

  const confirmar = async (id: number) => {
    setConfirmandoId(id)
    try {
      await pdvApi.confirmarPagamentoEntrega(id)
      await carregar()
    } catch {
      toast.error('Erro ao confirmar pagamento')
    } finally {
      setConfirmandoId(null)
    }
  }

  const copiarPix = () => {
    if (config?.pixChave) {
      navigator.clipboard.writeText(config.pixChave)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const formatHora = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const formatMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return <p style={{ padding: '2rem', color: 'var(--color-text-secondary)' }}>Carregando...</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Delivery — Aguardando Confirmação</h1>
        <div className={styles.headerActions}>
          <Link to="/pdv/delivery/novo" className={`${buttonStyles.btn} ${buttonStyles.primary} ${buttonStyles.md}`}>
            <FiPlus size={16} /> Novo Delivery
          </Link>
          <button className="btn btn-secondary" onClick={carregar}>Atualizar</button>
        </div>
      </div>

      {entregas.length === 0 ? (
        <p className={styles.empty}>Nenhum pagamento de delivery pendente.</p>
      ) : (
        <div className={styles.lista}>
          {entregas.map(e => (
            <div key={e.id} className="card">
              <div className={styles.cardHeader}>
                <span className={styles.clienteNome}>{e.clienteNome}</span>
                <span className={`${styles.metodoTag} ${metodoTag(e.metodoPagamento)}`}>
                  {metodoLabel(e.metodoPagamento)}
                </span>
                <span className={styles.cardTime}>{formatHora(e.criadoEm)}</span>
              </div>
              <div className={styles.endereco}>
                {e.enderecoRua}, {e.enderecoNumero}
                {e.enderecoBairro ? ` — ${e.enderecoBairro}` : ''}
                {` — ${e.enderecoCidade}`}
              </div>
              {e.entregadorNome && (
                <div className={styles.entregador}>Entregador: {e.entregadorNome}</div>
              )}
              <div className={styles.cardFooter}>
                <span className={styles.total}>{formatMoeda(e.total)}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {e.metodoPagamento === 'PIX' && (
                    <button className="btn btn-secondary" onClick={() => { setPixEntrega(e); setCopiado(false) }}>
                      Ver Chave PIX
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => confirmar(e.id)}
                    disabled={confirmandoId === e.id}
                  >
                    {confirmandoId === e.id ? 'Confirmando...' : 'Confirmar Recebimento'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {pixEntrega && (
        <div className={styles.overlay} onClick={() => setPixEntrega(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Chave PIX</h2>
            <p className={styles.modalSub}>Pedido de {pixEntrega.clienteNome} — {formatMoeda(pixEntrega.total)}</p>
            <div className={styles.pixBox}>
              <div className={styles.pixLabel}>Chave PIX do restaurante</div>
              <div className={styles.pixChave}>{config?.pixChave || 'Não configurada'}</div>
              {config?.pixChave && (
                <button className={styles.pixCopy} onClick={copiarPix}>
                  {copiado ? 'Copiado!' : 'Copiar chave'}
                </button>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setPixEntrega(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
