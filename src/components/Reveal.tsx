import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import styles from './Reveal.module.css'

export type EfeitoReveal = 'subir' | 'esquerda' | 'direita' | 'zoom' | 'fade'

interface Observadores {
  entrar: IntersectionObserver
  sair: IntersectionObserver
}

type Callback = (visivel: boolean) => void

// Um par de observers compartilhado por todos os <Reveal> da página, em vez
// de um IntersectionObserver por elemento.
//
// Dois observers (histerese) em vez de um: "entrar" usa uma área de
// detecção encolhida 10% em cima e embaixo, "sair" usa a viewport inteira.
// Com um só, um elemento parado exatamente na borda ficava piscando — ao
// esconder, o translateY de entrada empurrava ele de volta pra dentro da
// tela, que mostrava de novo, que tirava ele da tela...
const callbacks = new WeakMap<Element, Callback>()
let observadores: Observadores | null = null

function getObservadores(): Observadores {
  if (observadores) return observadores
  observadores = {
    entrar: new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) callbacks.get(e.target)?.(true) }),
      { rootMargin: '-10% 0px -10% 0px', threshold: 0 },
    ),
    sair: new IntersectionObserver(
      entries => entries.forEach(e => { if (!e.isIntersecting) callbacks.get(e.target)?.(false) }),
      { threshold: 0 },
    ),
  }
  return observadores
}

interface RevealProps {
  children: ReactNode
  efeito?: EfeitoReveal
  /** Atraso em ms — usado pra escalonar itens de uma mesma lista/grid. */
  atraso?: number
  className?: string
  style?: CSSProperties
  as?: 'div' | 'section' | 'li' | 'span'
  id?: string
}

/**
 * Anima o conteúdo sempre que ele entra na tela — e reseta quando sai, pra
 * animar de novo na próxima vez que o usuário rolar até ele (não é "uma vez
 * só"). Respeita prefers-reduced-motion (via CSS).
 */
export function Reveal({ children, efeito = 'subir', atraso = 0, className = '', style, as = 'div', id }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setVisivel(true); return }
    const obs = getObservadores()
    callbacks.set(el, setVisivel)
    obs.entrar.observe(el)
    obs.sair.observe(el)
    return () => {
      obs.entrar.unobserve(el)
      obs.sair.unobserve(el)
      callbacks.delete(el)
    }
  }, [])

  const Tag = as as 'div'
  return (
    <Tag
      id={id}
      ref={ref as Ref<HTMLDivElement>}
      className={`${styles.reveal} ${styles[efeito]} ${visivel ? styles.visivel : ''} ${className}`}
      style={{ ...style, ['--reveal-atraso' as string]: `${atraso}ms` }}
    >
      {children}
    </Tag>
  )
}
