import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingApi, type Contrato } from '../../api/billingApi'
import styles from './SuperAdmin.module.css'

export function SuperAdminEmpresas() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    billingApi.listarContratos()
      .then(r => setContratos(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = contratos.filter(c =>
    search === '' ||
    String(c.restauranteId).includes(search) ||
    c.plano?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.status.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h1 className={styles.pageTitle}>Empresas</h1>
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Buscar por ID, plano ou status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Restaurante ID</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Início</th>
                <th>Próx. vencimento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id}>
                  <td>#{c.restauranteId}</td>
                  <td>{c.plano?.nome ?? '-'}</td>
                  <td><span className={`${styles.badge} ${styles[`status${c.status}`]}`}>{c.status}</span></td>
                  <td>{c.dataInicio ? new Date(c.dataInicio).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>{c.dataProximoVencimento ? new Date(c.dataProximoVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/super-admin/empresas/${c.restauranteId}`)}
                      className={styles.badge}
                      style={{ cursor: 'pointer', background: '#ede9fe', color: '#7c3aed' }}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className={styles.emptyRow}>Nenhuma empresa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
