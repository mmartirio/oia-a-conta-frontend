import { ReactNode } from 'react'
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'
import styles from './Toast.module.css'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastProps {
  variant: ToastVariant
  children: ReactNode
  onClose: () => void
}

const ICONS: Record<ToastVariant, React.ElementType> = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
}

export function Toast({ variant, children, onClose }: ToastProps) {
  const Icon = ICONS[variant]
  return (
    <div className={`${styles.toast} ${styles[variant]}`} role="status">
      <Icon size={18} className={styles.icon} />
      <span className={styles.message}>{children}</span>
      <button className={styles.close} onClick={onClose} aria-label="Fechar">
        <FiX size={16} />
      </button>
    </div>
  )
}
