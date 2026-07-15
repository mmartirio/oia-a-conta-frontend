import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={styles.pagination}>
      <button
        className={styles.btn}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 0}
      >
        <FiChevronLeft size={16} /> Anterior
      </button>
      <span className={styles.info}>Página {page + 1} de {totalPages}</span>
      <button
        className={styles.btn}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
      >
        Próxima <FiChevronRight size={16} />
      </button>
    </div>
  )
}
