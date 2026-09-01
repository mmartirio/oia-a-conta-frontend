import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { entregaApi } from '../../api/entregaApi'
import { configuracaoApi } from '../../api/configuracaoApi'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { useNotification } from '../../contexts/NotificationContext'
import { formatCurrency, formatDateTime, METODO_PAGAMENTO_LABEL } from '../../utils/formatters'
import type { Entrega, MetodoPagamento } from '../../types'
import styles from './GarconDeliveryLista.module.css'

type StatusAtivo = 'AGUARDANDO' | 'CONFIRMADA' | 'ACEITA' | 'PRONTO_PARA_ENTREGA' | 'SAIU_PARA_ENTREGA'

// CONFIRMADA hoje é só pedido PIX já aceito mas ainda não mandado pra
// cozinha (ver EntregaService.confirmar) — fica junto com AGUARDANDO em
// "Aguardando confirmação" (ainda precisa de uma ação da equipe: mandar pra
// cozinha), NÃO com ACEITA em "Produção" — só ACEITA tem pedidoCozinhaId de
// verdade preenchido; misturar os dois fazia parecer que o pedido já tinha
// ido pra cozinha só por estar naquela coluna.
const COLUNAS: { statuses: StatusAtivo[]; label: string; cor: string }[] = [
  { statuses: ['AGUARDANDO', 'CONFIRMADA'],                  label: 'Aguardando confirmação', cor: '#ef4444' },
  { statuses: ['ACEITA'],                                    label: 'Produção',    cor: '#f59e0b' },
  { statuses: ['PRONTO_PARA_ENTREGA', 'SAIU_PARA_ENTREGA'], label: 'Entrega',     cor: '#22c55e' },
]

// AGUARDANDO não entra aqui — tem UI própria (confirmar/rejeitar com motivo)
const ACOES: Partial<Record<StatusAtivo, { label: string; fn: (id: number) => Promise<unknown> }>> = {
  CONFIRMADA:            { label: 'Enviar pra cozinha', fn: (id) => entregaApi.enviarParaProducao(id) },
  ACEITA:               { label: 'Pronto',   fn: (id) => entregaApi.prontoParaEntrega(id) },
  PRONTO_PARA_ENTREGA:  { label: 'Saiu',     fn: (id) => entregaApi.saiu(id) },
  SAIU_PARA_ENTREGA:    { label: 'Entregue', fn: (id) => entregaApi.entregar(id) },
}

// Sem entregador próprio (config "Entregador Externo") não faz sentido
// rastrear "saiu para entrega" separado — o restaurante só confirma que
// repassou o pedido pro entregador externo (99/Uber Entrega), e o pedido já
// é dado como concluído nesse momento.
const ACOES_ENTREGADOR_EXTERNO: Partial<Record<StatusAtivo, { label: string; fn: (id: number) => Promise<unknown> }>> = {
  CONFIRMADA:            { label: 'Enviar pra cozinha', fn: (id) => entregaApi.enviarParaProducao(id) },
  ACEITA:               { label: 'Pronto',                  fn: (id) => entregaApi.prontoParaEntrega(id) },
  PRONTO_PARA_ENTREGA:  { label: 'Entregar ao entregador',   fn: (id) => entregaApi.saiu(id).then(() => entregaApi.entregar(id)) },
}

