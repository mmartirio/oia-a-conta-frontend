import { FiCheckCircle, FiBell } from 'react-icons/fi'
import { useNotification } from '../contexts/NotificationContext'
import styles from './NotificationAlert.module.css'

export function NotificationAlert() {
  const { notifications, dismiss } = useNotification()

  if (!notifications.length) return null

  return (
    <div className={styles.container}>
      {notifications.slice(0, 5).map(n => (
        <div key={n.localId} className={`${styles.toast} ${styles[n.tipo === 'PEDIDO_PRONTO' ? 'ready' : 'new']}`}>
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
          <button className={styles.close} onClick={() => dismiss(n.localId)}>×</button>
        </div>
      ))}
    </div>
  )
}
