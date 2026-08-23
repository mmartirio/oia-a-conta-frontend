export interface PontoRota {
  lat: number
  lng: number
}

// Geometria real da rota (por ruas), via OSRM — servidor público de
// demonstração do próprio projeto OSRM, gratuito e sem chave, mesma escolha
// já usada no backend (order-service, OSRM_URL). "Light usage": se falhar ou
// não responder, quem chama deve cair pra uma linha reta entre os pontos.
export async function buscarGeometriaRota(pontos: PontoRota[]): Promise<PontoRota[] | null> {
  if (pontos.length < 2) return null
  try {
    const coordenadas = pontos.map(p => `${p.lng},${p.lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson`
    const resp = await fetch(url)
    const dados = await resp.json()
    const linha = dados?.routes?.[0]?.geometry?.coordinates
    if (!Array.isArray(linha) || linha.length === 0) return null
    return linha.map((c: [number, number]) => ({ lng: c[0], lat: c[1] }))
  } catch {
    return null
  }
}
