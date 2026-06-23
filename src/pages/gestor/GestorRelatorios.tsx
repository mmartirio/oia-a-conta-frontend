import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { billingApi } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import styles from './Gestor.module.css'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function GestorRelatorios() {
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
      setError('Erro ao buscar relatório. Verifique o período informado.')
    } finally {
      setLoading(false)
    }
  }

  const bloquearInadimplentes = async () => {
    if (!confirm('Confirmar bloqueio manual de todos os contratos inadimplentes há mais de 5 dias?')) return
    await billingApi.bloquearInadimplentes()
    alert('Processamento de bloqueio concluído.')
  }

  // Transforma relatorio em dados para gráficos
  const chartData = relatorio
    ? Object.entries(relatorio)
        .filter(([, v]) => typeof v === 'number')
        .map(([key, val]) => ({
          name: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
          valor: val as number,
        }))
    : []

  const pieData = chartData.filter(d => d.valor > 0)

  return (
    <div>
      <h1 className={styles.pageTitle}>Relatórios financeiros</h1>

      {/* Filtro de período */}
      <div className={styles.relatorioCard}>
        <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Receita por período</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={styles.formRow}>
            <label>Data início</label>
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
          </div>
          <div className={styles.formRow}>
            <label>Data fim</label>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)} />
          </div>
          <Button loading={loading} onClick={buscar}>Gerar relatório</Button>
          <Button variant="ghost" onClick={bloquearInadimplentes}>
            Bloquear inadimplentes agora
          </Button>
        </div>

        {error && <div className={styles.alert} style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      {/* Resultados */}
      {relatorio && (
        <>
          <div className={styles.relatorioGrid}>
            {Object.entries(relatorio).map(([key, val]) => (
              <div key={key} className={styles.relatorioMetric}>
                <div className={styles.relatorioMetricLabel}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()}
                </div>
                <div className={styles.relatorioMetricValue}>
                  {typeof val === 'number'
                    ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : String(val)}
                </div>
              </div>
            ))}
          </div>

          {chartData.length > 0 && (
            <div className={styles.chartsRow} style={{ marginTop: '1.5rem' }}>
              <div className={styles.chartCard}>
                <h2 className={styles.chartTitle}>Métricas financeiras</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number | string) => (typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '')} />
                    <Bar dataKey="valor" fill="#6366f1" radius={[4, 4, 0, 0]} name="Valor" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {pieData.length > 1 && (
                <div className={styles.chartCard}>
                  <h2 className={styles.chartTitle}>Distribuição</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} dataKey="valor" nameKey="name" cx="50%" cy="50%"
                        outerRadius={90} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | string) => (typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '')} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
