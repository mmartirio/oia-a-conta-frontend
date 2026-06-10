import { ReactNode } from 'react'
import styles from './Badge.module.css'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
type Size = 'sm' | 'md' | 'lg'

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  size?: Size
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      {children}
    </span>
  )
}
