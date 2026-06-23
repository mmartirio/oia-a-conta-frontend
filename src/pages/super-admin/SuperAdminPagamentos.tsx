import { useState, useEffect } from 'react'
import { billingApi, type Contrato, type Pagamento } from '../../api/billingApi'
import styles from './SuperAdmin.module.css'

interface PagamentoComContrato extends Pagamento { restauranteId: number; planoNome: string }

export function SuperAdminPagamentos() {
  const [itens, setItens] = useState<PagamentoComContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    billingApi.listarContratos().then(async r => {
      const contratos: Contrato[] = r.data
      const todos: PagamentoComContrato[] = []
      await Promise.allSettled(contratos.map(async c => {
        const p = await billingApi.listarPagamentos(c.id)
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

  return (
    <div>
      <h1 className={styles.pageTitle}>Pagamentos</h1>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Buscar por restaurante, plano ou status..."
          value={search} onChange={e => setSearch(e.target.value)} />
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
              {filtrados.map(p => (
                <tr key={p.id}>
                  <td>{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString('pt-BR') : new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>#{p.restauranteId}</td>
                  <td>{p.planoNome}</td>
                  <td>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</td>
                  <td>{p.metodo || 'MANUAL'}</td>
                  <td><span className={`${styles.badge} ${p.status === 'PAGO' ? styles.statusATIVO : p.status === 'ESTORNADO' ? styles.statusCANCELADO : styles.statusINADIMPLENTE}`}>{p.status}</span></td>
                  <td>{p.observacao || '-'}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className={styles.emptyRow}>Nenhum pagamento encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
