import { useEffect, useMemo, useState } from 'react'
import { FiLock, FiUnlock } from 'react-icons/fi'
import { pdvApi } from '../../api/pdvApi'
import { caixaApi, type SessaoCaixa } from '../../api/caixaApi'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PdvNovaVenda, type ModoVenda } from './PdvNovaVenda'
import type { Comanda, Entrega, MetodoPagamento, ResumoFinanceiro, RestauranteConfig } from '../../types'
import styles from './PdvSalao.module.css'

type Aba = 'FILA' | 'NOVA_VENDA'

const METODOS: { value: MetodoPagamento; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Débito' },
]

const METODO_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
}

type ItemFila =
  | { tipo: 'GARCOM'; id: number; horario: string; comanda: Comanda }
  | { tipo: 'DELIVERY'; id: number; horario: string; entrega: Entrega }

export function PdvSalao() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [config, setConfig] = useState<RestauranteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selecionada, setSelecionada] = useState<Comanda | null>(null)
  const [metodo, setMetodo] = useState<MetodoPagamento>('PIX')
  const [parcelas, setParcelas] = useState(1)
  const [valorRecebido, setValorRecebido] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [entregaConfirmando, setEntregaConfirmando] = useState<Entrega | null>(null)
  const [processandoEntrega, setProcessandoEntrega] = useState(false)
  const [pixEntregaView, setPixEntregaView] = useState<Entrega | null>(null)
  const [pixCopiado, setPixCopiado] = useState(false)

  // ── Aba ativa: fila de pagamento OU nova venda — todo o PDV é uma única
  // tela/rota, sem navegar entre páginas.
  const [aba, setAba] = useState<Aba>('FILA')
  const [modoVendaInicial, setModoVendaInicial] = useState<ModoVenda>('BALCAO')
  const toast = useToast()

  // ── Sessão de Caixa (abrir/fechar) ──
  const [sessaoCaixa, setSessaoCaixa] = useState<SessaoCaixa | null>(null)
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false)
  const [valorAbertura, setValorAbertura] = useState('')
  const [valorFechamento, setValorFechamento] = useState('')
  const [processandoCaixa, setProcessandoCaixa] = useState(false)
  const [resumoCaixa, setResumoCaixa] = useState<ResumoFinanceiro | null>(null)
  const [carregandoResumoCaixa, setCarregandoResumoCaixa] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        pdvApi.listarAguardandoPagamento(),
        pdvApi.getConfig(),
        caixaApi.status(),
        pdvApi.listarEntregasPendentes(),
      ])
      setComandas(r1.data)
      setConfig(r2.data)
      setSessaoCaixa(r3.data)
      setEntregas(r4.data.content)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // Fila unificada: comandas fechadas pelo garçom + entregas de delivery
  // aguardando confirmação de pagamento, por ordem de chegada (mais antigo
  // primeiro) — não por quando o pedido/mesa foi aberto originalmente.
  const fila = useMemo<ItemFila[]>(() => {
    const itensGarcom: ItemFila[] = comandas.map(c => ({
      tipo: 'GARCOM', id: c.id, comanda: c,
      horario: c.aguardandoPagamentoEm ?? c.criadoEm,
    }))
    const itensDelivery: ItemFila[] = entregas.map(e => ({
      tipo: 'DELIVERY', id: e.id, entrega: e,
      horario: e.entregueEm ?? e.criadoEm,
    }))
    return [...itensGarcom, ...itensDelivery]
      .sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime())
  }, [comandas, entregas])

  // Só o que passa pela gaveta física conta pro esperado — PIX/cartão são
  // liquidados fora do caixa. Comparar contra o total geral (todas as formas)
  // faria a diferença parecer enorme sempre que a maioria das vendas fosse em
  // cartão/PIX, mesmo com a gaveta batendo certinho.
  const valorEsperadoDinheiro = sessaoCaixa
    ? sessaoCaixa.valorAbertura + (resumoCaixa?.breakdownPorMetodo['DINHEIRO'] ?? 0)
    : 0
  const diferencaCaixa = valorFechamento ? Number(valorFechamento) - valorEsperadoDinheiro : null

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
      setResumoCaixa(null)
      toast.success('Caixa fechado')
    } catch {
      toast.error('Erro ao fechar o caixa')
    } finally {
      setProcessandoCaixa(false)
    }
  }

  // Busca quanto já entrou nesta sessão (por forma de pagamento) assim que
  // o modal de fechamento abre, pra conferência com o valor contado à mão.
  const abrirModalFecharCaixa = () => {
    setModalFecharCaixa(true)
    setCarregandoResumoCaixa(true)
    caixaApi.resumo()
      .then(r => setResumoCaixa(r.data))
      .catch(() => toast.error('Não foi possível carregar o resumo do caixa'))
      .finally(() => setCarregandoResumoCaixa(false))
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

  const handleConfirmarEntrega = async () => {
    if (!entregaConfirmando) return
    setProcessandoEntrega(true)
    try {
      await pdvApi.confirmarPagamentoEntrega(entregaConfirmando.id)
      setEntregaConfirmando(null)
      toast.success('Pagamento do delivery confirmado')
      await carregar()
    } catch {
      toast.error('Erro ao confirmar pagamento do delivery')
    } finally {
      setProcessandoEntrega(false)
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
        <h1 className={styles.title}>Caixa (PDV)</h1>
        <div className={styles.headerActions}>
          {aba === 'FILA' && <Button variant="outline" onClick={carregar}>Atualizar</Button>}
        </div>
      </div>

      <div className={styles.abas}>
        <button
          className={`${styles.abaBtn} ${aba === 'FILA' ? styles.abaBtnAtiva : ''}`}
          onClick={() => setAba('FILA')}
        >
          Fila de Pagamento{fila.length > 0 ? ` (${fila.length})` : ''}
        </button>
        <button
          className={`${styles.abaBtn} ${aba === 'NOVA_VENDA' ? styles.abaBtnAtiva : ''}`}
          onClick={() => { setModoVendaInicial('BALCAO'); setAba('NOVA_VENDA') }}
        >
          Nova Venda
        </button>
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
          <Button variant="outline" onClick={abrirModalFecharCaixa}>Fechar Caixa</Button>
        ) : (
          <Button onClick={() => setModalAbrirCaixa(true)}>Abrir Caixa</Button>
        )}
      </div>

      {aba === 'NOVA_VENDA' && (
        <PdvNovaVenda
          sessaoCaixa={sessaoCaixa}
          modoInicial={modoVendaInicial}
          onConcluida={() => { setAba('FILA'); carregar() }}
        />
      )}

      {aba === 'FILA' && (fila.length === 0 ? (
        <p className={styles.empty}>Nenhum pedido aguardando pagamento.</p>
      ) : (
        <div className={styles.lista}>
          {fila.map(item => item.tipo === 'GARCOM' ? (
            <div key={`comanda-${item.id}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.codigo}>#{item.comanda.id}</span>
                <span className={styles.tipoBadge}>Mesa {item.comanda.mesaNumero}</span>
                <span className={styles.cardTime}>{formatHora(item.horario)}</span>
              </div>
              <div className={styles.agente}>Garçom: {item.comanda.garconNome}</div>
              <div className={styles.cardFooter}>
                <span className={styles.total}>{formatMoeda(item.comanda.total)}</span>
                <Button onClick={() => abrirModal(item.comanda)}>
                  Processar Pagamento
                </Button>
              </div>
            </div>
          ) : (
            <div key={`entrega-${item.id}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.codigo}>#{item.entrega.id}</span>
                <span className={`${styles.tipoBadge} ${styles.tipoBadgeDelivery}`}>Delivery</span>
                <span className={styles.cardTime}>{formatHora(item.horario)}</span>
              </div>
              <div className={styles.agente}>Entregador: {item.entrega.entregadorNome ?? '—'}</div>
              <div className={styles.cliente}>Cliente: {item.entrega.clienteNome}</div>
              <div className={styles.cardFooter}>
                <span className={styles.total}>{formatMoeda(item.entrega.total)}</span>
                <div className={styles.footerActions}>
                  {item.entrega.metodoPagamento === 'PIX' && (
                    <Button variant="outline" onClick={() => { setPixEntregaView(item.entrega); setPixCopiado(false) }}>
                      Ver Chave PIX
                    </Button>
                  )}
                  <Button onClick={() => setEntregaConfirmando(item.entrega)}>
                    Confirmar Pagamento
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

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
              <Button variant="outline" onClick={fecharModal} disabled={confirmando}>
                Cancelar
              </Button>
              <Button loading={confirmando} onClick={handleConfirmar} disabled={dinheiroInsuficiente}>
                Confirmar Pagamento
              </Button>
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
              <Button variant="outline" onClick={() => setModalAbrirCaixa(false)} disabled={processandoCaixa}>
                Cancelar
              </Button>
              <Button loading={processandoCaixa} onClick={handleAbrirCaixa} disabled={!valorAbertura}>
                Abrir Caixa
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalFecharCaixa && sessaoCaixa && (
        <div className={styles.overlay} onClick={() => setModalFecharCaixa(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Fechar Caixa</h2>
            <p className={styles.hint}>Abertura: {formatMoeda(sessaoCaixa.valorAbertura)} às {formatHora(sessaoCaixa.abertoEm)}</p>

            <div className={styles.resumoCaixa}>
              <span className={styles.parcelasLabel}>Valores arrecadados nesta sessão</span>
              {carregandoResumoCaixa ? (
                <p className={styles.hint}>Calculando...</p>
              ) : resumoCaixa && Object.keys(resumoCaixa.breakdownPorMetodo).length > 0 ? (
                <>
                  {Object.entries(resumoCaixa.breakdownPorMetodo).map(([m, v]) => (
                    <div key={m} className={styles.resumoCaixaLinha}>
                      <span>{METODO_LABEL[m] ?? m}</span>
                      <span>{formatMoeda(v)}</span>
                    </div>
                  ))}
                  <div className={`${styles.resumoCaixaLinha} ${styles.resumoCaixaTotal}`}>
                    <span>Total arrecadado</span>
                    <span>{formatMoeda(resumoCaixa.totalGeral)}</span>
                  </div>
                  <div className={styles.resumoCaixaLinha}>
                    <span>Esperado em dinheiro na gaveta</span>
                    <span>{formatMoeda(valorEsperadoDinheiro)}</span>
                  </div>
                </>
              ) : (
                <p className={styles.hint}>Nenhuma venda registrada nesta sessão ainda.</p>
              )}
            </div>

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
            {diferencaCaixa !== null && Math.abs(diferencaCaixa) > 0.009 && (
              <p className={diferencaCaixa < 0 ? styles.caixaFalta : styles.caixaSobra}>
                {diferencaCaixa < 0
                  ? `Falta ${formatMoeda(Math.abs(diferencaCaixa))} em relação ao esperado.`
                  : `Sobra ${formatMoeda(diferencaCaixa)} em relação ao esperado.`}
                {' '}Diferenças de caixa são um risco do negócio e não devem ser descontadas do
                salário ou da comissão de quem fechou o caixa sem um acordo prévio por escrito.
              </p>
            )}
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => window.print()} disabled={!resumoCaixa}>
                Imprimir
              </Button>
              <Button variant="outline" onClick={() => setModalFecharCaixa(false)} disabled={processandoCaixa}>
                Cancelar
              </Button>
              <Button loading={processandoCaixa} onClick={handleFecharCaixa} disabled={!valorFechamento}>
                Fechar Caixa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recibo pra impressão térmica — invisível na tela, só aparece no
          diálogo de impressão do navegador (ver @media print no CSS). A
          maioria das impressoras térmicas no Brasil já instala um driver
          Windows normal e aparece como opção nesse diálogo, sem precisar de
          integração especial (WebUSB/ESC-POS). */}
      {resumoCaixa && sessaoCaixa && (
        <div className={styles.reciboImpressao}>
          <p className={styles.reciboCentro}>*** RESUMO DE CAIXA ***</p>
          <p>Aberto por: {sessaoCaixa.abertoPorNome}</p>
          <p>Abertura: {formatHora(sessaoCaixa.abertoEm)} — {formatMoeda(sessaoCaixa.valorAbertura)}</p>
          <p>Impresso em: {new Date().toLocaleString('pt-BR')}</p>
          <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
          {Object.entries(resumoCaixa.breakdownPorMetodo).map(([m, v]) => (
            <div key={m} className={styles.reciboLinha}>
              <span>{METODO_LABEL[m] ?? m}</span>
              <span>{formatMoeda(v)}</span>
            </div>
          ))}
          <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
          <div className={styles.reciboLinha}>
            <strong>TOTAL ARRECADADO</strong>
            <strong>{formatMoeda(resumoCaixa.totalGeral)}</strong>
          </div>
          {valorFechamento && (
            <>
              <div className={styles.reciboLinha}>
                <span>Esperado em dinheiro</span>
                <span>{formatMoeda(valorEsperadoDinheiro)}</span>
              </div>
              <div className={styles.reciboLinha}>
                <span>Valor contado</span>
                <span>{formatMoeda(Number(valorFechamento))}</span>
              </div>
              <div className={styles.reciboLinha}>
                <span>Diferença</span>
                <span>{formatMoeda(diferencaCaixa ?? 0)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!entregaConfirmando}
        title="Confirmar pagamento do delivery"
        message={entregaConfirmando
          ? `Confirmar recebimento de ${formatMoeda(entregaConfirmando.total)} (${entregaConfirmando.metodoPagamento}) do pedido #${entregaConfirmando.id} — cliente ${entregaConfirmando.clienteNome}?`
          : ''}
        confirmLabel="Confirmar Pagamento"
        loading={processandoEntrega}
        onConfirm={handleConfirmarEntrega}
        onCancel={() => setEntregaConfirmando(null)}
      />

      {pixEntregaView && (
        <div className={styles.overlay} onClick={() => setPixEntregaView(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Chave PIX</h2>
            <p className={styles.hint}>Pedido de {pixEntregaView.clienteNome} — {formatMoeda(pixEntregaView.total)}</p>
            <div className={styles.pixBox}>
              <div className={styles.pixLabel}>Chave PIX do restaurante</div>
              <div className={styles.pixChave}>{config?.pixChave || 'Não configurada'}</div>
              {config?.pixChave && (
                <button
                  className={styles.pixCopy}
                  onClick={() => {
                    navigator.clipboard.writeText(config.pixChave!)
                    setPixCopiado(true)
                    setTimeout(() => setPixCopiado(false), 2000)
                  }}
                >
                  {pixCopiado ? 'Copiado!' : 'Copiar chave'}
                </button>
              )}
            </div>
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setPixEntregaView(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
