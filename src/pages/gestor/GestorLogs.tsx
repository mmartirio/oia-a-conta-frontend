import { useEffect, useState } from 'react'
import { billingApi, type Contrato } from '../../api/billingApi'
import { logAuditoriaApi, type LogAuditoria } from '../../api/logAuditoriaApi'
import { Pagination } from '../../components/ui/Pagination'
import styles from './Gestor.module.css'

const TIPO_LABEL: Record<string, string> = {
  LOGIN: 'Login',
  PEDIDO_CRIADO: 'Pedido criado',
  PAGAMENTO_CONFIRMADO: 'Pagamento confirmado',
  CONFIGURACAO_ALTERADA: 'Configuração alterada',
  USUARIO_CRIADO: 'Usuário criado',
  USUARIO_REMOVIDO: 'Usuário removido',
}

function fmtData(s: string) {
  return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

export function GestorLogs() {
  const [empresas, setEmpresas] = useState<Contrato[]>([])
  const [restauranteId, setRestauranteId] = useState(1)
  const [tipo, setTipo] = useState('')
  const [logs, setLogs] = useState<LogAuditoria[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    billingApi.listarContratos(0).then(r => setEmpresas(r.data.content))
  }, [])

  useEffect(() => {
    if (!restauranteId) return
    setLoading(true)
    logAuditoriaApi.listar(restauranteId, page, tipo)
      .then(r => {
        setLogs(r.data.content)
        setTotalPages(r.data.totalPages)
      })
      .finally(() => setLoading(false))
  }, [restauranteId, page, tipo])

  return (
    <div>
      <h1 className={styles.pageTitle}>Logs por Empresa</h1>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="number"
          min={1}
          list="empresas-ids"
          placeholder="ID do restaurante"
          value={restauranteId}
          onChange={e => { setRestauranteId(Number(e.target.value)); setPage(0) }}
        />
        <datalist id="empresas-ids">
          {empresas.map(c => (
            <option key={c.restauranteId} value={c.restauranteId}>Restaurante #{c.restauranteId}</option>
          ))}
        </datalist>
        <select
          className={styles.filterSelect}
          value={tipo}
          onChange={e => { setTipo(e.target.value); setPage(0) }}
        >
          <option value="">Todos os eventos</option>
          {Object.entries(TIPO_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Evento</th>
                <th>Descrição</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td>{fmtData(l.criadoEm)}</td>
                  <td><span className={styles.badge}>{TIPO_LABEL[l.tipo] ?? l.tipo}</span></td>
                  <td>{l.descricao}</td>
                  <td>{l.usuarioNome ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className={styles.emptyRow}>Nenhum log encontrado para esta empresa.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
