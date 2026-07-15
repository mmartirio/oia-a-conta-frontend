import { ReactNode } from 'react'
import { FiInbox } from 'react-icons/fi'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon = FiInbox, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <Icon size={36} className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
