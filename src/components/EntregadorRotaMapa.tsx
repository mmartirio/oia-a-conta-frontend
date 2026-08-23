import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { buscarGeometriaRota } from '../utils/rota'
import type { Entrega, RotaSugerida } from '../types'
import styles from './EntregadorRotaMapa.module.css'

// O bundler (Vite) não resolve os caminhos relativos que o Leaflet usa por
// padrão pros ícones do marcador — sem isso o marcador renderiza quebrado.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const iconeEntregador = L.divIcon({
  className: styles.iconeEntregador,
  html: '🏍️',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function iconeParada(ordem: number) {
  return L.divIcon({
    className: styles.iconeParada,
    html: String(ordem),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

interface Posicao {
  lat: number
  lng: number
}

interface Parada {
  entrega: Entrega
  ordem: number
}

// MapContainer só aplica center/zoom na primeira renderização — reenquadra
// pra caber a origem + todas as paradas sempre que a lista mudar (nova
// localização do entregador, pedido aceito/entregue etc). Em modo navegação
// (alguma entrega já "a caminho"), em vez de mostrar a rota inteira,
// centraliza e aproxima na posição atual do entregador — tipo Waze, pra dar
// orientação de rua em vez da visão geral que só interessa antes de sair.
function AjustarVisao({ pontos, modoNavegacao }: { pontos: Posicao[]; modoNavegacao: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length === 0) return
    map.invalidateSize()
    if (modoNavegacao) {
      map.setView([pontos[0].lat, pontos[0].lng], 17)
      return
    }
    if (pontos.length === 1) {
      map.setView([pontos[0].lat, pontos[0].lng], 15)
      return
    }
    map.fitBounds(pontos.map(p => [p.lat, p.lng] as [number, number]), { padding: [32, 32] })
  }, [pontos, modoNavegacao, map])
  return null
}

export function EntregadorRotaMapa({ minhas, rota, origem, modoNavegacao = false }: {
  minhas: Entrega[]
  rota: RotaSugerida | null
  origem: Posicao | null
  modoNavegacao?: boolean
}) {
  // Ordem de exibição: a sugerida pela rota (já com o desempate por ordem de
  // chegada aplicado no backend), ou ordem de chegada como fallback antes de
  // "Sugerir rota" ser clicado.
  const ordemPorEntregaId = new Map(rota?.paradas.map(p => [p.entregaId, p.ordem]) ?? [])
  const paradas: Parada[] = minhas
    .filter(e => e.enderecoLatitude != null && e.enderecoLongitude != null)
    .sort((a, b) => {
      const oa = ordemPorEntregaId.get(a.id)
      const ob = ordemPorEntregaId.get(b.id)
      if (oa != null && ob != null) return oa - ob
      return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
    })
    .map((e, i) => ({ entrega: e, ordem: ordemPorEntregaId.get(e.id) ?? i + 1 }))

  const semCoordenadas = minhas.filter(e => e.enderecoLatitude == null || e.enderecoLongitude == null)

  const pontos: Posicao[] = [
    ...(origem ? [origem] : []),
    ...paradas.map(p => ({ lat: p.entrega.enderecoLatitude!, lng: p.entrega.enderecoLongitude! })),
  ]
  // Chave estável pros pontos (o array em si é recriado a cada render) — só
  // busca a geometria de novo se a posição realmente mudou o suficiente pra
  // importar (5 casas decimais ~ 1m de precisão).
  const pontosChave = pontos.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';')

  // Geometria real da rota por ruas via OSRM — sem isso (ou se a chamada
  // falhar), cai pra linha reta entre os pontos (ver Polyline abaixo).
  const [geometria, setGeometria] = useState<Posicao[] | null>(null)
  useEffect(() => {
    let cancelado = false
    setGeometria(null)
    if (pontos.length >= 2) {
      buscarGeometriaRota(pontos).then(g => { if (!cancelado) setGeometria(g) })
    }
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontosChave])

  if (paradas.length === 0) {
    return (
      <div className={styles.semMapa}>
        {origem
          ? 'Nenhum endereço com coordenada disponível pra mostrar no mapa ainda.'
          : 'Ative a localização pra ver o mapa da rota.'}
      </div>
    )
  }

  const centro = pontos[0]
  const linhaRota = geometria ?? pontos

  return (
    <div className={`${styles.mapaWrap} ${modoNavegacao ? styles.mapaWrapNavegacao : ''}`}>
      {modoNavegacao && <div className={styles.faixaNavegacao}>🧭 Navegando até a próxima parada</div>}
      <MapContainer
        center={[centro.lat, centro.lng]}
        zoom={14}
        className={`${styles.mapa} ${modoNavegacao ? styles.mapaNavegacao : ''}`}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarVisao pontos={pontos} modoNavegacao={modoNavegacao} />

        {origem && (
          <Marker position={[origem.lat, origem.lng]} icon={iconeEntregador}>
            <Popup>Sua localização</Popup>
          </Marker>
        )}

        {paradas.map(({ entrega, ordem }) => (
          <Marker
            key={entrega.id}
            position={[entrega.enderecoLatitude!, entrega.enderecoLongitude!]}
            icon={iconeParada(ordem)}
          >
            <Popup>
              <strong>{ordem}ª parada — {entrega.clienteNome}</strong><br />
              {entrega.enderecoRua}, {entrega.enderecoNumero}
              {entrega.enderecoBairro ? ` — ${entrega.enderecoBairro}` : ''}
            </Popup>
          </Marker>
        ))}

        {/* Trajeto real por ruas (via OSRM) quando disponível; enquanto
            carrega ou se a chamada falhar, cai pra linha reta entre os
            pontos (tracejada, pra ficar claro que é só uma estimativa). */}
        <Polyline
          positions={linhaRota.map(p => [p.lat, p.lng] as [number, number])}
          pathOptions={geometria
            ? { color: '#f59e0b', weight: 4 }
            : { color: '#f59e0b', weight: 3, dashArray: '6 8' }}
        />
      </MapContainer>

      {semCoordenadas.length > 0 && (
        <p className={styles.avisoSemCoordenadas}>
          {semCoordenadas.length === 1
            ? '1 entrega sem coordenada não aparece no mapa — use "Abrir no Maps" pra ela.'
            : `${semCoordenadas.length} entregas sem coordenada não aparecem no mapa — use "Abrir no Maps" pra elas.`}
        </p>
      )}
    </div>
  )
}
