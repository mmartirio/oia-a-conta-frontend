import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { LeafletEvent } from 'leaflet'
import { entregaApi } from '../api/entregaApi'
import { restauranteApi } from '../api/restauranteApi'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useToast } from '../contexts/ToastContext'
import { formatRelativeTime } from '../utils/formatters'
import { geocodificarEndereco, type Coordenada } from '../utils/geocoding'
import type { Entrega } from '../types'
import styles from './EntregaMapa.module.css'

// O bundler (Vite) não resolve os caminhos relativos que o Leaflet usa por
// padrão pros ícones do marcador — sem isso o marcador renderiza quebrado.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Centro geográfico do Brasil — usado como fallback pra mapa sempre aparecer
// mesmo antes de o endereço do restaurante ser configurado/geocodificado.
const CENTRO_PADRAO: Coordenada = { lat: -14.235004, lng: -51.92528 }

const iconeRestaurante = L.divIcon({
  className: styles.iconeRestaurante,
  html: '🏠',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const iconeEntregador = L.divIcon({
  className: styles.iconeEntregador,
  html: '🏍️',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const RAIO_VISAO_RESTAURANTE_KM = 0.3

// MapContainer só aplica `center`/`zoom` na primeira renderização — pra
// reenquadrar o mapa sempre que o endereço do restaurante mudar (geocodificado
// ou arrastado), precisamos chamar fitBounds imperativamente via useMap().
// fitBounds também calcula o zoom certo pro tamanho atual do container, o que
// um zoom fixo não conseguiria (a distância coberta por um zoom varia com a
// latitude e com o tamanho da tela).
function AjustarVisaoRestaurante({ centro }: { centro: Coordenada }) {
  const map = useMap()
  useEffect(() => {
    const ajustar = () => {
      // O container do mapa (.mapaWrap) tem a altura definida por flex e só
      // assume o tamanho final depois do primeiro paint — se o Leaflet calcular
      // o fitBounds com o tamanho desatualizado, o zoom sai errado. invalidateSize
      // força reler as dimensões atuais antes de ajustar os limites.
      map.invalidateSize()
      const latDelta = RAIO_VISAO_RESTAURANTE_KM / 111
      const lngDelta = RAIO_VISAO_RESTAURANTE_KM / (111 * Math.cos((centro.lat * Math.PI) / 180))
      map.fitBounds([
        [centro.lat - latDelta, centro.lng - lngDelta],
        [centro.lat + latDelta, centro.lng + lngDelta],
      ])
    }
    ajustar()

    // O mapa divide o Dashboard com outros cards que carregam dados de forma
    // assíncrona (mesas, comandas, resumo do dia) — se algum deles ainda
    // estiver em skeleton quando o efeito acima roda, o fitBounds usa um
    // tamanho de container que ainda vai mudar, e como esse efeito só reage
    // a mudança de endereço, o zoom nunca é corrigido depois. Reobservar o
    // container e reajustar a cada mudança de tamanho cobre esse caso.
    const resizeObserver = new ResizeObserver(ajustar)
    resizeObserver.observe(map.getContainer())
    return () => resizeObserver.disconnect()
  }, [centro.lat, centro.lng, map])
  return null
}

interface EventoLocalizacao {
  restauranteId: number
  entregaId: number
  entregadorNome?: string
  latitude: number
  longitude: number
  atualizadoEm: string
}

export function EntregaMapa() {
  const { user } = useAuth()
  const { subscribe, unsubscribe, connected } = useWebSocket()
  const toast = useToast()
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [loading, setLoading] = useState(true)
  const [localizacaoRestaurante, setLocalizacaoRestaurante] = useState<Coordenada | null>(null)
  const [localizacaoManual, setLocalizacaoManual] = useState(false)
  const [nomeRestaurante, setNomeRestaurante] = useState('')
  const [salvandoLocalizacao, setSalvandoLocalizacao] = useState(false)
  const entregasRef = useRef<Entrega[]>([])

  useEffect(() => { entregasRef.current = entregas }, [entregas])

  const carregar = () => {
    entregaApi.listarEmRota()
      .then(r => setEntregas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(carregar, [])

  // Endereço cadastrado nos Dados da Empresa — usado como referência no mapa
  // quando não há nenhum entregador em atividade no momento. Se o admin já
  // ajustou o marcador manualmente (arrastar), essa posição salva tem
  // prioridade sobre a geocodificação automática do endereço.
  useEffect(() => {
    restauranteApi.buscarDados().then(r => {
      const d = r.data
      setNomeRestaurante(d.nome)

      if (d.latitude != null && d.longitude != null) {
        setLocalizacaoRestaurante({ lat: d.latitude, lng: d.longitude })
        setLocalizacaoManual(true)
        return
      }

      const endereco = [d.enderecoRua, d.enderecoNumero, d.enderecoBairro, d.enderecoCidade]
        .filter(Boolean).join(', ')
      if (!endereco) return
      geocodificarEndereco(endereco).then(setLocalizacaoRestaurante)
    }).catch(() => {})
  }, [])

  const handleArrastarMarcadorRestaurante = (e: LeafletEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { lat, lng } = (e.target as any).getLatLng()
    setLocalizacaoRestaurante({ lat, lng })
    setLocalizacaoManual(true)
    setSalvandoLocalizacao(true)
    restauranteApi.atualizarLocalizacao(lat, lng)
      .then(() => toast.success('Localização do restaurante atualizada'))
      .catch(() => toast.error('Erro ao salvar a localização'))
      .finally(() => setSalvandoLocalizacao(false))
  }

  useEffect(() => {
    if (!connected || !user) return
    const sub = subscribe(`/topic/entrega-localizacao/${user.restauranteId}`, (payload) => {
      const evento = payload as EventoLocalizacao
      const existente = entregasRef.current.find(e => e.id === evento.entregaId)
      if (existente) {
        setEntregas(prev => prev.map(e => e.id === evento.entregaId
          ? { ...e, latitude: evento.latitude, longitude: evento.longitude, localizacaoAtualizadaEm: evento.atualizadoEm }
          : e))
      } else {
        // Entrega saiu para entrega depois do carregamento inicial — busca a lista atualizada
        carregar()
      }
    })
    return () => unsubscribe(sub)
  }, [connected, user])

  const comLocalizacao = entregas.filter(e => e.latitude != null && e.longitude != null)

  if (loading) return null

  // Sem entregador em rota — o mapa continua à vista, centrado no endereço do
  // restaurante quando disponível, ou num centro padrão até ele ser configurado.
  if (comLocalizacao.length === 0) {
    const centro = localizacaoRestaurante ?? CENTRO_PADRAO

    return (
      <div className={styles.mapaWrap}>
        <MapContainer
          center={[centro.lat, centro.lng]}
          zoom={localizacaoRestaurante ? 15 : 4}
          className={styles.mapa}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {localizacaoRestaurante && <AjustarVisaoRestaurante centro={localizacaoRestaurante} />}
          <Marker
            position={[centro.lat, centro.lng]}
            icon={iconeRestaurante}
            draggable
            eventHandlers={{ dragend: handleArrastarMarcadorRestaurante }}
          >
            <Popup>
              <strong>{nomeRestaurante || 'Seu restaurante'}</strong><br />
              Nenhum entregador em atividade no momento.<br />
              <span className={styles.popupHora}>
                {salvandoLocalizacao
                  ? 'Salvando localização...'
                  : localizacaoManual
                    ? 'Localização ajustada manualmente.'
                    : localizacaoRestaurante
                      ? 'Endereço estimado automaticamente.'
                      : 'Arraste o marcador até o endereço do restaurante.'}
                {' '}Arraste o marcador se o local estiver errado.
              </span>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    )
  }

  const centro: [number, number] = [
    comLocalizacao.reduce((acc, e) => acc + e.latitude!, 0) / comLocalizacao.length,
    comLocalizacao.reduce((acc, e) => acc + e.longitude!, 0) / comLocalizacao.length,
  ]

  return (
    <div className={styles.mapaWrap}>
      <MapContainer center={centro} zoom={13} className={styles.mapa} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {comLocalizacao.map(e => (
          <Marker key={e.id} position={[e.latitude!, e.longitude!]} icon={iconeEntregador}>
            <Popup>
              <strong>{e.entregadorNome ?? 'Entregador'}</strong><br />
              Entrega #{e.id} — {e.clienteNome}<br />
              {e.enderecoRua}, {e.enderecoNumero}
              {e.enderecoBairro ? ` — ${e.enderecoBairro}` : ''}<br />
              {e.localizacaoAtualizadaEm && (
                <span className={styles.popupHora}>Atualizado {formatRelativeTime(e.localizacaoAtualizadaEm)}</span>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
