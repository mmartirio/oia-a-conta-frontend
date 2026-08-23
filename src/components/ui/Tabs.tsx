import { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import styles from './Tabs.module.css'

export interface TabItem {
  id: string
  label: string
  // Contagem de itens não lidos/pendentes nessa aba — mostra um badge ao
  // lado do rótulo quando > 0. Omitido/0 = sem badge (comportamento normal
  // de qualquer Tabs que não precise disso).
  badge?: number
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [podeRolarEsquerda, setPodeRolarEsquerda] = useState(false)
  const [podeRolarDireita, setPodeRolarDireita] = useState(false)

  const atualizarSetas = () => {
    const el = scrollRef.current
    if (!el) return
    setPodeRolarEsquerda(el.scrollLeft > 4)
    setPodeRolarDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    atualizarSetas()
    const el = scrollRef.current
    if (!el) return

    const observer = new ResizeObserver(atualizarSetas)
    observer.observe(el)
    window.addEventListener('resize', atualizarSetas)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', atualizarSetas)
    }
  }, [tabs])

  const rolar = (direcao: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const abas = Array.from(el.querySelectorAll<HTMLElement>('[role="tab"]'))

    if (direcao === 1) {
      const bordaDireita = el.scrollLeft + el.clientWidth
      const proxima = abas.find(t => t.offsetLeft + t.offsetWidth > bordaDireita + 2)
      if (proxima) el.scrollTo({ left: proxima.offsetLeft, behavior: 'smooth' })
    } else {
      const bordaEsquerda = el.scrollLeft
      const anterior = [...abas].reverse().find(t => t.offsetLeft < bordaEsquerda - 2)
      if (anterior) el.scrollTo({ left: anterior.offsetLeft, behavior: 'smooth' })
    }
  }

  return (
    <div className={styles.wrap}>
      {podeRolarEsquerda && (
        <button
          type="button"
          className={`${styles.seta} ${styles.setaEsquerda}`}
          onClick={() => rolar(-1)}
          aria-label="Rolar abas para a esquerda"
        >
          <FiChevronLeft size={16} />
        </button>
      )}

      <div className={styles.tabs} role="tablist" ref={scrollRef} onScroll={atualizarSetas}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {!!tab.badge && <span className={styles.badge}>{tab.badge > 99 ? '99+' : tab.badge}</span>}
          </button>
        ))}
      </div>

      {podeRolarDireita && (
        <button
          type="button"
          className={`${styles.seta} ${styles.setaDireita}`}
          onClick={() => rolar(1)}
          aria-label="Rolar abas para a direita"
        >
          <FiChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
