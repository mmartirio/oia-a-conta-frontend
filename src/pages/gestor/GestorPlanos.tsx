import { useState, useEffect } from 'react'
import { billingApi, type Plano } from '../../api/billingApi'
import { Button } from '../../components/ui/Button'
import styles from './Gestor.module.css'

const FUNCIONALIDADES_DISPONIVEIS = [
  'Cardápio digital',
  'Comandas ilimitadas',
  'Delivery',
  'Cozinha em tempo real',
  'Controle de mesas',
  'PDV / Caixa',
  'Gestão de usuários',
  'Relatórios financeiros',
  'Comissões de funcionários',
  'WhatsApp integrado',
  'Notificações em tempo real',
  'Painel de entregadores',
]

interface FormState {
  id?: number
  nome: string
  descricao: string
  precoMensal: number
  limiteUsuarios: number
  limiteMesas: number
  funcionalidades: string[]
  periodoTeste: boolean
  diasTeste: number
  ativo: boolean
  destaque: boolean
}

const emptyForm = (): FormState => ({
  nome: '', descricao: '', precoMensal: 0,
  limiteUsuarios: 10, limiteMesas: 20,
  funcionalidades: [], periodoTeste: false, diasTeste: 30,
  ativo: true, destaque: false,
})

function planoParaForm(p: Plano): FormState {
  const funcs = p.funcionalidades
    ? p.funcionalidades.split(',').map(f => f.trim()).filter(Boolean)
    : []
  return {
    ...p,
    funcionalidades: funcs,
    periodoTeste: p.periodoTeste ?? false,
    diasTeste: p.diasTeste ?? 30,
  }
}

function formParaApi(f: FormState): Partial<Plano> {
  return { ...f, funcionalidades: f.funcionalidades.join(',') }
}

export function GestorPlanos() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const carregar = () =>
    billingApi.listarTodosPlanos()
      .then(r => setPlanos(r.data))
      .finally(() => setLoading(false))

  useEffect(() => { carregar() }, [])

  const abrirCriar = () => { setForm(emptyForm()); setFeedback(null); setModal('criar') }
  const abrirEditar = (p: Plano) => { setForm(planoParaForm(p)); setFeedback(null); setModal('editar') }

  const toggleFunc = (func: string) => {
    setForm(f => ({
      ...f,
      funcionalidades: f.funcionalidades.includes(func)
        ? f.funcionalidades.filter(x => x !== func)
        : [...f.funcionalidades, func],
    }))
  }

  const handleSalvar = async () => {
    setSaving(true); setFeedback(null)
    try {
      const payload = formParaApi(form)
      if (modal === 'criar') await billingApi.criarPlano(payload)
      else if (form.id) await billingApi.atualizarPlano(form.id, payload)
      setFeedback({ tipo: 'ok', msg: 'Plano salvo com sucesso!' })
      setModal(null)
      carregar()
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao salvar plano.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Planos</h1>
        <Button onClick={abrirCriar}>+ Novo plano</Button>
      </div>

      {feedback && (
        <div className={feedback.tipo === 'ok' ? styles.success : styles.alert}>{feedback.msg}</div>
      )}

      {loading ? <p className={styles.loading}>Carregando...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Preço/mês</th>
                <th>Usuários</th>
                <th>Mesas</th>
                <th>Funcionalidades</th>
                <th>Status</th>
                <th>Destaque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {planos.map(p => {
                const funcs = p.funcionalidades
                  ? p.funcionalidades.split(',').map(f => f.trim()).filter(Boolean)
                  : []
                return (
                  <tr key={p.id}>
                    <td><strong>{p.nome}</strong></td>
                    <td>R$ {Number(p.precoMensal).toFixed(2).replace('.', ',')}</td>
                    <td>{p.limiteUsuarios}</td>
                    <td>{p.limiteMesas}</td>
                    <td style={{ maxWidth: 200 }}>
                      {funcs.length === 0
                        ? <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                        : <ul className={styles.funcList}>{funcs.map((f, i) => <li key={i}>{f}</li>)}</ul>
                      }
                    </td>
                    <td>
                      <span className={`${styles.badge} ${p.ativo ? styles.statusATIVO : styles.statusCANCELADO}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{p.destaque ? '⭐' : '—'}</td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => abrirEditar(p)}>Editar</Button>
                    </td>
                  </tr>
                )
              })}
              {planos.length === 0 && (
                <tr><td colSpan={8} className={styles.emptyRow}>Nenhum plano cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className={styles.overlay}>
          <div className={`${styles.modal} ${styles.planoModal}`}>
            <h2 className={styles.modalTitle}>{modal === 'criar' ? 'Novo plano' : 'Editar plano'}</h2>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <label>Nome</label>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <label>Descrição</label>
                <input type="text" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div className={styles.row2}>
                <div className={styles.formRow}>
                  <label>Preço mensal (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.precoMensal}
                    onChange={e => setForm(f => ({ ...f, precoMensal: Number(e.target.value) }))} />
                </div>
                <div className={styles.formRow}>
                  <label>Limite de usuários</label>
                  <input type="number" min="1" value={form.limiteUsuarios}
                    onChange={e => setForm(f => ({ ...f, limiteUsuarios: Number(e.target.value) }))} />
                </div>
                <div className={styles.formRow}>
                  <label>Limite de mesas</label>
                  <input type="number" min="1" value={form.limiteMesas}
                    onChange={e => setForm(f => ({ ...f, limiteMesas: Number(e.target.value) }))} />
                </div>
              </div>

              <div className={styles.formRow}>
                <label>Funcionalidades incluídas</label>
                <div className={styles.funcGrid}>
                  {FUNCIONALIDADES_DISPONIVEIS.map(func => (
                    <label key={func} className={styles.funcCheck}>
                      <input
                        type="checkbox"
                        checked={form.funcionalidades.includes(func)}
                        onChange={() => toggleFunc(func)}
                      />
                      {func}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formRow} style={{ flexDirection: 'row', gap: '2rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.ativo}
                    onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
                  Ativo
                </label>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.destaque}
                    onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))} />
                  Destaque
                </label>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.periodoTeste}
                    onChange={e => setForm(f => ({ ...f, periodoTeste: e.target.checked }))} />
                  Período de teste gratuito
                </label>
              </div>
              {form.periodoTeste && (
                <div className={styles.formRow}>
                  <label>Duração do período de teste (dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.diasTeste}
                    onChange={e => setForm(f => ({ ...f, diasTeste: Number(e.target.value) }))}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
              <Button loading={saving} onClick={handleSalvar}>Salvar plano</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
