let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

interface BeepOptions {
  frequency?: number
  duration?: number
  volume?: number
}

export function playBeep({ frequency = 880, duration = 300, volume = 0.5 }: BeepOptions = {}): void {
  try {
    const ctx = getAudioCtx()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration / 1000)
  } catch {
    // audio not supported or context suspended
  }
}

export function playAlertaCozinha(): void {
  playBeep({ frequency: 660, duration: 200, volume: 0.6 })
  setTimeout(() => playBeep({ frequency: 880, duration: 200, volume: 0.6 }), 250)
  setTimeout(() => playBeep({ frequency: 1100, duration: 300, volume: 0.6 }), 500)
}

export function playAlertaGarcon(): void {
  playBeep({ frequency: 1047, duration: 400, volume: 0.7 })
  setTimeout(() => playBeep({ frequency: 1047, duration: 400, volume: 0.7 }), 500)
}

// Três sons reais (arquivos em assets/sound) para o alerta de pedido de
// cliente (WhatsApp/cardápio) aguardando aceite/rejeição — o admin escolhe um
// em Configurações. Tocam em loop até a decisão ser tomada (ver
// NotificationContext).
import som1Url from '../assets/sound/freesound_community-ac-bel-105874.mp3'
import som2Url from '../assets/sound/freesound_community-old-style-phone-ringer-37761.mp3'
import som3Url from '../assets/sound/freesound_community-winner-bell-game-show-91932.mp3'

export type TipoAlertaPedido = 'SOM_1' | 'SOM_2' | 'SOM_3'

export const OPCOES_ALERTA_PEDIDO: { valor: TipoAlertaPedido; label: string }[] = [
  { valor: 'SOM_1', label: 'Som 1' },
  { valor: 'SOM_2', label: 'Som 2' },
  { valor: 'SOM_3', label: 'Som 3' },
]

const SONS_PEDIDO: Record<TipoAlertaPedido, string> = {
  SOM_1: som1Url,
  SOM_2: som2Url,
  SOM_3: som3Url,
}

export function playAlertaPedidoCliente(tipo: TipoAlertaPedido = 'SOM_1'): void {
  try {
    const audio = new Audio(SONS_PEDIDO[tipo] ?? SONS_PEDIDO.SOM_1)
    audio.volume = 0.8
    void audio.play()
  } catch {
    // audio not supported
  }
}
