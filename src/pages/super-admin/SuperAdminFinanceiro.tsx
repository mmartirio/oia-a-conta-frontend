import { useState } from 'react'
import { billingApi } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import styles from './SuperAdmin.module.css'

export function SuperAdminFinanceiro() {
  const hoje = new Date()
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  const ultimoDia = hoje.toISOString().slice(0, 10)

  const [inicio, setInicio] = useState(primeiroDia)
  const [fim, setFim] = useState(ultimoDia)
  const [relatorio, setRelatorio] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const buscar = async () => {
    setLoading(true); setError('')
    try {
      const r = await billingApi.relatorioReceita(inicio, fim)
      setRelatorio(r.data)
    } catch {
      setError('Erro ao buscar relatório')
    } finally {
      setLoading(false)
    }
  }

  const bloquear = async () => {
    if (!confirm('Confirmar bloqueio manual de todos os inadimplentes?')) return
    await billingApi.bloquearInadimplentes()
    alert('Processamento concluído')
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Relatório Financeiro</h1>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div className={styles.formRow}>
          <label>Período início</label>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
        </div>
        <div className={styles.formRow}>
          <label>Período fim</label>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} />
        </div>
        <Button loading={loading} onClick={buscar}>Gerar relatório</Button>
        <Button variant="ghost" onClick={bloquear}>Bloquear inadimplentes agora</Button>
      </div>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {relatorio && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.entries(relatorio).map(([key, val]) => (
            <div key={key} className={styles.metricCard}>
              <div className={styles.metricLabel}>{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</div>
              <div className={styles.metricValue} style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                {typeof val === 'number'
                  ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : String(val)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
