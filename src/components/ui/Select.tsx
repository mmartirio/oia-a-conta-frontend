import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react'
import styles from './Select.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className = '', children, ...props },
  ref
) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <select
        ref={ref}
        id={id}
        className={`${styles.select} ${error ? styles.hasError : ''}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
})
