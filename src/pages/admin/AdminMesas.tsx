import { useEffect, useState, FormEvent } from 'react'
import { mesaApi } from '../../api/mesaApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { STATUS_MESA_LABEL } from '../../utils/formatters'
import type { Mesa } from '../../types'
import styles from './AdminMesas.module.css'

interface MesaForm { numero: string; capacidade: string }

export function AdminMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Mesa | null>(null)
  const [form, setForm] = useState<MesaForm>({ numero: '', capacidade: '4' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    mesaApi.listar().then(r => setMesas(r.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ numero: '', capacidade: '4' })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (m: Mesa) => {
    setEditing(m)
    setForm({ numero: String(m.numero), capacidade: String(m.capacidade) })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { numero: Number(form.numero), capacidade: Number(form.capacidade) }
      if (editing) {
        await mesaApi.atualizar(editing.id, payload)
      } else {
        await mesaApi.criar(payload)
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Erro ao salvar mesa')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (m: Mesa) => {
    if (!confirm(`Excluir Mesa ${m.numero}?`)) return
    try {
      await mesaApi.excluir(m.id)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      alert(msg ?? 'Erro ao excluir')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mesas</h1>
        <Button onClick={openCreate}>+ Nova Mesa</Button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className={styles.grid}>
          {mesas.map(m => (
            <Card key={m.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.num}>Mesa {m.numero}</span>
                <Badge
                  variant={
                    m.status === 'DISPONIVEL' ? 'success' :
                    m.status === 'OCUPADA' ? 'danger' : 'warning'
                  }
                  size="sm"
                >
                  {STATUS_MESA_LABEL[m.status]}
                </Badge>
              </div>
              <p className={styles.cap}>{m.capacidade} lugares</p>
              <div className={styles.actions}>
                <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={m.status !== 'DISPONIVEL'}
                  onClick={() => handleDelete(m)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar Mesa ${editing.numero}` : 'Nova Mesa'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={saving} onClick={() => document.getElementById('mesa-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="mesa-form" onSubmit={handleSave} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <Input
            label="Número da Mesa"
            type="number"
            value={form.numero}
            onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
            min={1}
            required
          />
          <Input
            label="Capacidade (lugares)"
            type="number"
            value={form.capacidade}
            onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))}
            min={1}
            max={20}
            required
          />
        </form>
      </Modal>
    </div>
  )
}
