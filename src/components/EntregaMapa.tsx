import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { FiTruck } from 'react-icons/fi'
import type { LeafletEvent } from 'leaflet'
import { entregaApi } from '../api/entregaApi'
import { restauranteApi } from '../api/restauranteApi'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { formatRelativeTime } from '../utils/formatters'
import type { Entrega } from '../types'
import styles from './EntregaMapa.module.css'

// O bundler (Vite) não resolve os caminhos relativos que o Leaflet usa por
// padrão pros ícones do marcador — sem isso o marcador renderiza quebrado.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const iconeRestaurante = L.divIcon({
  className: styles.iconeRestaurante,
  html: '🏠',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

interface EventoLocalizacao {
  restauranteId: number
  entregaId: number
  entregadorNome?: string
  latitude: number
  longitude: number
  atualizadoEm: string
}

interface Coordenada {
  lat: number
  lng: number
}

// Nominatim (OpenStreetMap) é gratuito e não exige API key — compatível com
// o Leaflet que já usamos, sem depender de billing do Google Maps. Guarda o
// resultado em sessionStorage pra não geocodificar o mesmo endereço de novo
// a cada vez que o dashboard é aberto (respeita o uso razoável da API pública).
async function geocodificarEnderecoRestaurante(endereco: string): Promise<Coordenada | null> {
  const chaveCache = `geocode:${endereco}`
  const emCache = sessionStorage.getItem(chaveCache)
  if (emCache) {
    try { return JSON.parse(emCache) } catch { /* ignora cache inválido */ }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`
    const resp = await fetch(url)
    const dados = await resp.json()
    if (!Array.isArray(dados) || dados.length === 0) return null
    const coordenada: Coordenada = { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) }
    sessionStorage.setItem(chaveCache, JSON.stringify(coordenada))
    return coordenada
  } catch {
    return null
  }
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
      geocodificarEnderecoRestaurante(endereco).then(setLocalizacaoRestaurante)
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

  // Sem entregador em rota — mostra o mapa centrado no endereço do restaurante, se disponível.
  if (comLocalizacao.length === 0) {
    if (!localizacaoRestaurante) {
      return (
        <EmptyState
          icon={FiTruck}
          title="Nenhuma entrega em rota"
          description="Quando um entregador sair para entrega, a localização aparece aqui em tempo real."
        />
      )
    }

    return (
      <div className={styles.mapaWrap}>
        <MapContainer
          center={[localizacaoRestaurante.lat, localizacaoRestaurante.lng]}
          zoom={15}
          className={styles.mapa}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[localizacaoRestaurante.lat, localizacaoRestaurante.lng]}
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
                    : 'Endereço estimado automaticamente.'}
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
          <Marker key={e.id} position={[e.latitude!, e.longitude!]}>
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
