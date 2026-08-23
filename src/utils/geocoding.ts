export interface Coordenada {
  lat: number
  lng: number
}

// Nominatim (OpenStreetMap) é gratuito e não exige API key. Guarda o
// resultado em sessionStorage pra não geocodificar o mesmo endereço de novo
// a cada vez (respeita o uso razoável da API pública).
export async function geocodificarEndereco(endereco: string): Promise<Coordenada | null> {
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
