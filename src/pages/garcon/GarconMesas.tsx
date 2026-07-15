import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mesaApi } from '../../api/mesaApi'
import { comandaApi } from '../../api/comandaApi'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../contexts/ToastContext'
import { STATUS_MESA_LABEL } from '../../utils/formatters'
import type { Mesa } from '../../types'
import styles from './GarconMesas.module.css'

export function GarconMesas() {
  const navigate = useNavigate()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState<number | null>(null)
  const [confirmAbrir, setConfirmAbrir] = useState<Mesa | null>(null)
  const toast = useToast()

  const load = () =>
    mesaApi.listar().then(r => setMesas(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleMesaClick = async (mesa: Mesa) => {
    if (mesa.status === 'OCUPADA' || mesa.status === 'AGUARDANDO_PAGAMENTO') {
      try {
        const { data } = await comandaApi.buscarAtiva(mesa.id)
        navigate(`/garcon/comanda/${data.id}`)
      } catch {
        toast.error('Comanda não encontrada')
      }
      return
    }

    setConfirmAbrir(mesa)
  }

  const handleAbrirComanda = async () => {
    if (!confirmAbrir) return
    const mesa = confirmAbrir
    setConfirmAbrir(null)
    setOpening(mesa.id)
    try {
      const { data } = await comandaApi.abrir(mesa.id)
      navigate(`/garcon/comanda/${data.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao abrir comanda')
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mesas</h1>
        <Button variant="outline" size="sm" onClick={load}>Atualizar</Button>
      </div>

      {loading ? (
        <p>Carregando mesas...</p>
      ) : (
        <div className={styles.grid}>
          {mesas.map(m => (
            <Card
              key={m.id}
              className={`${styles.mesa} ${styles[`mesa-${m.status.toLowerCase()}`]}`}
              onClick={() => handleMesaClick(m)}
            >
              {opening === m.id ? (
                <div className={styles.mesaSpinner}>...</div>
              ) : (
                <>
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
                  <div className={styles.mesaAction}>
                    {m.status === 'DISPONIVEL' ? 'Toque para abrir' : 'Toque para ver comanda'}
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmAbrir}
        title="Abrir comanda"
        message={`Abrir comanda para Mesa ${confirmAbrir?.numero}?`}
        confirmLabel="Abrir"
        onConfirm={handleAbrirComanda}
        onCancel={() => setConfirmAbrir(null)}
      />
    </div>
  )
}
