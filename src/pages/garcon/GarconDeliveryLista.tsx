import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { entregaApi } from '../../api/entregaApi'
import { configuracaoApi } from '../../api/configuracaoApi'
import { produtoApi } from '../../api/produtoApi'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { useNotification } from '../../contexts/NotificationContext'
import { formatCurrency, formatDateTime, METODO_PAGAMENTO_LABEL } from '../../utils/formatters'
import { formatarPeso, subtotalItem } from '../../utils/pesoItem'
import { formatarVolume } from '../../utils/volumeItem'
import type { Entrega, MetodoPagamento, Produto } from '../../types'
import styles from './GarconDeliveryLista.module.css'

type StatusAtivo = 'AGUARDANDO' | 'CONFIRMADA' | 'ACEITA' | 'PRONTO_PARA_ENTREGA' | 'SAIU_PARA_ENTREGA'

// CONFIRMADA hoje é só pedido PIX já aceito sem validar o pagamento ainda
// (ver EntregaService.confirmar) — fica junto com AGUARDANDO em "Aguardando
// confirmação", com o botão "Validar PIX" como única ação (validar já manda
// pra produção na hora — ver validarPix). NÃO entra em "Produção": só ACEITA
// tem pedidoCozinhaId de verdade preenchido.
const COLUNAS: { statuses: StatusAtivo[]; label: string; cor: string }[] = [
  { statuses: ['AGUARDANDO', 'CONFIRMADA'],                  label: 'Aguardando confirmação', cor: '#ef4444' },
  { statuses: ['ACEITA'],                                    label: 'Produção',    cor: '#f59e0b' },
  { statuses: ['PRONTO_PARA_ENTREGA', 'SAIU_PARA_ENTREGA'], label: 'Entrega',     cor: '#22c55e' },
]

// AGUARDANDO e CONFIRMADA não entram aqui — têm UI própria (ver JSX abaixo)
const ACOES: Partial<Record<StatusAtivo, { label: string; fn: (id: number) => Promise<unknown> }>> = {
  ACEITA:               { label: 'Pronto',   fn: (id) => entregaApi.prontoParaEntrega(id) },
  PRONTO_PARA_ENTREGA:  { label: 'Saiu',     fn: (id) => entregaApi.saiu(id) },
  SAIU_PARA_ENTREGA:    { label: 'Entregue', fn: (id) => entregaApi.entregar(id) },
}

// Sem entregador próprio (config "Entregador Externo") não faz sentido
// rastrear "saiu para entrega" separado — o restaurante só confirma que
// repassou o pedido pro entregador externo (99/Uber Entrega), e o pedido já
// é dado como concluído nesse momento.
const ACOES_ENTREGADOR_EXTERNO: Partial<Record<StatusAtivo, { label: string; fn: (id: number) => Promise<unknown> }>> = {
  ACEITA:               { label: 'Pronto',                  fn: (id) => entregaApi.prontoParaEntrega(id) },
  PRONTO_PARA_ENTREGA:  { label: 'Entregar ao entregador',   fn: (id) => entregaApi.saiu(id).then(() => entregaApi.entregar(id)) },
}

// Tempo de preparo esperado pra uma entrega (minutos) — o maior entre os
// itens dela (a cozinha prepara em paralelo, então o que trava o pedido é o
// item mais demorado, não a soma de todos). Cada item usa: a regra "acima do
// limite" se a quantidade bater, senão o tempo próprio do produto, senão o
// padrão do restaurante. Item avulso/sem produto cadastrado (produtoId -1,
// ex: item de teste do iFood) sempre cai no padrão.
function calcularTempoPrevistoMinutos(entrega: Entrega, produtosPorId: Map<number, Produto>, padraoMinutos: number): number {
  let maior = 0
  for (const item of entrega.itens) {
    const produto = item.produtoId > 0 ? produtosPorId.get(item.produtoId) : undefined
    let minutos = padraoMinutos
    if (produto) {
      const temRegraLimite = produto.tempoPreparoQuantidadeLimite != null && produto.tempoPreparoMinutosAcimaLimite != null
      minutos = temRegraLimite && item.quantidade >= produto.tempoPreparoQuantidadeLimite!
        ? produto.tempoPreparoMinutosAcimaLimite!
        : (produto.tempoPreparoMinutos ?? padraoMinutos)
    }
    if (minutos > maior) maior = minutos
  }
  return maior || padraoMinutos
}

