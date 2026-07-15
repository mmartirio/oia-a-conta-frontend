import { TextareaHTMLAttributes, forwardRef } from 'react'
import styles from './Textarea.module.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className = '', rows = 3, ...props },
  ref
) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`${styles.textarea} ${error ? styles.hasError : ''}`}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
})
