import { useEffect, useState, useCallback, useRef } from 'react'
import { FiFileText } from 'react-icons/fi'
import { entregaApi } from '../../api/entregaApi'
import { EntregadorRotaMapa } from '../../components/EntregadorRotaMapa'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency, formatDateTime } from '../../utils/formatters'
import type { Entrega, RotaSugerida } from '../../types'
import styles from './EntregadorPainel.module.css'

// Intervalo mínimo entre envios de localização — watchPosition pode disparar
// a cada poucos segundos, e não precisamos de mais resolução que essa pro
// mapa de acompanhamento no admin.
const INTERVALO_MIN_ENVIO_LOCALIZACAO_MS = 10_000

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: 'Aguardando confirmação da cozinha',
  CONFIRMADA: 'Confirmado — disponível',
  ACEITA: 'Aceita — aguardando preparo',
  PRONTO_PARA_ENTREGA: 'Pronto para entrega',
  SAIU_PARA_ENTREGA: 'A caminho',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
}

function mapsUrl(e: Entrega) {
  const destino = [e.enderecoRua, e.enderecoNumero, e.enderecoBairro, e.enderecoCidade]
    .filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`
}

// Uma única URL do Google Maps cobrindo todas as paradas da rota sugerida,
// na ordem sugerida — o entregador abre e navega a rota inteira de uma vez,
// em vez de abrir o Maps entrega por entrega.
function mapsUrlRota(rota: RotaSugerida, entregas: Entrega[]) {
  const porId = new Map(entregas.map(e => [e.id, e]))
  const enderecos = [...rota.paradas]
    .sort((a, b) => a.ordem - b.ordem)
    .map(p => porId.get(p.entregaId))
    .filter((e): e is Entrega => !!e)
    .map(e => [e.enderecoRua, e.enderecoNumero, e.enderecoBairro, e.enderecoCidade].filter(Boolean).join(', '))

  if (enderecos.length === 0) return null

  const destino = enderecos[enderecos.length - 1]
  const waypoints = enderecos.slice(0, -1)
  const params = new URLSearchParams({ api: '1', destination: destino })
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function EntregadorPainel() {
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [rota, setRota] = useState<RotaSugerida | null>(null)
  const [carregandoRota, setCarregandoRota] = useState(false)
  const [minhaPosicao, setMinhaPosicao] = useState<{ lat: number; lng: number } | null>(null)
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const toast = useToast()
  const { user } = useAuth()
  const ultimoEnvioRef = useRef(0)

  const load = useCallback(() => {
    entregaApi.listar(page)
      .then(r => {
        setEntregas(r.data.content.filter(e => e.status !== 'CANCELADA' && e.status !== 'ENTREGUE'))
        setTotalPages(r.data.totalPages)
      })
      .finally(() => setLoading(false))
  }, [page])

  useEffect(load, [load])

  // Enquanto o entregador tiver alguma entrega própria "a caminho", compartilha
  // a localização em tempo real pro mapa de acompanhamento no dashboard do admin.
  useEffect(() => {
    if (!('geolocation' in navigator) || !user) return
    const minhasSaiu = entregas.filter(e => e.status === 'SAIU_PARA_ENTREGA' && e.entregadorId === user.id)
    if (minhasSaiu.length === 0) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const agora = Date.now()
        if (agora - ultimoEnvioRef.current < INTERVALO_MIN_ENVIO_LOCALIZACAO_MS) return
        ultimoEnvioRef.current = agora
        minhasSaiu.forEach(e => {
          entregaApi.atualizarLocalizacao(e.id, pos.coords.latitude, pos.coords.longitude).catch(() => {})
        })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [entregas, user])

  // Posição do entregador pro mapa de rota embutido no painel — pega uma vez
  // assim que ele tem alguma entrega própria em andamento (não precisa
  // esperar o clique em "Sugerir rota" pra já mostrar o mapa com 1 pedido).
  useEffect(() => {
    if (!('geolocation' in navigator) || !user) return
    const temMinhas = entregas.some(e =>
      (e.status === 'ACEITA' || e.status === 'PRONTO_PARA_ENTREGA' || e.status === 'SAIU_PARA_ENTREGA')
      && e.entregadorId === user.id)
    if (!temMinhas) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setMinhaPosicao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 20_000 }
    )
  }, [entregas, user])

  const sugerirRota = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não disponível neste dispositivo')
      return
    }
    setCarregandoRota(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMinhaPosicao({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        entregaApi.minhaRota(pos.coords.latitude, pos.coords.longitude)
          .then(r => setRota(r.data))
          .catch(() => toast.error('Erro ao calcular a rota'))
          .finally(() => setCarregandoRota(false))
      },
      () => {
        toast.error('Não foi possível obter sua localização')
        setCarregandoRota(false)
      },
      { enableHighAccuracy: true, timeout: 20_000 }
    )
  }

  const alternarExpandido = (id: number) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const acao = async (id: number, fn: () => Promise<unknown>) => {
    setAtualizando(id)
    try { await fn(); load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro')
    } finally { setAtualizando(null) }
  }

  if (loading) return <p className={styles.loading}>Carregando...</p>

  // Sem estágio CONFIRMADA no fluxo novo — a entrega já nasce em ACEITA
  // (produção). "Disponível" agora é ACEITA/pronta sem entregador definido
  // ainda; "minhas" passa a filtrar por entregadorId pra não misturar a
  // corrida de outro entregador (antes só existia uma corrida em ACEITA por
  // vez, a de quem tinha clicado "Aceitar" — agora várias podem estar sem dono).
  const aguardando = entregas.filter(e =>
    (e.status === 'ACEITA' || e.status === 'PRONTO_PARA_ENTREGA') && !e.entregadorId)
  const minhas = entregas.filter(e =>
    (e.status === 'ACEITA' || e.status === 'PRONTO_PARA_ENTREGA' || e.status === 'SAIU_PARA_ENTREGA')
    && e.entregadorId === user?.id)
  // Com alguma entrega já a caminho, o mapa vira "modo navegação": maior na
  // tela e aproximado no próximo destino, tipo Waze — em vez da visão geral
  // de todas as paradas, que é mais útil só na hora de planejar a rota.
  const emNavegacao = minhas.some(e => e.status === 'SAIU_PARA_ENTREGA')

  // Ordem de entrega — a sugerida pelo backend (rota.paradas) quando
  // disponível, ou ordem de chegada (FIFO) como fallback antes de "Sugerir
  // rota" ser clicado, pra sempre dar pra saber qual sai primeiro, mesmo sem
  // ter pedido a sugestão ainda. Os cards são renderizados nessa ordem.
  const ordemPorEntregaId = new Map(rota?.paradas.map(p => [p.entregaId, p.ordem]) ?? [])
  const minhasOrdenadas = [...minhas].sort((a, b) => {
    const oa = ordemPorEntregaId.get(a.id)
    const ob = ordemPorEntregaId.get(b.id)
    if (oa != null && ob != null) return oa - ob
    return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
  })
  const ordemDeEntrega = new Map(minhasOrdenadas.map((e, i) => [e.id, ordemPorEntregaId.get(e.id) ?? i + 1]))

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Painel do Entregador</h1>
        <Button variant="outline" size="sm" onClick={load}>Atualizar</Button>
      </div>

      {/* Minhas entregas em andamento */}
      {minhas.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Em Andamento <Badge variant="warning" size="sm">{minhas.length}</Badge></h2>
            {minhas.length > 1 && (
              <Button variant="outline" size="sm" loading={carregandoRota} onClick={sugerirRota}>Sugerir rota</Button>
            )}
          </div>

          <EntregadorRotaMapa minhas={minhas} rota={rota} origem={minhaPosicao} modoNavegacao={emNavegacao} />

          {rota && rota.paradas.length > 0 && (
            <p className={styles.rotaResumo}>
              Rota sugerida: {rota.distanciaTotalKm} km · ~{Math.round(rota.duracaoTotalMin)} min
              {rota.semCoordenadas.length > 0 && ` · ${rota.semCoordenadas.length} sem endereço geocodificado (fora da sugestão)`}
              {' — '}
              {(() => {
                const url = mapsUrlRota(rota, minhas)
                return url
                  ? <a href={url} target="_blank" rel="noreferrer">abrir rota completa no Maps</a>
                  : null
              })()}
            </p>
          )}

          {minhasOrdenadas.map(e => {
            const parada = rota?.paradas.find(p => p.entregaId === e.id)
            const ordem = ordemDeEntrega.get(e.id)
            const recolhivel = e.status === 'SAIU_PARA_ENTREGA'
            const expandido = !recolhivel || expandidos.has(e.id)
            return (
            <Card key={e.id} className={`${styles.card} ${e.status === 'SAIU_PARA_ENTREGA' ? styles.cardSaiu : e.status === 'PRONTO_PARA_ENTREGA' ? styles.cardPronto : styles.cardAceita}`}>
              {!expandido ? (
                <div className={styles.linhaColapsada}>
                  {minhas.length > 1 && (
                    <Badge variant="primary" size="sm">{ordem}ª entrega</Badge>
                  )}
                  <span className={styles.cardId}>Entrega #{e.id}</span>
                  <button type="button" className={styles.verBtn} onClick={() => alternarExpandido(e.id)}>
                    Ver detalhes
                  </button>
                  <Button size="sm" variant="primary" loading={atualizando === e.id} onClick={() => acao(e.id, () => entregaApi.entregar(e.id))}>
                    Confirmar Entrega
                  </Button>
                </div>
              ) : (
                <>
                  <div className={styles.cardHeader}>
                    {minhas.length > 1 && (
                      <Badge variant="primary" size="sm">{ordem}ª entrega</Badge>
                    )}
                    <span className={styles.cardId}>Entrega #{e.id}</span>
                    <Badge variant={e.status === 'SAIU_PARA_ENTREGA' ? 'warning' : e.status === 'PRONTO_PARA_ENTREGA' ? 'success' : 'info'} size="sm">
                      {STATUS_LABEL[e.status]}
                    </Badge>
                    {parada && (
                      <Badge variant={parada.urgente ? 'danger' : 'info'} size="sm">
                        {parada.distanciaKm} km
                      </Badge>
                    )}
                    <span className={styles.cardTime}>{formatDateTime(e.criadoEm)}</span>
                    {recolhivel && (
                      <button type="button" className={styles.verBtn} onClick={() => alternarExpandido(e.id)}>
                        Ocultar
                      </button>
                    )}
                  </div>

                  <div className={styles.cliente}><strong>{e.clienteNome}</strong>{e.clienteTelefone && ` · ${e.clienteTelefone}`}</div>
                  <div className={styles.endereco}>
                    {e.enderecoRua}, {e.enderecoNumero}{e.enderecoBairro ? ` — ${e.enderecoBairro}` : ''} — {e.enderecoCidade}
                    {e.enderecoComplemento && ` (${e.enderecoComplemento})`}
                  </div>

                  <ul className={styles.itens}>
                    {e.itens.map(i => (
                      <li key={i.id}>{i.quantidade}× {i.produtoNome}</li>
                    ))}
                  </ul>
                  {e.observacao && <p className={styles.obs}><FiFileText size={13} /> {e.observacao}</p>}

                  <div className={styles.cardFooter}>
                    <span className={styles.total}>{formatCurrency(e.total)}</span>
                    <div className={styles.footerActions}>
                      <a className={styles.mapsBtn} href={mapsUrl(e)} target="_blank" rel="noreferrer">
                        Abrir no Maps
                      </a>
                      {(e.status === 'ACEITA' || e.status === 'PRONTO_PARA_ENTREGA') && (
                        <Button
                          size="sm"
                          loading={atualizando === e.id}
                          disabled={e.origemWhatsapp && e.status === 'ACEITA'}
                          onClick={() => acao(e.id, () => entregaApi.saiu(e.id))}
                        >
                          {e.origemWhatsapp && e.status === 'ACEITA' ? 'Aguardando cozinha...' : 'Saiu para entrega'}
                        </Button>
                      )}
                      {e.status === 'SAIU_PARA_ENTREGA' && (
                        <Button size="sm" variant="primary" loading={atualizando === e.id} onClick={() => acao(e.id, () => entregaApi.entregar(e.id))}>
                          Confirmar Entrega
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </Card>
            )
          })}
        </section>
      )}

      {/* Novas entregas disponíveis */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Disponíveis <Badge variant="info" size="sm">{aguardando.length}</Badge></h2>
        {aguardando.length === 0 ? (
          <p className={styles.empty}>Nenhuma entrega aguardando.</p>
        ) : (
          aguardando.map(e => (
            <Card key={e.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardId}>Entrega #{e.id}</span>
                <Badge variant="info" size="sm">Disponível</Badge>
                <span className={styles.cardTime}>{formatDateTime(e.criadoEm)}</span>
              </div>

              <div className={styles.cliente}><strong>{e.clienteNome}</strong>{e.clienteTelefone && ` · ${e.clienteTelefone}`}</div>
              <div className={styles.endereco}>
                {e.enderecoRua}, {e.enderecoNumero}{e.enderecoBairro ? ` — ${e.enderecoBairro}` : ''} — {e.enderecoCidade}
                {e.enderecoComplemento && ` (${e.enderecoComplemento})`}
              </div>

              <ul className={styles.itens}>
                {e.itens.map(i => (
                  <li key={i.id}>{i.quantidade}× {i.produtoNome}</li>
                ))}
              </ul>

              <div className={styles.cardFooter}>
                <span className={styles.total}>{formatCurrency(e.total)}</span>
                <div className={styles.footerActions}>
                  <a className={styles.mapsBtn} href={mapsUrl(e)} target="_blank" rel="noreferrer">
                    Ver rota
                  </a>
                  <Button size="sm" loading={atualizando === e.id} onClick={() => acao(e.id, () => entregaApi.atribuirEntregador(e.id))}>
                    Aceitar
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
