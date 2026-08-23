import { useEffect } from 'react'
import { FiCheckCircle, FiBell } from 'react-icons/fi'
import { useNotification, type LocalNotification } from '../contexts/NotificationContext'
import styles from './NotificationAlert.module.css'

const DURACAO_TOAST_MS = 5000

function Toast({ n, onDismiss }: { n: LocalNotification; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(n.localId), DURACAO_TOAST_MS)
    return () => clearTimeout(t)
  }, [n.localId, onDismiss])

  return (
    <div className={`${styles.toast} ${styles[n.tipo === 'PEDIDO_PRONTO' ? 'ready' : 'new']}`}>
      <div className={styles.content}>
        <span className={styles.icon}>
          {n.tipo === 'PEDIDO_PRONTO' ? <FiCheckCircle size={20} /> : <FiBell size={20} />}
        </span>
        <div>
          <p className={styles.title}>
            {n.tipo === 'PEDIDO_PRONTO' ? 'Pedido Pronto!' : 'Novo Pedido!'}
          </p>
          <p className={styles.msg}>{n.mensagem ?? `Mesa ${n.mesaNumero}`}</p>
        </div>
      </div>
      <button className={styles.close} onClick={() => onDismiss(n.localId)}>×</button>
    </div>
  )
}

export function NotificationAlert() {
  const { notifications, dismiss } = useNotification()

  if (!notifications.length) return null

  return (
    <div className={styles.container}>
      {notifications.slice(0, 5).map(n => (
        <Toast key={n.localId} n={n} onDismiss={dismiss} />
      ))}
    </div>
  )
}
