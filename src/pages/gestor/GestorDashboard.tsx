import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
  RadialBarChart, RadialBar,
} from 'recharts'
import { billingApi, type Contrato, type Pagamento, type Plano } from '../../api/billingApi'
import styles from './Gestor.module.css'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function nomeMes(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function GestorDashboard() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [c, p] = await Promise.all([
        billingApi.listarContratos(),
        billingApi.listarTodosPlanos(),
      ])
      setContratos(c.data)
      setPlanos(p.data)
      const allPags: Pagamento[] = []
      await Promise.allSettled(c.data.map(async cont => {
        const pag = await billingApi.listarPagamentos(cont.id)
        allPags.push(...pag.data)
      }))
      setPagamentos(allPags)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Métricas rápidas
  const total = contratos.length
  const ativos = contratos.filter(c => c.status === 'ATIVO' || c.status === 'TRIAL').length
  const inadimplentes = contratos.filter(c => c.status === 'INADIMPLENTE').length
  const bloqueados = contratos.filter(c => c.status === 'BLOQUEADO').length
  const mrr = contratos
    .filter(c => c.status === 'ATIVO')
    .reduce((sum, c) => sum + (c.plano?.precoMensal ?? 0), 0)

  // ── Gráfico de pizza: distribuição de planos
  const distPlanos = planos.map(p => ({
    name: p.nome,
    value: contratos.filter(c => c.plano?.id === p.id).length,
  })).filter(d => d.value > 0)

  // ── Gráfico de anel: status dos contratos
  const statusData = [
    { name: 'Ativo', value: contratos.filter(c => c.status === 'ATIVO').length, fill: '#10b981' },
    { name: 'Trial', value: contratos.filter(c => c.status === 'TRIAL').length, fill: '#6366f1' },
    { name: 'Inadimplente', value: inadimplentes, fill: '#f59e0b' },
    { name: 'Bloqueado', value: bloqueados, fill: '#ef4444' },
    { name: 'Cancelado', value: contratos.filter(c => c.status === 'CANCELADO').length, fill: '#94a3b8' },
  ].filter(d => d.value > 0)

  // ── Gráfico de barras: receita mensal (últimos 6 meses)
  const receitaMensal = (() => {
    const mapa: Record<string, number> = {}
    const pagos = pagamentos.filter(p => p.status === 'PAGO')
    pagos.forEach(p => {
      const key = nomeMes(p.dataPagamento || p.createdAt)
      mapa[key] = (mapa[key] ?? 0) + Number(p.valor)
    })
    const ultimos = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    })
    return ultimos.map(m => ({ mes: m, receita: mapa[m] ?? 0 }))
  })()

  // ── Gráfico de linha: crescimento de empresas (acumulado por mês)
  const crescimento = (() => {
    const contratosOrdenados = [...contratos].sort(
      (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
    )
    const mapa: Record<string, number> = {}
    contratosOrdenados.forEach(c => {
      if (!c.dataInicio) return
      const key = nomeMes(c.dataInicio)
      mapa[key] = (mapa[key] ?? 0) + 1
    })
    let acumulado = 0
    return Object.entries(mapa).map(([mes, novos]) => {
      acumulado += novos
      return { mes, total: acumulado, novos }
    }).slice(-8)
  })()

  if (loading) {
    return <div className={styles.loading}>Carregando dashboard...</div>
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      {/* Métricas */}
      <div className={styles.metricsRow}>
        {[
          { label: 'Total de empresas', value: total, color: '#6366f1' },
          { label: 'Ativas / Trial', value: ativos, color: '#10b981' },
          { label: 'Inadimplentes', value: inadimplentes, color: '#f59e0b' },
          { label: 'Bloqueadas', value: bloqueados, color: '#ef4444' },
          { label: 'MRR (R$)', value: mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: '#06b6d4' },
        ].map(m => (
          <div key={m.label} className={styles.metricCard}>
            <div className={styles.metricValue} style={{ color: m.color }}>{m.value}</div>
            <div className={styles.metricLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Gráficos — linha 1 */}
      <div className={styles.chartsRow}>

        {/* Barras: receita mensal */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Receita mensal</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={receitaMensal} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number | string) => (typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '')} />
              <Bar dataKey="receita" fill="#6366f1" radius={[4, 4, 0, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Linha: crescimento de empresas */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Crescimento de empresas</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={crescimento} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Total acumulado" />
              <Line type="monotone" dataKey="novos" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} name="Novas no mês" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos — linha 2 */}
      <div className={styles.chartsRow}>

        {/* Pizza: distribuição de planos */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Distribuição de planos</h2>
          {distPlanos.length === 0 ? (
            <p className={styles.emptyChart}>Nenhum contrato ativo</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={distPlanos}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {distPlanos.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | string) => { const n = typeof v === 'number' ? v : 0; return `${n} empresa${n !== 1 ? 's' : ''}` }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Anel: status dos contratos */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Status dos contratos</h2>
          {statusData.length === 0 ? (
            <p className={styles.emptyChart}>Sem dados</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart
                  innerRadius="30%" outerRadius="90%"
                  data={statusData}
                  startAngle={180} endAngle={-180}
                >
                  <RadialBar dataKey="value" label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }} />
                  <Tooltip formatter={(v: number | string, name: string) => { const n = typeof v === 'number' ? v : 0; return [`${n} empresa${n !== 1 ? 's' : ''}`, name] }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {statusData.map(s => (
                  <span key={s.name} className={styles.legendItem}>
                    <span style={{ background: s.fill }} className={styles.legendDot} />
                    {s.name}: {s.value}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
