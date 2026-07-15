import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { billingApi, type Contrato, type Pagamento } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import styles from './Gestor.module.css'

function formatMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function GestorEmpresaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const restauranteId = Number(id)
  const toast = useToast()

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const carregarPagamentos = async (contratoId: number, paginaAlvo = page) => {
    const p = await billingApi.listarPagamentos(contratoId, paginaAlvo)
    setPagamentos(p.data.content)
    setTotalPages(p.data.totalPages)
  }

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const c = await billingApi.buscarContratoPorRestaurante(restauranteId)
      setContrato(c.data)
      await carregarPagamentos(c.data.id, page)
    } catch {
      setErro('Não foi possível carregar os dados desta empresa.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (restauranteId) carregar() }, [restauranteId, page])

  const handleRegistrarPagamento = async () => {
    if (!contrato) return
    const valorNum = Number(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) return
    setRegistrando(true)
    try {
      await billingApi.pagamentoManual(contrato.id, valorNum, observacao || undefined)
      toast.success('Pagamento registrado com sucesso')
      setValor('')
      setObservacao('')
      if (page === 0) {
        await carregarPagamentos(contrato.id, 0)
      } else {
        setPage(0)
      }
    } catch {
      toast.error('Erro ao registrar pagamento')
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/gestor/empresas')} style={{ marginBottom: '1rem' }}>
        <FiArrowLeft size={15} /> Voltar para Empresas
      </Button>

      <h1 className={styles.pageTitle}>Empresa #{restauranteId}</h1>

      {loading ? (
        <p className={styles.loading}>Carregando...</p>
      ) : erro ? (
        <div className={styles.alert}>{erro}</div>
      ) : !contrato ? (
        <div className={styles.alert}>Nenhum contrato encontrado para esta empresa.</div>
      ) : (
        <>
          {/* ── Dados do contrato ── */}
          <div className={styles.relatorioCard}>
            <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Contrato</h2>
            <div className={styles.relatorioGrid}>
              <div className={styles.relatorioMetric}>
                <div className={styles.relatorioMetricLabel}>Plano</div>
                <div className={styles.relatorioMetricValue} style={{ fontSize: '1.125rem' }}>
                  {contrato.plano?.nome ?? '—'}
                </div>
              </div>
              <div className={styles.relatorioMetric}>
                <div className={styles.relatorioMetricLabel}>Status</div>
                <div style={{ marginTop: '0.375rem' }}>
                  <span className={`${styles.badge} ${styles[`status${contrato.status}`]}`}>{contrato.status}</span>
                </div>
              </div>
              <div className={styles.relatorioMetric}>
                <div className={styles.relatorioMetricLabel}>Mensalidade</div>
                <div className={styles.relatorioMetricValue} style={{ fontSize: '1.125rem' }}>
                  {formatMoeda(contrato.plano?.precoMensal ?? 0)}
                </div>
              </div>
              <div className={styles.relatorioMetric}>
                <div className={styles.relatorioMetricLabel}>Início</div>
                <div className={styles.relatorioMetricValue} style={{ fontSize: '1.125rem' }}>
                  {contrato.dataInicio ? new Date(contrato.dataInicio).toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
              <div className={styles.relatorioMetric}>
                <div className={styles.relatorioMetricLabel}>Próx. vencimento</div>
                <div className={styles.relatorioMetricValue} style={{ fontSize: '1.125rem' }}>
                  {contrato.dataProximoVencimento ? new Date(contrato.dataProximoVencimento).toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Registrar pagamento manual ── */}
          <div className={styles.relatorioCard}>
            <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Registrar Pagamento Manual</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Input
                label="Valor"
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0,00"
                style={{ maxWidth: '160px' }}
              />
              <Input
                label="Observação (opcional)"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex: Pagamento via transferência bancária"
                style={{ minWidth: '260px', flex: 1 }}
              />
              <Button loading={registrando} onClick={handleRegistrarPagamento} disabled={!valor}>
                Registrar Pagamento
              </Button>
            </div>
          </div>

          {/* ── Histórico de pagamentos ── */}
          <h2 className={styles.sectionTitle}>Histórico de Pagamentos</h2>
          {pagamentos.length === 0 ? (
            <p className={styles.loading}>Nenhum pagamento registrado ainda.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.dataPagamento || p.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td><strong>{formatMoeda(p.valor)}</strong></td>
                      <td>{p.metodo || '—'}</td>
                      <td><span className={`${styles.badge} ${styles[`status${p.status}`]}`}>{p.status}</span></td>
                      <td>{p.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
