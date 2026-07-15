import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from './Button'
import styles from './QrCodeLink.module.css'

interface QrCodeLinkProps {
  value: string
  fileName?: string
}

export function QrCodeLink({ value, fileName = 'qrcode-cardapio.png' }: QrCodeLinkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    QRCode.toCanvas(canvasRef.current, value, { width: 176, margin: 1 }, err => {
      setErro(!!err)
    })
  }, [value])

  const handleBaixar = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = fileName
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (!value) return null

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {erro
        ? <span className={styles.hint}>Não foi possível gerar o QR code.</span>
        : (
          <Button type="button" variant="outline" onClick={handleBaixar}>
            Baixar QR code
          </Button>
        )}
    </div>
  )
}
