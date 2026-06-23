import { useEffect, useState } from 'react'
import { financeiroApi } from '../../api/financeiroApi'
import type { ComissaoInfo, ResumoFinanceiro } from '../../types'
import styles from './AdminFinanceiro.module.css'

type Periodo = 'HOJE' | 'SEMANA' | 'QUINZENA' | 'MES' | 'CUSTOM'

const METODO_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
}

function periodoParaDatas(p: Periodo): { inicio: string; fim: string } {
  const agora = new Date()
  const fim = agora.toISOString()
  const inicio = new Date(agora)
  if (p === 'HOJE') {
    inicio.setHours(0, 0, 0, 0)
  } else if (p === 'SEMANA') {
    inicio.setDate(agora.getDate() - 7)
  } else if (p === 'QUINZENA') {
    inicio.setDate(agora.getDate() - 15)
  } else if (p === 'MES') {
    inicio.setDate(agora.getDate() - 30)
  }
  return { inicio: inicio.toISOString(), fim }
}

function formatMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function roleBadgeClass(role: string) {
  if (role === 'GARCON') return styles.roleGarcon
  if (role === 'ENTREGADOR') return styles.roleEntregador
  return styles.roleCozinheiro
}

function roleLabel(role: string) {
  const map: Record<string, string> = { GARCON: 'Garçom', ENTREGADOR: 'Entregador', COZINHEIRO: 'Cozinheiro' }
  return map[role] ?? role
}

export function AdminFinanceiro() {
  const [periodo, setPeriodo] = useState<Periodo>('HOJE')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [comissoes, setComissoes] = useState<ComissaoInfo[]>([])
  const [loading, setLoading] = useState(false)

  const buscar = async () => {
    let inicio: string
    let fim: string
    if (periodo === 'CUSTOM') {
      if (!customInicio || !customFim) return
      inicio = new Date(customInicio).toISOString()
      fim = new Date(customFim + 'T23:59:59').toISOString()
    } else {
      const datas = periodoParaDatas(periodo)
      inicio = datas.inicio
      fim = datas.fim
    }
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        financeiroApi.getResumo(inicio, fim),
        financeiroApi.getComissoes(inicio, fim),
      ])
      setResumo(r1.data)
      setComissoes(r2.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (periodo !== 'CUSTOM') buscar() }, [periodo])

  const periodos: { value: Periodo; label: string }[] = [
    { value: 'HOJE', label: 'Hoje' },
    { value: 'SEMANA', label: '7 dias' },
    { value: 'QUINZENA', label: '15 dias' },
    { value: 'MES', label: '30 dias' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Financeiro</h1>
      </div>

      <div className={styles.filtros}>
        {periodos.map(p => (
          <button
            key={p.value}
            className={`${styles.filtroBtn} ${periodo === p.value ? styles.filtroBtnAtivo : ''}`}
            onClick={() => setPeriodo(p.value)}
          >
            {p.label}
          </button>
        ))}
        {periodo === 'CUSTOM' && (
          <div className={styles.dateInputs}>
            <input type="date" className={styles.dateInput} value={customInicio} onChange={e => setCustomInicio(e.target.value)} />
            <span>até</span>
            <input type="date" className={styles.dateInput} value={customFim} onChange={e => setCustomFim(e.target.value)} />
            <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={buscar}>Buscar</button>
          </div>
        )}
      </div>

      {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Carregando...</p>}

      {resumo && !loading && (
        <>
          <div className={styles.cards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Faturamento Total</div>
              <div className={styles.cardValue}>{formatMoeda(resumo.totalGeral)}</div>
              <div className={styles.cardSub}>{resumo.qtdComandas + resumo.qtdEntregas} transações</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Salão</div>
              <div className={styles.cardValue}>{formatMoeda(resumo.totalComandas)}</div>
              <div className={styles.cardSub}>{resumo.qtdComandas} comandas</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Delivery</div>
              <div className={styles.cardValue}>{formatMoeda(resumo.totalEntregas)}</div>
              <div className={styles.cardSub}>{resumo.qtdEntregas} entregas</div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Breakdown por Método de Pagamento</h2>
            {Object.keys(resumo.breakdownPorMetodo).length === 0 ? (
              <p className={styles.empty}>Sem dados no período.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resumo.breakdownPorMetodo).map(([m, v]) => (
                      <tr key={m} className={styles.metodoRow}>
                        <td>{METODO_LABEL[m] ?? m}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoeda(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Comissões por Funcionário</h2>
            {comissoes.length === 0 ? (
              <p className={styles.empty}>Nenhuma comissão calculada no período.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Funcionário</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'right' }}>Base</th>
                      <th style={{ textAlign: 'right' }}>%</th>
                      <th style={{ textAlign: 'right' }}>Comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comissoes.map(c => (
                      <tr key={`${c.role}-${c.funcionarioId}`}>
                        <td style={{ fontWeight: 600 }}>{c.nome}</td>
                        <td>
                          <span className={`${styles.comissaoRole} ${roleBadgeClass(c.role)}`}>
                            {roleLabel(c.role)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatMoeda(c.totalBase)}</td>
                        <td style={{ textAlign: 'right' }}>{c.percentual}%</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {formatMoeda(c.valorComissao)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
