import styles from './Switch.module.css'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export function Switch({ checked, onChange, disabled = false, label }: SwitchProps) {
  return (
    <label className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`${styles.track} ${checked ? styles.trackOn : ''}`}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className={`${styles.thumb} ${checked ? styles.thumbOn : ''}`} />
      </button>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
}
