import styles from './Spinner.module.css'

type Size = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: Size
  label?: string
}

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className={styles.wrapper}>
      <span className={`${styles.spinner} ${styles[size]}`} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  )
}
