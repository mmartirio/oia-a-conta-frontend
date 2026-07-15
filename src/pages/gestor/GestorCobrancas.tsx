import { useState, useEffect } from 'react'
import { billingApi, type Contrato, type Pagamento } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import styles from './Gestor.module.css'

interface ItemCobranca extends Pagamento {
  restauranteId: number
  planoNome: string
  contratoId: number
}

const PAGE_SIZE = 20

export function GestorCobrancas() {
  const [itens, setItens] = useState<ItemCobranca[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [page, setPage] = useState(0)

  // Modal pagamento manual
  const [paModal, setPaModal] = useState<Contrato | null>(null)
  const [paValor, setPaValor] = useState('')
  const [paObs, setPaObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const carregar = async () => {
    setLoading(true)
    // Idem GestorPagamentos: sem endpoint agregado no backend, buscamos tudo e paginamos client-side.
    const r = await billingApi.listarTodosContratos()
    setContratos(r.data)
    const todos: ItemCobranca[] = []
    await Promise.allSettled(r.data.map(async c => {
      const p = await billingApi.listarTodosPagamentos(c.id)
      p.data.forEach(pag => todos.push({
        ...pag,
        restauranteId: c.restauranteId,
        planoNome: c.plano?.nome ?? '—',
        contratoId: c.id,
      }))
    }))
    todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setItens(todos)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const filtrados = itens.filter(i => {
    const okStatus = filtroStatus === 'TODOS' || i.status === filtroStatus
    const okSearch = search === '' ||
      String(i.restauranteId).includes(search) ||
      i.planoNome.toLowerCase().includes(search.toLowerCase())
    return okStatus && okSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginaAtual = Math.min(page, totalPages - 1)
  const paginados = filtrados.slice(paginaAtual * PAGE_SIZE, paginaAtual * PAGE_SIZE + PAGE_SIZE)

  const handlePagManual = async () => {
    if (!paModal || !paValor) return
    setSaving(true)
    try {
      await billingApi.pagamentoManual(paModal.id, Number(paValor), paObs)
      setFeedback('Pagamento registrado com sucesso!')
      setPaModal(null); setPaValor(''); setPaObs('')
      setPage(0)
      carregar()
    } catch {
      setFeedback('Erro ao registrar pagamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Cobranças</h1>
        <Button onClick={() => { setPaModal(contratos[0] ?? null); setFeedback('') }}>
          + Pagamento manual
        </Button>
      </div>

      {feedback && <div className={styles.success}>{feedback}</div>}

      <div className={styles.toolbar} style={{ marginBottom: '1rem' }}>
        <input className={styles.searchInput}
          placeholder="Buscar por restaurante ou plano..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        <select className={styles.filterSelect} value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPage(0) }}>
          {['TODOS', 'PAGO', 'PENDENTE', 'ESTORNADO', 'FALHOU'].map(s => (
            <option key={s} value={s}>{s === 'TODOS' ? 'Todos os status' : s}</option>
          ))}
        </select>
      </div>

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Empresa</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Método</th>
                <th>Status</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.dataPagamento || p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>#{p.restauranteId}</td>
                  <td>{p.planoNome}</td>
                  <td><strong>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</strong></td>
                  <td>{p.metodo || 'MANUAL'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[`status${p.status}`]}`}>{p.status}</span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.875rem' }}>{p.observacao || '—'}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className={styles.emptyRow}>Nenhum pagamento encontrado</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={paginaAtual} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Modal pagamento manual */}
      {paModal !== null && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Registrar pagamento manual</h2>
            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <label>Empresa (contrato)</label>
                <select value={paModal.id} onChange={e => {
                  const c = contratos.find(ct => ct.id === Number(e.target.value))
                  if (c) setPaModal(c)
                }}>
                  {contratos.map(c => (
                    <option key={c.id} value={c.id}>
                      Empresa #{c.restauranteId} — {c.plano?.nome ?? '?'} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <label>Valor (R$)</label>
                <input type="number" value={paValor} onChange={e => setPaValor(e.target.value)} placeholder="0,00" />
              </div>
              <div className={styles.formRow}>
                <label>Observação</label>
                <input type="text" value={paObs} onChange={e => setPaObs(e.target.value)} placeholder="Ex: PIX manual, boleto..." />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setPaModal(null)}>Cancelar</Button>
              <Button loading={saving} onClick={handlePagManual}>Confirmar pagamento</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
