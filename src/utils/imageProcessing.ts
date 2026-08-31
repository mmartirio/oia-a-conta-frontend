export interface OpcoesCompressaoImagem {
  // Tamanho máximo do resultado (data URI, em caracteres) — mesma unidade
  // que o backend valida (ver *_MAX_CHARS em ProdutoService/ComboService no
  // catalog-service e RestauranteService no auth-service).
  maxCaracteres: number
  maxDimensao?: number
  qualidadeInicial?: number
}

// Redimensiona e recomprime uma imagem pra caber num limite de tamanho, em
// vez de simplesmente rejeitar o upload. PNG é mantido como PNG (preserva
// transparência, útil pra logo) — como é sem perda, só o redimensionamento
// ajuda a reduzir o tamanho nesse caso. Qualquer outro formato vira JPEG,
// com a qualidade reduzida em passos até caber; se mesmo no piso de
// qualidade ainda estiver grande (fotos muito grandes), reduz a dimensão
// mais uma vez como último recurso.
export function comprimirImagem(file: File, opcoes: OpcoesCompressaoImagem): Promise<string> {
  const { maxCaracteres, maxDimensao = 1600, qualidadeInicial = 0.85 } = opcoes

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let largura = img.naturalWidth
      let altura = img.naturalHeight
      const maiorLado = Math.max(largura, altura)
      if (maiorLado > maxDimensao) {
        const escala = maxDimensao / maiorLado
        largura = Math.round(largura * escala)
        altura = Math.round(altura * escala)
      }

      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas não suportado')); return }

      let manterPng = file.type === 'image/png'
      let mime = manterPng ? 'image/png' : 'image/jpeg'

      // JPEG não tem canal alfa — se a imagem original tiver áreas
      // transparentes (ex: PNG/WEBP recortado que não preenche o quadro), o
      // canvas exporta essas áreas como preto por padrão. Preenchendo de
      // branco antes de desenhar, a área transparente vira fundo branco em
      // vez de preto.
      if (!manterPng) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, largura, altura)

      let qualidade = qualidadeInicial
      let dataUri = manterPng ? canvas.toDataURL(mime) : canvas.toDataURL(mime, qualidade)

      // PNG é sem perda — se mesmo redimensionado ainda estourar o limite
      // (comum em artes cheias de gradiente/textura, ex: cardápio ilustrado),
      // redimensionar sozinho não resolve. Cai pra JPEG a partir daqui —
      // perde transparência (ganha fundo branco), mas passa a comprimir de
      // verdade pelo loop de qualidade abaixo.
      if (manterPng && dataUri.length > maxCaracteres) {
        manterPng = false
        mime = 'image/jpeg'
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, largura, altura)
        dataUri = canvas.toDataURL(mime, qualidade)
      }

      while (!manterPng && dataUri.length > maxCaracteres && qualidade > 0.35) {
        qualidade -= 0.1
        dataUri = canvas.toDataURL(mime, qualidade)
      }

      if (!manterPng && dataUri.length > maxCaracteres) {
        canvas.width = Math.round(largura * 0.7)
        canvas.height = Math.round(altura * 0.7)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        dataUri = canvas.toDataURL(mime, 0.6)
      }

      resolve(dataUri)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível carregar a imagem'))
    }

    img.src = objectUrl
  })
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// HSL só pra clarear/escurecer mantendo o matiz — evita reimportar uma lib
// só pra isso, e o cardápio já usa cor em hex em todo lugar.
function ajustarLuminosidade(hex: string, deltaL: number): string {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  const novoL = Math.max(0, Math.min(1, l + deltaL))
  const c = (1 - Math.abs(2 * novoL - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = novoL - c / 2
  let [r2, g2, b2] = [0, 0, 0]
  if (h < 60) [r2, g2, b2] = [c, x, 0]
  else if (h < 120) [r2, g2, b2] = [x, c, 0]
  else if (h < 180) [r2, g2, b2] = [0, c, x]
  else if (h < 240) [r2, g2, b2] = [0, x, c]
  else if (h < 300) [r2, g2, b2] = [x, 0, c]
  else [r2, g2, b2] = [c, 0, x]
  return rgbToHex(Math.round((r2 + m) * 255), Math.round((g2 + m) * 255), Math.round((b2 + m) * 255))
}

// Distância euclidiana simples no espaço RGB — suficiente pra decidir se
// duas cores são "parecidas demais" pra servir de primária/secundária/destaque.
function distanciaCor(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

// Luminância relativa (WCAG) — decide se o texto sobre o gradiente das cores
// extraídas deve ser branco ou escuro pra manter contraste legível.
function luminanciaRelativa([r, g, b]: [number, number, number]): number {
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export interface PaletaExtraida {
  corPrimaria: string
  corSecundaria: string
  corAccent: string
  corTexto: string
}

// Extrai uma paleta de 3 cores (+ cor de texto com contraste garantido) a
// partir dos pixels de fato coloridos da logo — ignora transparência e
// pixels neutros (fundo branco/preto/cinza que sobrou de quem não marcou
// "remover fundo"), pra não deixar o fundo dominar a cor "mais frequente".
// Se a logo não tiver cor suficiente (ex: preto e branco), deriva secundária/
// destaque clareando e escurecendo a única cor encontrada, em vez de cair
// pras cores padrão da marca — o objetivo é sempre refletir a logo enviada.
export function extrairPaletaCores(dataUri: string): Promise<PaletaExtraida> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const TAM = 64
      const canvas = document.createElement('canvas')
      canvas.width = TAM
      canvas.height = TAM
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas não suportado')); return }
      ctx.drawImage(img, 0, 0, TAM, TAM)
      const { data } = ctx.getImageData(0, 0, TAM, TAM)

      const contagem = new Map<string, { cor: [number, number, number]; n: number }>()
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3]
        if (alpha < 128) continue // transparente — não é "cor da logo"
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const min = Math.min(r, g, b), max = Math.max(r, g, b)
        if (max - min < 20 && (min < 30 || min > 225)) continue // neutro extremo (fundo)

        // Quantiza em baldes de 24 por canal — reduz ruído de anti-aliasing
        // sem achatar demais a paleta.
        const rq = Math.round(r / 24) * 24, gq = Math.round(g / 24) * 24, bq = Math.round(b / 24) * 24
        const key = `${rq},${gq},${bq}`
        const atual = contagem.get(key)
        if (atual) atual.n++
        else contagem.set(key, { cor: [rq, gq, bq], n: 1 })
      }

      const ordenadas = [...contagem.values()].sort((a, b) => b.n - a.n)

      if (ordenadas.length === 0) {
        // Logo sem nenhum pixel colorido detectável (ex: só preto/branco/transparente).
        resolve({ corPrimaria: '#333333', corSecundaria: '#666666', corAccent: '#111111', corTexto: '#FFFFFF' })
        return
      }

      const DIST_MIN = 70
      const primaria = ordenadas[0].cor
      const secundaria = ordenadas.find(c => distanciaCor(c.cor, primaria) > DIST_MIN)?.cor
      const escolhidas = [primaria, secundaria].filter((c): c is [number, number, number] => !!c)
      const accent = ordenadas.find(c => escolhidas.every(e => distanciaCor(c.cor, e) > DIST_MIN))?.cor

      const corPrimaria = rgbToHex(...primaria)
      const corSecundaria = secundaria ? rgbToHex(...secundaria) : ajustarLuminosidade(corPrimaria, -0.15)
      const corAccent = accent ? rgbToHex(...accent) : ajustarLuminosidade(corPrimaria, 0.2)

      const lumMedia = (luminanciaRelativa(primaria) + luminanciaRelativa(secundaria ?? primaria)) / 2
      const corTexto = lumMedia > 0.5 ? '#1A1A1A' : '#FFFFFF'

      resolve({ corPrimaria, corSecundaria, corAccent, corTexto })
    }
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'))
    img.src = dataUri
  })
}

