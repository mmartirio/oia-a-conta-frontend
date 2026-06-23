import { useState, useEffect } from 'react'
import { billingApi, type Contrato, type Ticket } from '../../api/billingApi'
import styles from './SuperAdmin.module.css'

interface Metric { label: string; value: string | number; color: string }

export function SuperAdminDashboard() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([billingApi.listarContratos(), billingApi.listarTickets()])
      .then(([c, t]) => { setContratos(c.data); setTickets(t.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const ativos = contratos.filter(c => c.status === 'ATIVO' || c.status === 'TRIAL').length
  const inadimplentes = contratos.filter(c => c.status === 'INADIMPLENTE').length
  const bloqueados = contratos.filter(c => c.status === 'BLOQUEADO').length
  const ticketsAbertos = tickets.filter(t => t.status === 'ABERTO' || t.status === 'EM_ANDAMENTO').length

  const metrics: Metric[] = [
    { label: 'Empresas ativas', value: ativos, color: '#16a34a' },
    { label: 'Inadimplentes', value: inadimplentes, color: '#d97706' },
    { label: 'Bloqueados', value: bloqueados, color: '#dc2626' },
    { label: 'Tickets abertos', value: ticketsAbertos, color: '#7c3aed' },
  ]

  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      {loading ? (
        <p className={styles.loading}>Carregando...</p>
      ) : (
        <>
          <div className={styles.metricsGrid}>
            {metrics.map(m => (
              <div key={m.label} className={styles.metricCard}>
                <div className={styles.metricValue} style={{ color: m.color }}>{m.value}</div>
                <div className={styles.metricLabel}>{m.label}</div>
              </div>
            ))}
          </div>

          <h2 className={styles.sectionTitle}>Contratos recentes</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Restaurante ID</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {contratos.slice(0, 10).map(c => (
                  <tr key={c.id}>
                    <td>#{c.restauranteId}</td>
                    <td>{c.plano?.nome ?? '-'}</td>
                    <td><span className={`${styles.badge} ${styles[`status${c.status}`]}`}>{c.status}</span></td>
                    <td>{c.dataProximoVencimento ? new Date(c.dataProximoVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                  </tr>
                ))}
                {contratos.length === 0 && (
                  <tr><td colSpan={4} className={styles.emptyRow}>Nenhum contrato encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
