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