// Remove fundo branco/quase-branco de uma imagem, tornando esses pixels
// transparentes (com uma borda suave em vez de corte abrupto), e devolve o
// resultado como PNG (data URI). Pixels que não são neutros (ou seja, têm uma
// cor de verdade, não uma tonalidade de cinza/branco) são mantidos intactos —
// só o fundo branco "chapado" é afetado.
export function removerFundoBranco(file: File, maxDimensao = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // PNG é sem perda — pra caber no limite do backend, a única alavanca
      // aqui é reduzir a dimensão antes de processar (mantém a transparência).
      let largura = img.naturalWidth
      let altura = img.naturalHeight
      const maiorLado = Math.max(largura, altura)
      if (maiorLado > maxDimensao) {
        const escala = maxDimensao / maiorLado
        largura = Math.round(largura * escala)
        altura = Math.round(altura * escala)
      }

      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas não suportado')); return }

      ctx.drawImage(img, 0, 0, largura, altura)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      const LOW = 200  // abaixo disso: mantém 100% opaco
      const HIGH = 248 // acima disso: 100% transparente

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const min = Math.min(r, g, b)
        const max = Math.max(r, g, b)
        if (max - min > 20) continue // cor de verdade (não neutra) — não mexe

        if (min >= HIGH) {
          data[i + 3] = 0
        } else if (min > LOW) {
          const fator = (HIGH - min) / (HIGH - LOW)
          data[i + 3] = Math.round(data[i + 3] * (1 - fator))
        }
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível carregar a imagem'))
    }

    img.src = objectUrl
  })
}