export function GarconDeliveryLista() {
  const navigate = useNavigate()

  const [entregas,    setEntregas]    = useState<Entrega[]>([])
  const [loading,     setLoading]     = useState(true)
  const [atualizando, setAtualizando] = useState<number | null>(null)
  const [verEntregues, setVerEntregues] = useState(false)
  const [verCancelados, setVerCancelados] = useState(false)
  const [expandidosHistorico, setExpandidosHistorico] = useState<Set<number>>(new Set())
  const [confirmCancelar, setConfirmCancelar] = useState<number | null>(null)
  const [detalhesAbertoId, setDetalhesAbertoId] = useState<number | null>(null)
  const [imprimindo, setImprimindo] = useState<Entrega | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const prevIdsRef = useRef<Set<number>>(new Set())
  const [entregadorExterno, setEntregadorExterno] = useState(false)
  const [tempoPreparoPadraoMinutos, setTempoPreparoPadraoMinutos] = useState(15)
  const [produtosPorId, setProdutosPorId] = useState<Map<number, Produto>>(new Map())
  const toast = useToast()
  const { confirmarPedidoPendente, rejeitarPedidoPendente } = useNotification()
  const acoes = entregadorExterno ? ACOES_ENTREGADOR_EXTERNO : ACOES

  useEffect(() => {
    configuracaoApi.get().then(r => {
      setEntregadorExterno(!!r.data.entregadorExterno)
      setTempoPreparoPadraoMinutos(r.data.tempoPreparoPadraoMinutos ?? 15)
    }).catch(() => {})
    // incluirInativos: um produto desativado depois de já ter pedidos em
    // aberto ainda precisa aparecer aqui pro cronômetro calcular certo.
    produtoApi.listar(undefined, true).then(r => {
      setProdutosPorId(new Map(r.data.map(p => [p.id, p])))
    }).catch(() => {})
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

  const alternarExpandidoHistorico = (id: number) => {
    setExpandidosHistorico(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
                    className={`${styles.card} ${e.origemWhatsapp ? styles.cardWpp : ''} ${e.origemIfood ? styles.cardIfood : ''}`}
                    style={{ borderTopColor: col.cor }}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardId}>#{e.origemIfood && e.ifoodDisplayId ? e.ifoodDisplayId : e.id}</span>
                      {e.origemWhatsapp && (
                        <span className={styles.wppBadge}>WhatsApp</span>
                      )}
                      {e.origemIfood && (
                        <span className={styles.ifoodBadge}>iFood</span>
                      )}
                      {e.origemIfood && (
                        <CronometroPedido
                          entrega={e}
                          tempoPrevistoMinutos={calcularTempoPrevistoMinutos(e, produtosPorId, tempoPreparoPadraoMinutos)}
                        />
                      )}
                    </div>

                    <div className={styles.cardAcoes}>
                      <button
                        className={styles.btnDetalhes}
                        onClick={() => setDetalhesAbertoId(e.id)}
                      >
                        Detalhes
                      </button>
                        {e.status === 'AGUARDANDO' ? (
                          <>
                            {e.metodoPagamento === 'PIX' && !e.pagamentoPixValidado ? (
                              // Validar PIX já aceita e manda pra cozinha —
                              // não faz sentido ter "Confirmar" também.
                              <Button
                                size="sm"
                                loading={atualizando === e.id}
                                onClick={() => validarPix(e.id)}
                              >
                                🔑 Validar PIX
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                loading={atualizando === e.id}
                                onClick={() => confirmarPedido(e.id)}
                              >
                                ✓ Confirmar
                              </Button>
                            )}
                            <button
                              className={styles.btnCancelar}
                              onClick={() => rejeitarPedido(e.id)}
                              disabled={atualizando === e.id}
                              title="Recusar pedido"
                            >
                              ✕
                            </button>
                          </>
                        ) : e.status === 'CONFIRMADA' ? (
                          // Já aceito, só falta validar o PIX — validar já
                          // manda pra produção na hora (ver validarPix).
                          <Button
                            size="sm"
                            loading={atualizando === e.id}
                            onClick={() => validarPix(e.id)}
                          >
                            🔑 Validar PIX
                          </Button>
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
                <div key={e.id} className={styles.entregueGrupo}>
                  <div
                    className={`${styles.entregueRow} ${styles.entregueRowExpandivel}`}
                    onClick={() => alternarExpandidoHistorico(e.id)}
                  >
                    <span className={styles.entregueExpandirIcone}>{expandidosHistorico.has(e.id) ? '▾' : '▸'}</span>
                    <span className={styles.entregueId}>#{e.origemIfood && e.ifoodDisplayId ? e.ifoodDisplayId : e.id}</span>
                    {e.origemIfood && <Badge variant="danger" size="sm">iFood</Badge>}
                    <span className={styles.entregueCliente}>{e.clienteNome}</span>
                    <span className={styles.entregueEndereco}>
                      {e.enderecoRua}{e.enderecoNumero ? `, ${e.enderecoNumero}` : ''}
                    </span>
                    <Badge variant="success" size="sm">Entregue</Badge>
                    <span className={styles.entregueTotal}>{formatCurrency(e.total)}</span>
                  </div>
                  {expandidosHistorico.has(e.id) && (
                    <DetalhesHistorico entrega={e} />
                  )}
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
                <div key={e.id} className={styles.entregueGrupo}>
                  <div
                    className={`${styles.entregueRow} ${styles.entregueRowExpandivel}`}
                    onClick={() => alternarExpandidoHistorico(e.id)}
                  >
                    <span className={styles.entregueExpandirIcone}>{expandidosHistorico.has(e.id) ? '▾' : '▸'}</span>
                    <span className={styles.entregueId}>#{e.origemIfood && e.ifoodDisplayId ? e.ifoodDisplayId : e.id}</span>
                    {e.origemIfood && <Badge variant="danger" size="sm">iFood</Badge>}
                    <span className={styles.entregueCliente}>{e.clienteNome}</span>
                    <span className={styles.entregueEndereco}>
                      {e.enderecoRua}{e.enderecoNumero ? `, ${e.enderecoNumero}` : ''}
                      {e.motivoRejeicao && ` — ${e.motivoRejeicao}`}
                    </span>
                    <Badge variant="danger" size="sm">Cancelada</Badge>
                    <span className={styles.entregueTotal}>{formatCurrency(e.total)}</span>
                  </div>
                  {expandidosHistorico.has(e.id) && (
                    <DetalhesHistorico entrega={e} />
                  )}
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

      {detalhesAbertoId !== null && (() => {
        const e = entregas.find(x => x.id === detalhesAbertoId)
        if (!e) return null
        return (
          <Modal
            isOpen
            onClose={() => setDetalhesAbertoId(null)}
            title={`Pedido #${e.origemIfood && e.ifoodDisplayId ? e.ifoodDisplayId : e.id}`}
          >
            <DetalhesPedido entrega={e} onImprimir={() => imprimirComanda(e)} />
          </Modal>
        )
      })()}

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
              <span>{item.pesoGramas != null ? formatarPeso(item.pesoGramas) : item.volumeMililitros != null ? formatarVolume(item.volumeMililitros) : `${item.quantidade}x`} {item.produtoNome}</span>
              <span>{formatCurrency(subtotalItem(item.precoUnitario, item.quantidade, item.pesoGramas, item.volumeMililitros))}</span>
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

// Painel de detalhes ao expandir uma linha do histórico (Concluídas/
// Cancelados) — mesmas infos que o card ativo já mostra (telefone, itens,
// pagamento, entregador), só que compacto, já que aqui é só consulta.
function DetalhesHistorico({ entrega: e }: { entrega: Entrega }) {
  return (
    <div className={styles.entregueDetalhes} onClick={ev => ev.stopPropagation()}>
      {e.clienteTelefone && (
        <p className={styles.entregueDetalheLinha}><strong>Telefone:</strong> {e.clienteTelefone}</p>
      )}
      <p className={styles.entregueDetalheLinha}>
        <strong>Endereço:</strong> {e.enderecoRua}
        {e.enderecoNumero ? `, ${e.enderecoNumero}` : ''}
        {e.enderecoBairro ? ` — ${e.enderecoBairro}` : ''}
        {e.enderecoCidade ? `, ${e.enderecoCidade}` : ''}
        {e.enderecoComplemento ? ` (${e.enderecoComplemento})` : ''}
      </p>
      <p className={styles.entregueDetalheLinha}>
        <strong>Pagamento:</strong> {METODO_PAGAMENTO_LABEL[e.metodoPagamento as MetodoPagamento] ?? e.metodoPagamento}
      </p>
      {e.entregadorNome && (
        <p className={styles.entregueDetalheLinha}><strong>Entregador:</strong> {e.entregadorNome}</p>
      )}
      {e.observacao && (
        <p className={styles.entregueDetalheLinha}><strong>Observação:</strong> {e.observacao}</p>
      )}
      {e.motivoRejeicao && (
        <p className={styles.entregueDetalheLinha}><strong>Motivo do cancelamento:</strong> {e.motivoRejeicao}</p>
      )}
      {e.origemIfood && e.ifoodOrderId && (
        <p className={styles.entregueDetalheLinha}><strong>Pedido iFood:</strong> {e.ifoodOrderId}</p>
      )}
      <p className={styles.entregueDetalheLinha}>
        <strong>Criado em:</strong> {formatDateTime(e.criadoEm)}
        {e.entregueEm && <> · <strong>Entregue em:</strong> {formatDateTime(e.entregueEm)}</>}
      </p>
      <ul className={styles.entregueDetalheItens}>
        {e.itens.map(item => (
          <li key={item.id}>
            {item.pesoGramas != null ? formatarPeso(item.pesoGramas) : item.volumeMililitros != null ? formatarVolume(item.volumeMililitros) : `${item.quantidade}×`} {item.produtoNome}
            {item.comboNome && ` (${item.comboNome})`}
            <span className={styles.entregueDetalheItemPreco}>{formatCurrency(subtotalItem(item.precoUnitario, item.quantidade, item.pesoGramas, item.volumeMililitros))}</span>
          </li>
        ))}
      </ul>
      {!!e.valorFrete && (
        <p className={styles.entregueDetalheLinha}><strong>Frete:</strong> {formatCurrency(e.valorFrete)}</p>
      )}
    </div>
  )
}

// Cronômetro do card ativo, só pra pedidos iFood: conta o tempo de preparo
// (desde que o pedido chegou) até clicar em "Pronto", quando reinicia do
// zero e passa a contar o tempo de entrega (desde prontoEm) até "Entregue".
// Usa os timestamps persistidos (criadoEm/prontoEm), não um cronômetro só
// de memória — senão recarregar a página perderia a contagem certa.
function CronometroPedido({ entrega: e, tempoPrevistoMinutos }: { entrega: Entrega; tempoPrevistoMinutos: number }) {
  const [, tick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const emPreparo = e.status === 'AGUARDANDO' || e.status === 'CONFIRMADA' || e.status === 'ACEITA'
  const inicio = emPreparo ? e.criadoEm : e.prontoEm
  if (!inicio) return null

  const segundos = Math.max(0, Math.floor((Date.now() - new Date(inicio).getTime()) / 1000))
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const texto = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  // Só o tempo de preparo tem meta configurada (produto/padrão) — o tempo de
  // entrega não tem esse conceito hoje, então nunca fica "atrasado" visualmente.
  const atrasado = emPreparo && segundos > tempoPrevistoMinutos * 60

  return (
    <span
      className={`${styles.cronometro} ${emPreparo ? styles.cronometroPreparo : styles.cronometroEntrega} ${atrasado ? styles.cronometroAtrasado : ''}`}
      title={emPreparo ? `Tempo de preparo (previsto: ${tempoPrevistoMinutos} min)` : 'Tempo de entrega'}
    >
      {emPreparo ? '🍳' : '🏍️'} {texto}
    </span>
  )
}

// Conteúdo do modal "Detalhes" do card ativo — os dados que antes ficavam
// direto no card (cliente, endereço, pagamento, entregador, itens, total)
// mais os atalhos de Maps/imprimir que também saíram do card.
function DetalhesPedido({ entrega: e, onImprimir }: { entrega: Entrega; onImprimir: () => void }) {
  return (
    <div className={styles.modalDetalhes}>
      <p className={styles.entregueDetalheLinha}><strong>Cliente:</strong> {e.clienteNome}</p>
      {e.clienteTelefone && (
        <p className={styles.entregueDetalheLinha}><strong>Telefone:</strong> {e.clienteTelefone}</p>
      )}
      <p className={styles.entregueDetalheLinha}>
        <strong>Endereço:</strong> {e.enderecoRua}
        {e.enderecoNumero ? `, ${e.enderecoNumero}` : ''}
        {e.enderecoBairro ? ` — ${e.enderecoBairro}` : ''}
        {e.enderecoCidade ? `, ${e.enderecoCidade}` : ''}
        {e.enderecoComplemento ? ` (${e.enderecoComplemento})` : ''}
      </p>
      <p className={styles.entregueDetalheLinha}>
        <strong>Pagamento:</strong> {METODO_PAGAMENTO_LABEL[e.metodoPagamento as MetodoPagamento] ?? e.metodoPagamento}
        {e.pagamentoOnline
          ? (e.pagamentoOnlineStatus === 'refunded' ? ' — estornado' : ' — ✓ pago online')
          : e.metodoPagamento === 'PIX' && (e.pagamentoPixValidado ? ' — ✓ pago' : ' — pagamento não validado')}
      </p>
      {e.entregadorNome && (
        <p className={styles.entregueDetalheLinha}><strong>Entregador:</strong> {e.entregadorNome}</p>
      )}
      {e.observacao && (
        <p className={styles.entregueDetalheLinha}><strong>Observação:</strong> {e.observacao}</p>
      )}
      {e.origemIfood && e.ifoodOrderId && (
        <p className={styles.entregueDetalheLinha}><strong>Pedido iFood:</strong> {e.ifoodOrderId}</p>
      )}
      <p className={styles.entregueDetalheLinha}><strong>Recebido em:</strong> {formatDateTime(e.criadoEm)}</p>

      <ul className={styles.entregueDetalheItens}>
        {e.itens.map(item => (
          <li key={item.id}>
            {item.pesoGramas != null ? formatarPeso(item.pesoGramas) : item.volumeMililitros != null ? formatarVolume(item.volumeMililitros) : `${item.quantidade}×`} {item.produtoNome}
            {item.comboNome && ` (${item.comboNome})`}
            <span className={styles.entregueDetalheItemPreco}>{formatCurrency(subtotalItem(item.precoUnitario, item.quantidade, item.pesoGramas, item.volumeMililitros))}</span>
          </li>
        ))}
      </ul>
      {!!e.valorFrete && (
        <p className={styles.entregueDetalheLinha}><strong>Frete:</strong> {formatCurrency(e.valorFrete)}</p>
      )}
      <p className={styles.modalDetalhesTotal}><strong>Total:</strong> {formatCurrency(e.total)}</p>

      <div className={styles.modalDetalhesAcoes}>
        <a
          className={styles.mapsLink}
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
            [e.enderecoRua, e.enderecoNumero, e.enderecoBairro, e.enderecoCidade].filter(Boolean).join(', ')
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir no Maps
        </a>
        <button className={styles.btnImprimirModal} onClick={onImprimir} title="Imprimir comanda" aria-label="Imprimir comanda">
          🖨️
        </button>
      </div>
    </div>
  )
}
