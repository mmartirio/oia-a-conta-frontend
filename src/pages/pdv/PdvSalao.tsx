import { useEffect, useState } from 'react'
import { pdvApi } from '../../api/pdvApi'
import type { Comanda, MetodoPagamento, RestauranteConfig } from '../../types'
import styles from './PdvSalao.module.css'

const METODOS: { value: MetodoPagamento; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Débito' },
]

export function PdvSalao() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [config, setConfig] = useState<RestauranteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selecionada, setSelecionada] = useState<Comanda | null>(null)
  const [metodo, setMetodo] = useState<MetodoPagamento>('PIX')
  const [parcelas, setParcelas] = useState(1)
  const [confirmando, setConfirmando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        pdvApi.listarAguardandoPagamento(),
        pdvApi.getConfig(),
      ])
      setComandas(r1.data)
      setConfig(r2.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const abrirModal = (c: Comanda) => {
    setSelecionada(c)
    setMetodo('PIX')
    setParcelas(1)
    setCopiado(false)
  }

  const fecharModal = () => setSelecionada(null)

  const handleConfirmar = async () => {
    if (!selecionada) return
    setConfirmando(true)
    try {
      await pdvApi.confirmarPagamentoComanda(selecionada.id, {
        metodoPagamento: metodo,
        parcelas: metodo === 'CARTAO_CREDITO' ? parcelas : undefined,
      })
      setSelecionada(null)
      await carregar()
    } catch {
      alert('Erro ao confirmar pagamento')
    } finally {
      setConfirmando(false)
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
        <h1 className={styles.title}>Salão — Aguardando Pagamento</h1>
        <button className="btn btn-secondary" onClick={carregar}>Atualizar</button>
      </div>

      {comandas.length === 0 ? (
        <p className={styles.empty}>Nenhuma conta aguardando pagamento.</p>
      ) : (
        <div className={styles.lista}>
          {comandas.map(c => (
            <div key={c.id} className="card">
              <div className={styles.cardHeader}>
                <span className={styles.mesa}>Mesa {c.mesaNumero}</span>
                <span className={styles.garcon}>Garçom: {c.garconNome}</span>
                <span className={styles.cardTime}>{formatHora(c.criadoEm)}</span>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.total}>{formatMoeda(c.total)}</span>
                <button className="btn btn-primary" onClick={() => abrirModal(c)}>
                  Processar Pagamento
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selecionada && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Mesa {selecionada.mesaNumero}</h2>
            <div className={styles.modalTotal}>{formatMoeda(selecionada.total)}</div>

            <div className={styles.metodosGrid}>
              {METODOS.map(m => (
                <button
                  key={m.value}
                  className={`${styles.metodoBtn} ${metodo === m.value ? styles.metodoSelecionado : ''}`}
                  onClick={() => { setMetodo(m.value); setParcelas(1) }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {metodo === 'PIX' && (
              <div className={styles.pixBox}>
                <div className={styles.pixLabel}>Chave PIX do restaurante</div>
                <div className={styles.pixChave}>{config?.pixChave || 'Não configurada'}</div>
                {config?.pixChave && (
                  <button className={styles.pixCopy} onClick={copiarPix}>
                    {copiado ? 'Copiado!' : 'Copiar chave'}
                  </button>
                )}
              </div>
            )}

            {metodo === 'CARTAO_CREDITO' && (
              <div className={styles.parcelasWrap}>
                <label className={styles.parcelasLabel}>Parcelas</label>
                <select
                  className={styles.parcelasSelect}
                  value={parcelas}
                  onChange={e => setParcelas(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}x {formatMoeda(selecionada.total / n)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={fecharModal} disabled={confirmando}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleConfirmar} disabled={confirmando}>
                {confirmando ? 'Confirmando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
