import { useState, useEffect } from 'react'
import { billingApi, type LinkSocial } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import styles from './Gestor.module.css'

interface FormState {
  id?: number
  tipo: LinkSocial['tipo']
  url: string
  ativo: boolean
}

const emptyForm = (): FormState => ({ tipo: 'INSTAGRAM', url: '', ativo: true })

const NOME_TIPO: Record<LinkSocial['tipo'], string> = {
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
}

export function GestorSocial() {
  const [links, setLinks] = useState<LinkSocial[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const carregar = () =>
    billingApi.listarTodosLinksSociais()
      .then(r => setLinks(r.data))
      .finally(() => setLoading(false))

  useEffect(() => { carregar() }, [])

  const abrirCriar = () => { setForm(emptyForm()); setFeedback(null); setModal('criar') }
  const abrirEditar = (l: LinkSocial) => { setForm({ ...l }); setFeedback(null); setModal('editar') }

  const handleSalvar = async () => {
    setSaving(true); setFeedback(null)
    try {
      if (modal === 'criar') await billingApi.criarLinkSocial(form)
      else if (form.id) await billingApi.atualizarLinkSocial(form.id, form)
      setFeedback({ tipo: 'ok', msg: 'Link salvo com sucesso!' })
      setModal(null)
      carregar()
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao salvar link.' })
    } finally {
      setSaving(false)
    }
  }

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir este link?')) return
    try {
      await billingApi.deletarLinkSocial(id)
      carregar()
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao excluir link.' })
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Redes Sociais</h1>
        <Button onClick={abrirCriar}>+ Novo link</Button>
      </div>

      <p className={styles.loading} style={{ marginTop: 0 }}>
        Links exibidos no rodapé da landing page pública.
      </p>

      {feedback && (
        <div className={feedback.tipo === 'ok' ? styles.success : styles.alert}>{feedback.msg}</div>
      )}

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>URL</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map(l => (
                <tr key={l.id}>
                  <td><strong>{NOME_TIPO[l.tipo]}</strong></td>
                  <td>{l.url}</td>
                  <td>
                    <span className={`${styles.badge} ${l.ativo ? styles.statusATIVO : styles.statusCANCELADO}`}>
                      {l.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <Button size="sm" variant="ghost" onClick={() => abrirEditar(l)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleExcluir(l.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr><td colSpan={4} className={styles.emptyRow}>Nenhum link cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{modal === 'criar' ? 'Novo link' : 'Editar link'}</h2>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <label>Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as LinkSocial['tipo'] }))}
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div className={styles.formRow}>
                <label>URL</label>
                <input
                  type="text"
                  placeholder={form.tipo === 'WHATSAPP' ? 'https://wa.me/5511999998888' : 'https://instagram.com/oiaaconta'}
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                />
              </div>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo}
                  onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                Ativo
              </label>
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
              <Button loading={saving} onClick={handleSalvar}>Salvar link</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
