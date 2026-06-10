import { useEffect, useState } from 'react'
import { mesaApi } from '../../api/mesaApi'
import { comandaApi } from '../../api/comandaApi'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, STATUS_MESA_LABEL } from '../../utils/formatters'
import type { Mesa, Comanda } from '../../types'
import styles from './AdminDashboard.module.css'

export function AdminDashboard() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])

  useEffect(() => {
    mesaApi.listar().then(r => setMesas(r.data)).catch(() => {})
    comandaApi.listarAbertas().then(r => setComandas(r.data)).catch(() => {})
  }, [])

  const mesasOcupadas = mesas.filter(m => m.status === 'OCUPADA').length
  const totalAberto = comandas.reduce((acc, c) => acc + c.total, 0)

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      <div className={styles.statsGrid}>
        <Card>
          <p className={styles.statLabel}>Total de Mesas</p>
          <p className={styles.statValue}>{mesas.length}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Mesas Ocupadas</p>
          <p className={`${styles.statValue} ${styles.statOcupado}`}>{mesasOcupadas}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Comandas Abertas</p>
          <p className={styles.statValue}>{comandas.length}</p>
        </Card>
        <Card>
          <p className={styles.statLabel}>Total em Aberto</p>
          <p className={`${styles.statValue} ${styles.statMoney}`}>{formatCurrency(totalAberto)}</p>
        </Card>
      </div>

      <h2 className={styles.sectionTitle}>Status das Mesas</h2>
      <div className={styles.mesasGrid}>
        {mesas.map(m => (
          <Card key={m.id} className={styles.mesaCard}>
            <div className={styles.mesaNum}>Mesa {m.numero}</div>
            <Badge
              variant={
                m.status === 'DISPONIVEL' ? 'success' :
                m.status === 'OCUPADA' ? 'danger' : 'warning'
              }
              size="sm"
            >
              {STATUS_MESA_LABEL[m.status]}
            </Badge>
            <div className={styles.mesaCap}>{m.capacidade} lugares</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
