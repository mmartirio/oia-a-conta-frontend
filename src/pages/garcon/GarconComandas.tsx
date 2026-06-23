import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { comandaApi } from '../../api/comandaApi'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatCurrency, formatTime } from '../../utils/formatters'
import type { Comanda } from '../../types'
import styles from './GarconComandas.module.css'

export function GarconComandas() {
  const navigate = useNavigate()
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [loading, setLoading] = useState(true)

  const load = () =>
    comandaApi.listarAbertas().then(r => setComandas(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Comandas Abertas</h1>
        <Button variant="outline" size="sm" onClick={load}>Atualizar</Button>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className={styles.list}>
          {comandas.length === 0 && <p className={styles.empty}>Nenhuma comanda aberta no momento.</p>}
          {comandas.map(c => {
            const prontos = c.pedidos.filter(p => p.status === 'PRONTO').length
            return (
              <Card key={c.id} className={styles.card} onClick={() => navigate(`/garcon/comanda/${c.id}`)}>
                <div className={styles.cardTop}>
                  <span className={styles.mesaNum}>Mesa {c.mesaNumero}</span>
                  {prontos > 0 && (
                    <Badge variant="success" size="md">{prontos} pronto{prontos > 1 ? 's' : ''} ✅</Badge>
                  )}
                  <span className={styles.hora}>{formatTime(c.criadoEm)}</span>
                </div>
                <div className={styles.cardMeta}>
                  <span>{c.garconNome}</span>
                  <span>{c.pedidos.length} pedido{c.pedidos.length !== 1 ? 's' : ''}</span>
                  <span className={styles.total}>{formatCurrency(c.total)}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
