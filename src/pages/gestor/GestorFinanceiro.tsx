import { useState } from 'react'
import { billingApi } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../contexts/ToastContext'
import styles from './Gestor.module.css'

export function GestorFinanceiro() {
  const hoje = new Date()
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  const ultimoDia = hoje.toISOString().slice(0, 10)

  const [inicio, setInicio] = useState(primeiroDia)
  const [fim, setFim] = useState(ultimoDia)
  const [relatorio, setRelatorio] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmBloqueio, setConfirmBloqueio] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)
  const toast = useToast()

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
    setBloqueando(true)
    try {
      await billingApi.bloquearInadimplentes()
      toast.success('Processamento concluído')
    } catch {
      toast.error('Erro ao processar bloqueio')
    } finally {
      setBloqueando(false)
      setConfirmBloqueio(false)
    }
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
        <Button variant="ghost" onClick={() => setConfirmBloqueio(true)}>Bloquear inadimplentes agora</Button>
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

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

      <ConfirmDialog
        isOpen={confirmBloqueio}
        title="Bloquear inadimplentes"
        message="Confirmar bloqueio manual de todos os inadimplentes?"
        confirmLabel="Bloquear"
        danger
        loading={bloqueando}
        onConfirm={bloquear}
        onCancel={() => setConfirmBloqueio(false)}
      />
    </div>
  )
}
