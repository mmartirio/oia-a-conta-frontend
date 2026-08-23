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

// Guarda o <audio> tocando agora pra dar pra interromper na hora (ver
// pararAlertaPedidoCliente) — sem isso, aceitar/recusar o pedido só impedia
// o PRÓXIMO play() (o do setInterval em NotificationContext), mas o som que
// já estava tocando no momento do clique seguia até o fim sozinho (os
// arquivos duram vários segundos), dando a impressão de que o alerta "não
// parava" mesmo após decidir o pedido.
let audioPedidoAtual: HTMLAudioElement | null = null

export function playAlertaPedidoCliente(tipo: TipoAlertaPedido = 'SOM_1'): void {
  try {
    // Se já tem um som de pedido tocando (teste anterior ou alerta em
    // andamento), para ele antes de tocar o novo — senão os dois ficam
    // tocando juntos, já que trocar só a referência não pausa o Audio antigo.
    pararAlertaPedidoCliente()
    const audio = new Audio(SONS_PEDIDO[tipo] ?? SONS_PEDIDO.SOM_1)
    audio.volume = 0.8
    audioPedidoAtual = audio
    audio.play().catch(err => {
      // Causa mais comum: política de autoplay do navegador bloqueando som
      // antes de qualquer interação do usuário na página — ver
      // desbloquearAudioPedido(), chamada no primeiro clique/tecla do app.
      console.warn('Não foi possível tocar o alerta de novo pedido:', err)
    })
  } catch {
    // audio not supported
  }
}

// Interrompe imediatamente o alerta de pedido de cliente que estiver tocando
// agora — chamada ao aceitar/recusar um pedido (ver NotificationContext),
// pra não esperar o áudio em andamento chegar sozinho ao fim.
export function pararAlertaPedidoCliente(): void {
  if (!audioPedidoAtual) return
  try {
    audioPedidoAtual.pause()
    audioPedidoAtual.currentTime = 0
  } catch {
    // audio not supported
  }
  audioPedidoAtual = null
}

// Notificação sonora de mensagem do WhatsApp — nova mensagem chegando (via
// WebSocket) ou mensagens não lidas encontradas ao abrir a plataforma (ver
// NotificationContext). Toca uma vez só, sem loop (diferente do alerta de
// pedido, que repete até alguém decidir).
import notificacaoWhatsappUrl from '../assets/sound/notificação-whatsapp.mp3'
// Notificação falada — disparada manualmente por um botão (ver
// AdminWhatsappConversas), não automática.
import notificacaoFaladaUrl from '../assets/sound/notificação-falada.mp3'

// Retorna a Promise de play() (rejeitada se o navegador bloquear por
// autoplay) — quem chama pode usar isso pra tentar de novo no próximo gesto
// do usuário (ver NotificationContext).
export function playNotificacaoWhatsapp(): Promise<void> {
  try {
    const audio = new Audio(notificacaoWhatsappUrl)
    audio.volume = 0.7
    return audio.play().catch(err => {
      console.warn('Não foi possível tocar a notificação de WhatsApp:', err)
      throw err
    })
  } catch (err) {
    return Promise.reject(err)
  }
}

export function playNotificacaoFalada(): Promise<void> {
  try {
    const audio = new Audio(notificacaoFaladaUrl)
    audio.volume = 0.9
    return audio.play().catch(err => {
      console.warn('Não foi possível tocar a notificação falada:', err)
      throw err
    })
  } catch (err) {
    return Promise.reject(err)
  }
}

// Navegadores bloqueiam áudio programático até a página registrar alguma
// interação do usuário (clique, tecla, toque). Chamada uma única vez no
// primeiro gesto do usuário (ver NotificationContext) — toca e pausa cada
// som na hora com volume 0 só pra "destravar" o autoplay antes que um
// pedido de verdade precise soar.
export function desbloquearAudioPedido(): void {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // audio context not supported
  }
  const todosOsSons = [...Object.values(SONS_PEDIDO), notificacaoWhatsappUrl, notificacaoFaladaUrl]
  todosOsSons.forEach(src => {
    try {
      const audio = new Audio(src)
      audio.volume = 0
      audio.play()
        .then(() => { audio.pause(); audio.currentTime = 0 })
        .catch(() => {})
    } catch {
      // audio not supported
    }
  })
}
