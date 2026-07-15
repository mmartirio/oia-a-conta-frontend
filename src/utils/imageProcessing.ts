// Remove fundo branco/quase-branco de uma imagem, tornando esses pixels
// transparentes (com uma borda suave em vez de corte abrupto), e devolve o
// resultado como PNG (data URI). Pixels que não são neutros (ou seja, têm uma
// cor de verdade, não uma tonalidade de cinza/branco) são mantidos intactos —
// só o fundo branco "chapado" é afetado.
export function removerFundoBranco(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas não suportado')); return }

      ctx.drawImage(img, 0, 0)
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
