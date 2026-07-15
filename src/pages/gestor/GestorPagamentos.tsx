import { useState, useEffect } from 'react'
import { billingApi, type Contrato, type Pagamento } from '../../api/billingApi'
import { Pagination } from '../../components/ui/Pagination'
import styles from './Gestor.module.css'

interface PagamentoComContrato extends Pagamento { restauranteId: number; planoNome: string }

const PAGE_SIZE = 20

export function GestorPagamentos() {
  const [itens, setItens] = useState<PagamentoComContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    // Não há endpoint de backend que agregue pagamentos de todas as empresas numa lista só —
    // por isso buscamos a lista completa de contratos + seus pagamentos e paginamos client-side.
    billingApi.listarTodosContratos().then(async r => {
      const contratos: Contrato[] = r.data
      const todos: PagamentoComContrato[] = []
      await Promise.allSettled(contratos.map(async c => {
        const p = await billingApi.listarTodosPagamentos(c.id)
        p.data.forEach(pag => todos.push({ ...pag, restauranteId: c.restauranteId, planoNome: c.plano?.nome ?? '-' }))
      }))
      todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setItens(todos)
    }).finally(() => setLoading(false))
  }, [])

  const filtrados = itens.filter(i =>
    search === '' ||
    String(i.restauranteId).includes(search) ||
    i.status.toLowerCase().includes(search.toLowerCase()) ||
    i.planoNome.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginaAtual = Math.min(page, totalPages - 1)
  const paginados = filtrados.slice(paginaAtual * PAGE_SIZE, paginaAtual * PAGE_SIZE + PAGE_SIZE)

  return (
    <div>
      <h1 className={styles.pageTitle}>Pagamentos</h1>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Buscar por restaurante, plano ou status..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
      </div>

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Restaurante</th>
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
                  <td>{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString('pt-BR') : new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>#{p.restauranteId}</td>
                  <td>{p.planoNome}</td>
                  <td>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</td>
                  <td>{p.metodo || 'MANUAL'}</td>
                  <td><span className={`${styles.badge} ${p.status === 'PAGO' ? styles.statusPAGO : p.status === 'ESTORNADO' ? styles.statusESTORNADO : styles.statusPENDENTE}`}>{p.status}</span></td>
                  <td>{p.observacao || '-'}</td>
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
    </div>
  )
}
