import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingApi, type Ticket } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import styles from './Gestor.module.css'

const PRIORIDADE_CLASS: Record<Ticket['prioridade'], string> = {
  BAIXA: 'prioridadeBAIXA',
  MEDIA: 'prioridadeMEDIA',
  ALTA: 'prioridadeALTA',
  CRITICA: 'prioridadeCRITICA',
}

export function GestorTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    billingApi.listarTickets(page)
      .then(r => {
        setTickets(r.data.content)
        setTotalPages(r.data.totalPages)
      })
      .finally(() => setLoading(false))
  }, [page])

  const filtrados = tickets.filter(t => {
    const okStatus = filtroStatus === 'TODOS' || t.status === filtroStatus
    const okSearch = search === '' ||
      t.titulo.toLowerCase().includes(search.toLowerCase()) ||
      String(t.restauranteId ?? '').includes(search) ||
      (t.whatsappNome ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.whatsappTelefone ?? '').includes(search)
    return okStatus && okSearch
  })

  return (
    <div>
      <h1 className={styles.pageTitle}>Tickets de Suporte</h1>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Buscar por título ou restaurante..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          {['TODOS', 'ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO'].map(s => (
            <option key={s} value={s}>{s === 'TODOS' ? 'Todos os status' : s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Restaurante</th>
                <th>Título</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(t => (
                <tr key={t.id}>
                  <td>{t.origem === 'WHATSAPP' ? `📱 ${t.whatsappNome || t.whatsappTelefone}` : `#${t.restauranteId}`}</td>
                  <td>{t.titulo}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[PRIORIDADE_CLASS[t.prioridade]]}`}>{t.prioridade}</span>
                  </td>
                  <td><span className={`${styles.badge} ${styles[`status${t.status}`]}`}>{t.status.replace('_', ' ')}</span></td>
                  <td>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => navigate(`/gestor/tickets/${t.id}`)}>Abrir</Button></td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className={styles.emptyRow}>Nenhum ticket encontrado</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
