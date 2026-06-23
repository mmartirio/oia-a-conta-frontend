import { useState, useEffect } from 'react'

const KEY = 'oia_solo_mode'

export function useSoloMode() {
  const [solo, setSolo] = useState<boolean>(() => {
    const stored = localStorage.getItem(KEY)
    return stored === 'true'
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setSolo(e.newValue === 'true')
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const toggle = () => {
    const next = !solo
    localStorage.setItem(KEY, String(next))
    setSolo(next)
    // notifica componentes na mesma janela
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: String(next) }))
  }

  const ativar = () => {
    localStorage.setItem(KEY, 'true')
    setSolo(true)
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: 'true' }))
  }

  return { solo, toggle, ativar }
}