export function GarconDeliveryLista() {
  const navigate = useNavigate()

  const [entregas,    setEntregas]    = useState<Entrega[]>([])
  const [loading,     setLoading]     = useState(true)
  const [atualizando, setAtualizando] = useState<number | null>(null)
  const [verEntregues, setVerEntregues] = useState(false)
  const [verCancelados, setVerCancelados] = useState(false)
  const [confirmCancelar, setConfirmCancelar] = useState<number | null>(null)
  const [imprimindo, setImprimindo] = useState<Entrega | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const prevIdsRef = useRef<Set<number>>(new Set())
  const [entregadorExterno, setEntregadorExterno] = useState(false)
  const toast = useToast()
  const { confirmarPedidoPendente, rejeitarPedidoPendente } = useNotification()
  const acoes = entregadorExterno ? ACOES_ENTREGADOR_EXTERNO : ACOES

  useEffect(() => {
    configuracaoApi.get().then(r => setEntregadorExterno(!!r.data.entregadorExterno)).catch(() => {})
  }, [])

  const load = useCallback(async (paginaAlvo = page) => {
    try {
      const r = await entregaApi.listar(paginaAlvo)
      setEntregas(r.data.content)
      setTotalPages(r.data.totalPages)
      const novosIds = new Set(
        r.data.content.filter((e: Entrega) => e.status === 'AGUARDANDO').map((e: Entrega) => e.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    load(page)
    const t = setInterval(() => load(page), 15000)
    return () => clearInterval(t)
  }, [load, page])

  const avancar = async (id: number, status: StatusAtivo) => {
    const acao = acoes[status]
    if (!acao) return
    setAtualizando(id)
    try { await acao.fn(id); load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro')
    } finally { setAtualizando(null) }
  }

  // Usa os métodos do NotificationContext (não entregaApi.confirmar/rejeitar
  // direto) — é o que mantém o alerta sonoro global em sincronia. Confirmar
  // por aqui sem passar pelo contexto deixava o pedido preso na lista de
  // "pendentes" da notificação (que só se atualiza via WebSocket em pedido
  // novo, não em mudança de status), e o alerta ficava tocando sem parar.
  const confirmarPedido = async (id: number) => {
    setAtualizando(id)
    try { await confirmarPedidoPendente(id); load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao confirmar pedido')
    } finally { setAtualizando(null) }
  }

  const validarPix = async (id: number) => {
    setAtualizando(id)
    try { await entregaApi.validarPix(id); load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao validar pagamento')
    } finally { setAtualizando(null) }
  }

  const rejeitarPedido = async (id: number) => {
    const motivo = window.prompt('Motivo da recusa (o cliente vai receber essa mensagem):')
    if (!motivo || !motivo.trim()) return
    setAtualizando(id)
    try { await rejeitarPedidoPendente(id, motivo.trim()); load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao recusar pedido')
    } finally { setAtualizando(null) }
  }

  // Precisa do pequeno delay pra garantir que o React já renderizou o
  // bloco .reciboImpressao com os dados dessa entrega antes do print()
  // abrir o diálogo (o state ainda não commitou no DOM no mesmo tick).
  const imprimirComanda = (e: Entrega) => {
    setImprimindo(e)
    setTimeout(() => window.print(), 50)
  }

  const cancelar = async () => {
    if (confirmCancelar === null) return
    const id = confirmCancelar
    setAtualizando(id)
    try { await entregaApi.cancelar(id); load() }
    catch { toast.error('Erro ao cancelar') }
    finally { setAtualizando(null); setConfirmCancelar(null) }
  }

  const ativas     = entregas.filter(e => e.status !== 'ENTREGUE' && e.status !== 'CANCELADA')
  const entregues  = entregas.filter(e => e.status === 'ENTREGUE')
  const cancelados = entregas.filter(e => e.status === 'CANCELADA')
  const total      = ativas.reduce((s, e) => s + e.total, 0)

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
          <Button variant="outline" size="sm" onClick={() => load()}>Atualizar</Button>
          <Button onClick={() => navigate('/delivery/novo')}>+ Nova Entrega</Button>
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

                    <p className={styles.cardPagamento}>
                      💳 {METODO_PAGAMENTO_LABEL[e.metodoPagamento as MetodoPagamento] ?? e.metodoPagamento}
                      {e.metodoPagamento === 'PIX' && (
                        e.pagamentoPixValidado
                          ? ' — ✓ pago'
                          : ' — pagamento não validado'
                      )}
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
                        <button
                          className={styles.btnImprimir}
                          onClick={() => imprimirComanda(e)}
                          title="Imprimir comanda de entrega"
                        >
                          🖨️
                        </button>
                        {e.status === 'AGUARDANDO' ? (
                          <>
                            {e.metodoPagamento === 'PIX' && !e.pagamentoPixValidado && (
                              <Button
                                size="sm"
                                variant="outline"
                                loading={atualizando === e.id}
                                onClick={() => validarPix(e.id)}
                              >
                                🔑 Validar PIX
                              </Button>
                            )}
                            <Button
                              size="sm"
                              loading={atualizando === e.id}
                              onClick={() => confirmarPedido(e.id)}
                            >
                              ✓ Confirmar
                            </Button>
                            <button
                              className={styles.btnCancelar}
                              onClick={() => rejeitarPedido(e.id)}
                              disabled={atualizando === e.id}
                              title="Recusar pedido"
                            >
                              ✕
                            </button>
                          </>
                        ) : acoes[e.status as StatusAtivo] && (
                          <Button
                            size="sm"
                            loading={atualizando === e.id}
                            onClick={() => avancar(e.id, e.status as StatusAtivo)}
                          >
                            {acoes[e.status as StatusAtivo]!.label}
                          </Button>
                        )}
                        {e.status !== 'AGUARDANDO' && (
                          <button
                            className={styles.btnCancelar}
                            onClick={() => setConfirmCancelar(e.id)}
                            disabled={atualizando === e.id}
                            title="Cancelar entrega"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.historicoWrap}>
      {entregues.length > 0 && (
        <div className={`${styles.entreguesSection} ${cancelados.length > 0 ? styles.entreguesSectionColada : ''}`}>
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

      {cancelados.length > 0 && (
        <div className={`${styles.entreguesSection} ${entregues.length > 0 ? styles.entreguesSectionSegunda : ''}`}>
          <button
            className={styles.entreguesToggle}
            onClick={() => setVerCancelados(v => !v)}
          >
            {verCancelados ? '▲' : '▼'} Cancelados ({cancelados.length})
          </button>
          {verCancelados && (
            <div className={styles.entreguesList}>
              {cancelados.map(e => (
                <div key={e.id} className={styles.entregueRow}>
                  <span className={styles.entregueId}>#{e.id}</span>
                  <span className={styles.entregueCliente}>{e.clienteNome}</span>
                  <span className={styles.entregueEndereco}>
                    {e.enderecoRua}{e.enderecoNumero ? `, ${e.enderecoNumero}` : ''}
                    {e.motivoRejeicao && ` — ${e.motivoRejeicao}`}
                  </span>
                  <Badge variant="danger" size="sm">Cancelada</Badge>
                  <span className={styles.entregueTotal}>{formatCurrency(e.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {/* A paginação recarrega a lista inteira de entregas (ativas + concluídas
          + canceladas) — sem as seções de histórico abertas, trocar de página
          só arrisca sumir com pedidos ativos do quadro sem nenhum ganho visível. */}
      {(verEntregues || verCancelados) && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <ConfirmDialog
        isOpen={confirmCancelar !== null}
        title="Cancelar entrega"
        message="Cancelar esta entrega?"
        confirmLabel="Cancelar entrega"
        danger
        loading={confirmCancelar !== null && atualizando === confirmCancelar}
        onConfirm={cancelar}
        onCancel={() => setConfirmCancelar(null)}
      />

      {/* Comanda de entrega — escondida na tela, só some a visibilidade em
          @media print (ver GarconDeliveryLista.module.css), mesma técnica
          do recibo de caixa em PdvSalao. */}
      {imprimindo && (
        <div className={styles.reciboImpressao}>
          <p className={styles.reciboCentro}>*** PEDIDO DELIVERY #{imprimindo.id} ***</p>
          <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
          <p>Cliente: {imprimindo.clienteNome}</p>
          {imprimindo.clienteTelefone && <p>Telefone: {imprimindo.clienteTelefone}</p>}
          <p>
            Endereço: {imprimindo.enderecoRua}
            {imprimindo.enderecoNumero ? `, ${imprimindo.enderecoNumero}` : ''}
            {imprimindo.enderecoComplemento ? ` — ${imprimindo.enderecoComplemento}` : ''}
            {imprimindo.enderecoBairro ? ` — ${imprimindo.enderecoBairro}` : ''}
            {imprimindo.enderecoCidade ? `, ${imprimindo.enderecoCidade}` : ''}
          </p>
          <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
          {imprimindo.itens.map(item => (
            <div key={item.id} className={styles.reciboLinha}>
              <span>{item.quantidade}x {item.produtoNome}</span>
              <span>{formatCurrency(item.precoUnitario * item.quantidade)}</span>
            </div>
          ))}
          {!!imprimindo.valorFrete && (
            <div className={styles.reciboLinha}>
              <span>Frete</span>
              <span>{formatCurrency(imprimindo.valorFrete)}</span>
            </div>
          )}
          <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
          <div className={styles.reciboLinha} style={{ fontWeight: 700 }}>
            <span>TOTAL</span>
            <span>{formatCurrency(imprimindo.total)}</span>
          </div>
          <p className={styles.reciboLinhaDivisoria}>--------------------------------</p>
          <p className={styles.reciboCentro}>Obrigado pela preferência!</p>
          <p className={styles.reciboCentro}>Volte sempre :)</p>
        </div>
      )}
    </div>
  )
}
