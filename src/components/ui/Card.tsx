import { ReactNode, MouseEvent } from 'react'
import styles from './Card.module.css'

type Padding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
  padding?: Padding
}

export function Card({ children, className = '', onClick, padding = 'md' }: CardProps) {
  return (
    <div
      className={`${styles.card} ${styles[`p-${padding}`]} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
