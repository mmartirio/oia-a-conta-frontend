import { useEffect, useState, useCallback, useRef } from 'react'
import { FiFileText } from 'react-icons/fi'
import { entregaApi } from '../../api/entregaApi'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency, formatDateTime } from '../../utils/formatters'
import type { Entrega } from '../../types'
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

export function EntregadorPainel() {
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
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

  const acao = async (id: number, fn: () => Promise<unknown>) => {
    setAtualizando(id)
    try { await fn(); load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro')
    } finally { setAtualizando(null) }
  }

  if (loading) return <p className={styles.loading}>Carregando...</p>

  const aguardando = entregas.filter(e => e.status === 'CONFIRMADA')
  const minhas = entregas.filter(e => e.status === 'ACEITA' || e.status === 'PRONTO_PARA_ENTREGA' || e.status === 'SAIU_PARA_ENTREGA')

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Painel do Entregador</h1>
        <Button variant="outline" size="sm" onClick={load}>Atualizar</Button>
      </div>

      {/* Minhas entregas em andamento */}
      {minhas.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Em Andamento <Badge variant="warning" size="sm">{minhas.length}</Badge></h2>
          {minhas.map(e => (
            <Card key={e.id} className={`${styles.card} ${e.status === 'SAIU_PARA_ENTREGA' ? styles.cardSaiu : e.status === 'PRONTO_PARA_ENTREGA' ? styles.cardPronto : styles.cardAceita}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardId}>Entrega #{e.id}</span>
                <Badge variant={e.status === 'SAIU_PARA_ENTREGA' ? 'warning' : e.status === 'PRONTO_PARA_ENTREGA' ? 'success' : 'info'} size="sm">
                  {STATUS_LABEL[e.status]}
                </Badge>
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
            </Card>
          ))}
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
                  <Button size="sm" loading={atualizando === e.id} onClick={() => acao(e.id, () => entregaApi.aceitar(e.id))}>
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
