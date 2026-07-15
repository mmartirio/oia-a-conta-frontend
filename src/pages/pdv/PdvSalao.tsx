import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiLock, FiUnlock } from 'react-icons/fi'
import { pdvApi } from '../../api/pdvApi'
import { caixaApi, type SessaoCaixa } from '../../api/caixaApi'
import { useToast } from '../../contexts/ToastContext'
import type { Comanda, MetodoPagamento, RestauranteConfig } from '../../types'
import styles from './PdvSalao.module.css'
import buttonStyles from '../../components/ui/Button.module.css'

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
  const [valorRecebido, setValorRecebido] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const toast = useToast()

  // ── Sessão de Caixa (abrir/fechar) ──
  const [sessaoCaixa, setSessaoCaixa] = useState<SessaoCaixa | null>(null)
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false)
  const [valorAbertura, setValorAbertura] = useState('')
  const [valorFechamento, setValorFechamento] = useState('')
  const [processandoCaixa, setProcessandoCaixa] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const [r1, r2, r3] = await Promise.all([
        pdvApi.listarAguardandoPagamento(),
        pdvApi.getConfig(),
        caixaApi.status(),
      ])
      setComandas(r1.data)
      setConfig(r2.data)
      setSessaoCaixa(r3.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const handleAbrirCaixa = async () => {
    setProcessandoCaixa(true)
    try {
      const r = await caixaApi.abrir(Number(valorAbertura) || 0)
      setSessaoCaixa(r.data)
      setModalAbrirCaixa(false)
      setValorAbertura('')
      toast.success('Caixa aberto')
    } catch {
      toast.error('Erro ao abrir o caixa')
    } finally {
      setProcessandoCaixa(false)
    }
  }

  const handleFecharCaixa = async () => {
    setProcessandoCaixa(true)
    try {
      await caixaApi.fechar(Number(valorFechamento) || 0)
      setSessaoCaixa(null)
      setModalFecharCaixa(false)
      setValorFechamento('')
      toast.success('Caixa fechado')
    } catch {
      toast.error('Erro ao fechar o caixa')
    } finally {
      setProcessandoCaixa(false)
    }
  }

  const abrirModal = (c: Comanda) => {
    setSelecionada(c)
    setMetodo('PIX')
    setParcelas(1)
    setValorRecebido('')
    setCopiado(false)
  }

  const fecharModal = () => setSelecionada(null)

  const handleConfirmar = async () => {
    if (!selecionada) return
    if (metodo === 'DINHEIRO' && (troco === null || troco < 0)) return
    setConfirmando(true)
    try {
      await pdvApi.confirmarPagamentoComanda(selecionada.id, {
        metodoPagamento: metodo,
        parcelas: metodo === 'CARTAO_CREDITO' ? parcelas : undefined,
      })
      setSelecionada(null)
      await carregar()
    } catch {
      toast.error('Erro ao confirmar pagamento')
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

  const troco = metodo === 'DINHEIRO' && valorRecebido
    ? Number(valorRecebido) - (selecionada?.total ?? 0)
    : null
  const dinheiroInsuficiente = metodo === 'DINHEIRO' && (troco === null || troco < 0)

  const formatHora = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const formatMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return <p style={{ padding: '2rem', color: 'var(--color-text-secondary)' }}>Carregando...</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Salão — Aguardando Pagamento</h1>
        <div className={styles.headerActions}>
          <Link to="/pdv/nova-venda" className={`${buttonStyles.btn} ${buttonStyles.primary} ${buttonStyles.md}`}>
            <FiPlus size={16} /> Nova Venda
          </Link>
          <button className="btn btn-secondary" onClick={carregar}>Atualizar</button>
        </div>
      </div>

      <div className={`${styles.caixaBanner} ${sessaoCaixa ? styles.caixaAberto : styles.caixaFechado}`}>
        <div className={styles.caixaInfo}>
          {sessaoCaixa ? (
            <>
              <FiUnlock size={18} />
              <span>
                Caixa aberto por <strong>{sessaoCaixa.abertoPorNome}</strong> às {formatHora(sessaoCaixa.abertoEm)}
                {' '}— Abertura: {formatMoeda(sessaoCaixa.valorAbertura)}
              </span>
            </>
          ) : (
            <>
              <FiLock size={18} />
              <span>Caixa fechado — abra o caixa antes de iniciar as vendas.</span>
            </>
          )}
        </div>
        {sessaoCaixa ? (
          <button className="btn btn-secondary" onClick={() => setModalFecharCaixa(true)}>Fechar Caixa</button>
        ) : (
          <button className="btn btn-primary" onClick={() => setModalAbrirCaixa(true)}>Abrir Caixa</button>
        )}
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

            {metodo === 'DINHEIRO' && (
              <div className={styles.trocoWrap}>
                <label className={styles.parcelasLabel}>Valor recebido</label>
                <input
                  className={styles.trocoInput}
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={valorRecebido}
                  onChange={e => setValorRecebido(e.target.value)}
                  placeholder={formatMoeda(selecionada.total)}
                />
                {valorRecebido && (
                  <div className={dinheiroInsuficiente ? styles.trocoFaltando : styles.trocoValor}>
                    {dinheiroInsuficiente
                      ? `Faltam ${formatMoeda(Math.abs(troco ?? 0))}`
                      : `Troco: ${formatMoeda(troco ?? 0)}`}
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={fecharModal} disabled={confirmando}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleConfirmar} disabled={confirmando || dinheiroInsuficiente}>
                {confirmando ? 'Confirmando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAbrirCaixa && (
        <div className={styles.overlay} onClick={() => setModalAbrirCaixa(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Abrir Caixa</h2>
            <label className={styles.parcelasLabel}>Valor de abertura (troco inicial)</label>
            <input
              className={styles.trocoInput}
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={valorAbertura}
              onChange={e => setValorAbertura(e.target.value)}
              placeholder="R$ 0,00"
            />
            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setModalAbrirCaixa(false)} disabled={processandoCaixa}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleAbrirCaixa} disabled={processandoCaixa || !valorAbertura}>
                {processandoCaixa ? 'Abrindo...' : 'Abrir Caixa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFecharCaixa && sessaoCaixa && (
        <div className={styles.overlay} onClick={() => setModalFecharCaixa(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Fechar Caixa</h2>
            <p className={styles.hint}>Abertura: {formatMoeda(sessaoCaixa.valorAbertura)} às {formatHora(sessaoCaixa.abertoEm)}</p>
            <label className={styles.parcelasLabel}>Valor contado no fechamento</label>
            <input
              className={styles.trocoInput}
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={valorFechamento}
              onChange={e => setValorFechamento(e.target.value)}
              placeholder="R$ 0,00"
            />
            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setModalFecharCaixa(false)} disabled={processandoCaixa}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleFecharCaixa} disabled={processandoCaixa || !valorFechamento}>
                {processandoCaixa ? 'Fechando...' : 'Fechar Caixa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
