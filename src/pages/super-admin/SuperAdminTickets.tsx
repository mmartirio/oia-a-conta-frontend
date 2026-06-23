import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingApi, type Ticket } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import styles from './SuperAdmin.module.css'

export function SuperAdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const navigate = useNavigate()

  useEffect(() => {
    billingApi.listarTickets()
      .then(r => setTickets(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = tickets.filter(t => {
    const okStatus = filtroStatus === 'TODOS' || t.status === filtroStatus
    const okSearch = search === '' ||
      t.titulo.toLowerCase().includes(search.toLowerCase()) ||
      String(t.restauranteId).includes(search)
    return okStatus && okSearch
  })

  return (
    <div>
      <h1 className={styles.pageTitle}>Tickets de Suporte</h1>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Buscar por título ou restaurante..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.9375rem' }}>
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
                  <td>#{t.restauranteId}</td>
                  <td>{t.titulo}</td>
                  <td>
                    <span className={styles.badge} style={{
                      background: { BAIXA: '#f0fdf4', MEDIA: '#fef9c3', ALTA: '#fff7ed', CRITICA: '#fee2e2' }[t.prioridade],
                      color: { BAIXA: '#16a34a', MEDIA: '#a16207', ALTA: '#ea580c', CRITICA: '#dc2626' }[t.prioridade],
                    }}>{t.prioridade}</span>
                  </td>
                  <td><span className={`${styles.badge} ${styles[`status${t.status}`]}`}>{t.status.replace('_', ' ')}</span></td>
                  <td>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => navigate(`/super-admin/tickets/${t.id}`)}>Abrir</Button></td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className={styles.emptyRow}>Nenhum ticket encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
