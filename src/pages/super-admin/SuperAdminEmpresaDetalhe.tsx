import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { billingApi, type Contrato, type Pagamento } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import styles from './SuperAdmin.module.css'

export function SuperAdminEmpresaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const restauranteId = Number(id)

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [pagValor, setPagValor] = useState('')
  const [pagObs, setPagObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const c = await billingApi.buscarContratoPorRestaurante(restauranteId)
      setContrato(c.data)
      const p = await billingApi.listarPagamentos(c.data.id)
      setPagamentos(p.data)
    } catch {
      setError('Empresa ou contrato não encontrado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [restauranteId])

  const handlePagManual = async () => {
    if (!contrato || !pagValor) return
    setSaving(true)
    try {
      await billingApi.pagamentoManual(contrato.id, Number(pagValor), pagObs)
      setPagValor(''); setPagObs('')
      carregar()
    } catch {
      setError('Erro ao registrar pagamento')
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (status: string) => {
    if (!contrato) return
    await billingApi.atualizarStatusContrato(contrato.id, status)
    carregar()
  }

  if (loading) return <p className={styles.loading}>Carregando...</p>
  if (error || !contrato) return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/super-admin/empresas')}>← Voltar</Button>
      <p style={{ color: '#dc2626', marginTop: '1rem' }}>{error || 'Contrato não encontrado'}</p>
    </div>
  )

  return (
    <div>
      <div className={styles.toolbar}>
        <Button variant="ghost" onClick={() => navigate('/super-admin/empresas')}>← Voltar</Button>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Empresa #{restauranteId}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Plano', value: contrato.plano?.nome ?? '-' },
          { label: 'Status', value: contrato.status },
          { label: 'Início', value: contrato.dataInicio ? new Date(contrato.dataInicio).toLocaleDateString('pt-BR') : '-' },
          { label: 'Próx. vencimento', value: contrato.dataProximoVencimento ? new Date(contrato.dataProximoVencimento).toLocaleDateString('pt-BR') : '-' },
        ].map(m => (
          <div key={m.label} className={styles.metricCard}>
            <div className={styles.metricLabel}>{m.label}</div>
            <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['ATIVO', 'TRIAL', 'INADIMPLENTE', 'BLOQUEADO', 'CANCELADO'].map(s => (
          <Button key={s} size="sm" variant={contrato.status === s ? 'primary' : 'ghost'}
            onClick={() => handleStatus(s)}>
            {s}
          </Button>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>Registrar pagamento manual</h2>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div className={styles.formRow} style={{ flex: 1, minWidth: '150px' }}>
          <label>Valor (R$)</label>
          <input type="number" value={pagValor} onChange={e => setPagValor(e.target.value)} />
        </div>
        <div className={styles.formRow} style={{ flex: 2, minWidth: '200px' }}>
          <label>Observação</label>
          <input type="text" value={pagObs} onChange={e => setPagObs(e.target.value)} />
        </div>
        <Button loading={saving} onClick={handlePagManual}>Registrar</Button>
      </div>

      <h2 className={styles.sectionTitle}>Histórico de pagamentos</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr><th>Data</th><th>Valor</th><th>Status</th><th>Observação</th></tr>
          </thead>
          <tbody>
            {pagamentos.map(p => (
              <tr key={p.id}>
                <td>{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString('pt-BR') : new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</td>
                <td><span className={`${styles.badge} ${p.status === 'PAGO' ? styles.statusATIVO : styles.statusINADIMPLENTE}`}>{p.status}</span></td>
                <td>{p.observacao || '-'}</td>
              </tr>
            ))}
            {pagamentos.length === 0 && <tr><td colSpan={4} className={styles.emptyRow}>Nenhum pagamento</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
