import { useEffect, useState, FormEvent } from 'react'
import { estoqueApi } from '../../api/estoqueApi'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Switch } from '../../components/ui/Switch'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import type { Estoque, MovimentacaoEstoque, TipoMovimentacaoEstoque } from '../../types'
import styles from './AdminEstoque.module.css'

const TIPO_LABEL: Record<TipoMovimentacaoEstoque, string> = {
  ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste', VENDA: 'Venda', ESTORNO: 'Estorno'
}

export function AdminEstoque() {
  const toast = useToast()
  const [itens, setItens] = useState<Estoque[]>([])
  const [togglingControlado, setTogglingControlado] = useState<number | null>(null)
  const [minimoDraft, setMinimoDraft] = useState<Record<number, string>>({})
  const [savingMinimo, setSavingMinimo] = useState<number | null>(null)

  const [movModal, setMovModal] = useState<Estoque | null>(null)
  const [movTipo, setMovTipo] = useState<TipoMovimentacaoEstoque>('ENTRADA')
  const [movQuantidade, setMovQuantidade] = useState('')
  const [movMotivo, setMovMotivo] = useState('')
  const [movSaving, setMovSaving] = useState(false)
  const [movError, setMovError] = useState('')

  const [historicoModal, setHistoricoModal] = useState<Estoque | null>(null)
  const [historico, setHistorico] = useState<MovimentacaoEstoque[]>([])
  const [historicoPage, setHistoricoPage] = useState(0)
  const [historicoTotalPages, setHistoricoTotalPages] = useState(0)

  const load = () =>
    estoqueApi.listar().then(r => {
      setItens(r.data)
      setMinimoDraft(Object.fromEntries(r.data.map(e => [e.produtoId, String(e.quantidadeMinima)])))
    }).catch(() => {})

  useEffect(() => { load() }, [])

  const handleToggleControlado = async (item: Estoque, controlado: boolean) => {
    setTogglingControlado(item.produtoId)
    try {
      await estoqueApi.configurar(item.produtoId, { quantidadeMinima: item.quantidadeMinima, controlado })
      load()
    } catch {
      toast.error('Erro ao atualizar controle de estoque')
    } finally {
      setTogglingControlado(null)
    }
  }

  const handleSalvarMinimo = async (item: Estoque) => {
    const valor = Number(minimoDraft[item.produtoId])
    if (Number.isNaN(valor) || valor < 0) {
      toast.error('Quantidade mínima inválida')
      return
    }
    setSavingMinimo(item.produtoId)
    try {
      await estoqueApi.configurar(item.produtoId, { quantidadeMinima: valor, controlado: item.controlado })
      load()
    } catch {
      toast.error('Erro ao salvar quantidade mínima')
    } finally {
      setSavingMinimo(null)
    }
  }

  const openMovimentar = (item: Estoque) => {
    setMovModal(item)
    setMovTipo('ENTRADA')
    setMovQuantidade('')
    setMovMotivo('')
    setMovError('')
  }

  const handleSalvarMovimento = async (e: FormEvent) => {
    e.preventDefault()
    if (!movModal) return
    const quantidade = Number(movQuantidade)
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      setMovError('Quantidade inválida')
      return
    }
    setMovError('')
    setMovSaving(true)
    try {
      await estoqueApi.movimentar(movModal.produtoId, { tipo: movTipo, quantidade, motivo: movMotivo || undefined })
      setMovModal(null)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setMovError(msg ?? 'Erro ao registrar movimentação')
    } finally {
      setMovSaving(false)
    }
  }

  const openHistorico = (item: Estoque, page = 0) => {
    setHistoricoModal(item)
    setHistoricoPage(page)
    estoqueApi.listarMovimentacoes(item.produtoId, page).then(r => {
      setHistorico(r.data.content)
      setHistoricoTotalPages(r.data.totalPages)
    }).catch(() => {})
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Estoque</h1>
      </div>

      <div className={styles.list}>
        {itens.map(item => (
          <Card key={item.produtoId} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowNome}>{item.produtoNome}</span>
              <span className={styles.rowSaldo}>
                Saldo: {item.controlado ? item.quantidade : '—'}
                {item.abaixoDoMinimo && (
                  <Badge variant="danger" size="sm">Estoque baixo</Badge>
                )}
              </span>
            </div>

            <div className={styles.rowActions}>
              {item.controlado && (
                <div className={styles.minimoField}>
                  <span className={styles.minimoLabel}>Mínimo</span>
                  <input
                    className={styles.minimoInput}
                    type="number"
                    min={0}
                    value={minimoDraft[item.produtoId] ?? ''}
                    onChange={e => setMinimoDraft(d => ({ ...d, [item.produtoId]: e.target.value }))}
                    onBlur={() => {
                      if (Number(minimoDraft[item.produtoId]) !== item.quantidadeMinima) handleSalvarMinimo(item)
                    }}
                    disabled={savingMinimo === item.produtoId}
                  />
                </div>
              )}
              <Switch
                checked={item.controlado}
                disabled={togglingControlado === item.produtoId}
                onChange={controlado => handleToggleControlado(item, controlado)}
                label={item.controlado ? 'Controlado' : 'Sem controle'}
              />
              {item.controlado && (
                <>
                  <Button variant="outline" size="sm" onClick={() => openMovimentar(item)}>Movimentar</Button>
                  <Button variant="ghost" size="sm" onClick={() => openHistorico(item)}>Histórico</Button>
                </>
              )}
            </div>
          </Card>
        ))}
        {itens.length === 0 && (
          <p className={styles.empty}>Nenhum produto cadastrado.</p>
        )}
      </div>

      {/* Modal Movimentar */}
      <Modal
        isOpen={!!movModal}
        onClose={() => setMovModal(null)}
        title={`Movimentar estoque — ${movModal?.produtoNome ?? ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setMovModal(null)}>Cancelar</Button>
            <Button
              loading={movSaving}
              onClick={() => document.getElementById('mov-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="mov-form" onSubmit={handleSalvarMovimento} className={styles.form}>
          {movError && <div className={styles.formError}>{movError}</div>}
          <Select
            label="Tipo"
            value={movTipo}
            onChange={e => setMovTipo(e.target.value as TipoMovimentacaoEstoque)}
          >
            <option value="ENTRADA">Entrada (reposição)</option>
            <option value="SAIDA">Saída (perda, quebra...)</option>
            <option value="AJUSTE">Ajuste (corrigir saldo para um valor exato)</option>
          </Select>
          <Input
            label={movTipo === 'AJUSTE' ? 'Novo saldo' : 'Quantidade'}
            type="number"
            min={0}
            value={movQuantidade}
            onChange={e => setMovQuantidade(e.target.value)}
            required
          />
          <Input
            label="Motivo (opcional)"
            value={movMotivo}
            onChange={e => setMovMotivo(e.target.value)}
            placeholder="Ex: reposição do fornecedor, produto vencido..."
          />
        </form>
      </Modal>

      {/* Modal Histórico */}
      <Modal
        isOpen={!!historicoModal}
        onClose={() => setHistoricoModal(null)}
        title={`Histórico — ${historicoModal?.produtoNome ?? ''}`}
        footer={<Button variant="outline" onClick={() => setHistoricoModal(null)}>Fechar</Button>}
      >
        <div className={styles.historico}>
          {historico.map(m => (
            <div key={m.id} className={styles.historicoRow}>
              <div className={styles.historicoInfo}>
                <span>{TIPO_LABEL[m.tipo]} {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade} (saldo: {m.quantidadeResultante})</span>
                {m.motivo && <span className={styles.historicoMotivo}>{m.motivo}</span>}
                <span className={styles.historicoData}>
                  {new Date(m.criadoEm).toLocaleString('pt-BR')}{m.criadoPorNome ? ` · ${m.criadoPorNome}` : ''}
                </span>
              </div>
            </div>
          ))}
          {historico.length === 0 && <p className={styles.empty}>Nenhuma movimentação registrada.</p>}
        </div>
        {historicoModal && (
          <Pagination
            page={historicoPage}
            totalPages={historicoTotalPages}
            onPageChange={p => openHistorico(historicoModal, p)}
          />
        )}
      </Modal>
    </div>
  )
}
