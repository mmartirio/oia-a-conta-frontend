import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { FiArrowUp, FiArrowDown, FiTrash2 } from 'react-icons/fi'
import { financeiroApi } from '../../api/financeiroApi'
import { despesaApi } from '../../api/despesaApi'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../contexts/ToastContext'
import type { CategoriaDespesa, ComissaoInfo, ComparativoFinanceiro, Despesa, EvolucaoDiaria, ResumoFinanceiro } from '../../types'
import styles from './AdminFinanceiro.module.css'

type Periodo = 'HOJE' | 'SEMANA' | 'QUINZENA' | 'MES' | 'CUSTOM'

const METODO_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
}

const CATEGORIA_LABEL: Record<CategoriaDespesa, string> = {
  ALUGUEL: 'Aluguel',
  INSUMOS: 'Insumos',
  SALARIOS: 'Salários',
  ENERGIA: 'Energia',
  MANUTENCAO: 'Manutenção',
  OUTROS: 'Outros',
}

// Paleta categórica validada (skill dataviz) para as 3 séries do gráfico de evolução —
// terracota/laranja-sol da marca + um azul com croma/luminância ajustados pra passar
// no piso de contraste categórico (o azul-marinho --color-accent é escuro demais como marca de gráfico).
const CHART_COLORS = {
  salao: '#CF4622',
  delivery: '#F68E05',
  despesas: '#1F6FA8',
}

function formatDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function periodoParaDatas(p: Periodo): { inicio: string; fim: string } {
  const agora = new Date()
  const fim = agora.toISOString()
  const inicio = new Date(agora)
  if (p === 'HOJE') {
    inicio.setHours(0, 0, 0, 0)
  } else if (p === 'SEMANA') {
    inicio.setDate(agora.getDate() - 7)
  } else if (p === 'QUINZENA') {
    inicio.setDate(agora.getDate() - 15)
  } else if (p === 'MES') {
    inicio.setDate(agora.getDate() - 30)
  }
  return { inicio: inicio.toISOString(), fim }
}

function formatMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function roleBadgeClass(role: string) {
  if (role === 'GARCON') return styles.roleGarcon
  if (role === 'ENTREGADOR') return styles.roleEntregador
  return styles.roleCozinheiro
}

function roleLabel(role: string) {
  const map: Record<string, string> = { GARCON: 'Garçom', ENTREGADOR: 'Entregador', COZINHEIRO: 'Cozinheiro' }
  return map[role] ?? role
}

export function AdminFinanceiro() {
  const toast = useToast()
  const [periodo, setPeriodo] = useState<Periodo>('HOJE')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [comissoes, setComissoes] = useState<ComissaoInfo[]>([])
  const [evolucao, setEvolucao] = useState<EvolucaoDiaria[]>([])
  const [comparativo, setComparativo] = useState<ComparativoFinanceiro | null>(null)
  const [loading, setLoading] = useState(false)

  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [despesaCategoria, setDespesaCategoria] = useState<CategoriaDespesa>('OUTROS')
  const [despesaDescricao, setDespesaDescricao] = useState('')
  const [despesaValor, setDespesaValor] = useState('')
  const [despesaData, setDespesaData] = useState(() => new Date().toISOString().slice(0, 10))
  const [salvandoDespesa, setSalvandoDespesa] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState<Despesa | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const [rangeAtual, setRangeAtual] = useState<{ inicio: string; fim: string } | null>(null)

  const buscar = async () => {
    let inicio: string
    let fim: string
    if (periodo === 'CUSTOM') {
      if (!customInicio || !customFim) return
      inicio = new Date(customInicio).toISOString()
      fim = new Date(customFim + 'T23:59:59').toISOString()
    } else {
      const datas = periodoParaDatas(periodo)
      inicio = datas.inicio
      fim = datas.fim
    }
    setRangeAtual({ inicio, fim })
    setLoading(true)
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        financeiroApi.getResumo(inicio, fim),
        financeiroApi.getComissoes(inicio, fim),
        financeiroApi.getEvolucao(inicio, fim),
        financeiroApi.getComparativo(inicio, fim),
        despesaApi.listar(inicio, fim),
      ])
      setResumo(r1.data)
      setComissoes(r2.data)
      setEvolucao(r3.data)
      setComparativo(r4.data)
      setDespesas(r5.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (periodo !== 'CUSTOM') buscar() }, [periodo])

  const recarregarDespesas = async () => {
    if (!rangeAtual) return
    const [r1, r5] = await Promise.all([
      financeiroApi.getResumo(rangeAtual.inicio, rangeAtual.fim),
      despesaApi.listar(rangeAtual.inicio, rangeAtual.fim),
    ])
    setResumo(r1.data)
    setDespesas(r5.data)
  }

  const handleAdicionarDespesa = async () => {
    const valorNum = Number(despesaValor.replace(',', '.'))
    if (!valorNum || valorNum <= 0 || !despesaData) return
    setSalvandoDespesa(true)
    try {
      await despesaApi.criar({
        categoria: despesaCategoria,
        descricao: despesaDescricao || undefined,
        valor: valorNum,
        data: despesaData,
      })
      toast.success('Despesa registrada')
      setDespesaDescricao('')
      setDespesaValor('')
      await recarregarDespesas()
    } catch {
      toast.error('Erro ao registrar despesa')
    } finally {
      setSalvandoDespesa(false)
    }
  }

  const handleExcluirDespesa = async () => {
    if (!confirmExcluir) return
    setExcluindo(true)
    try {
      await despesaApi.excluir(confirmExcluir.id)
      setConfirmExcluir(null)
      await recarregarDespesas()
    } catch {
      toast.error('Erro ao excluir despesa')
    } finally {
      setExcluindo(false)
    }
  }

  const periodos: { value: Periodo; label: string }[] = [
    { value: 'HOJE', label: 'Hoje' },
    { value: 'SEMANA', label: '7 dias' },
    { value: 'QUINZENA', label: '15 dias' },
    { value: 'MES', label: '30 dias' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Financeiro</h1>
      </div>

      <div className={styles.filtros}>
        {periodos.map(p => (
          <button
            key={p.value}
            className={`${styles.filtroBtn} ${periodo === p.value ? styles.filtroBtnAtivo : ''}`}
            onClick={() => setPeriodo(p.value)}
          >
            {p.label}
          </button>
        ))}
        {periodo === 'CUSTOM' && (
          <div className={styles.dateInputs}>
            <input type="date" className={styles.dateInput} value={customInicio} onChange={e => setCustomInicio(e.target.value)} />
            <span>até</span>
            <input type="date" className={styles.dateInput} value={customFim} onChange={e => setCustomFim(e.target.value)} />
            <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={buscar}>Buscar</button>
          </div>
        )}
      </div>

      {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Carregando...</p>}

      {resumo && !loading && (
        <>
          <div className={styles.cards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Faturamento Total</div>
              <div className={styles.cardValue}>{formatMoeda(resumo.totalGeral)}</div>
              <div className={styles.cardSub}>{resumo.qtdComandas + resumo.qtdEntregas} transações</div>
              {comparativo && (
                <div className={`${styles.comparativo} ${comparativo.variacaoPercentual >= 0 ? styles.comparativoUp : styles.comparativoDown}`}>
                  {comparativo.variacaoPercentual >= 0 ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
                  {Math.abs(comparativo.variacaoPercentual).toFixed(1)}% vs período anterior
                </div>
              )}
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Salão</div>
              <div className={styles.cardValue}>{formatMoeda(resumo.totalComandas)}</div>
              <div className={styles.cardSub}>{resumo.qtdComandas} comandas</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Delivery</div>
              <div className={styles.cardValue}>{formatMoeda(resumo.totalEntregas)}</div>
              <div className={styles.cardSub}>{resumo.qtdEntregas} entregas</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Despesas</div>
              <div className={`${styles.cardValue} ${styles.valorNegativo}`}>{formatMoeda(resumo.totalDespesas)}</div>
              <div className={styles.cardSub}>{despesas.length} lançamento{despesas.length !== 1 ? 's' : ''}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Lucro Líquido</div>
              <div className={`${styles.cardValue} ${resumo.lucroLiquido >= 0 ? styles.valorPositivo : styles.valorNegativo}`}>
                {formatMoeda(resumo.lucroLiquido)}
              </div>
              <div className={styles.cardSub}>Faturamento − Despesas</div>
            </div>
          </div>

          {evolucao.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Evolução Diária</h2>
              <div className="card" style={{ padding: '1.25rem' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolucao} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="data" tickFormatter={formatDataCurta} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(v: string) => formatDataCurta(v)}
                      formatter={(v: number | string, name: string) => [typeof v === 'number' ? formatMoeda(v) : v, name]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="totalComandas" name="Salão" stroke={CHART_COLORS.salao} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="totalEntregas" name="Delivery" stroke={CHART_COLORS.delivery} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="totalDespesas" name="Despesas" stroke={CHART_COLORS.despesas} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Despesas do Período</h2>
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div className={styles.despesaForm}>
                <Select
                  label="Categoria"
                  value={despesaCategoria}
                  onChange={e => setDespesaCategoria(e.target.value as CategoriaDespesa)}
                >
                  {Object.entries(CATEGORIA_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
                <Input
                  label="Descrição (opcional)"
                  value={despesaDescricao}
                  onChange={e => setDespesaDescricao(e.target.value)}
                  placeholder="Ex: Conta de luz de junho"
                />
                <Input
                  label="Valor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={despesaValor}
                  onChange={e => setDespesaValor(e.target.value)}
                  placeholder="0,00"
                />
                <Input
                  label="Data"
                  type="date"
                  value={despesaData}
                  onChange={e => setDespesaData(e.target.value)}
                />
                <Button loading={salvandoDespesa} onClick={handleAdicionarDespesa} className={styles.despesaFormBtn}>
                  Adicionar
                </Button>
              </div>
            </div>

            {despesas.length === 0 ? (
              <p className={styles.empty}>Nenhuma despesa lançada no período.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Descrição</th>
                      <th>Data</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{CATEGORIA_LABEL[d.categoria] ?? d.categoria}</td>
                        <td>{d.descricao || '—'}</td>
                        <td>{new Date(d.data).toLocaleDateString('pt-BR')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoeda(d.valor)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className={styles.btnExcluirDespesa} onClick={() => setConfirmExcluir(d)} title="Excluir despesa">
                            <FiTrash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Breakdown por Método de Pagamento</h2>
            {Object.keys(resumo.breakdownPorMetodo).length === 0 ? (
              <p className={styles.empty}>Sem dados no período.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resumo.breakdownPorMetodo).map(([m, v]) => (
                      <tr key={m} className={styles.metodoRow}>
                        <td>{METODO_LABEL[m] ?? m}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoeda(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Comissões por Funcionário</h2>
            {comissoes.length === 0 ? (
              <p className={styles.empty}>Nenhuma comissão calculada no período.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Funcionário</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'right' }}>Base</th>
                      <th style={{ textAlign: 'right' }}>%</th>
                      <th style={{ textAlign: 'right' }}>Comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comissoes.map(c => (
                      <tr key={`${c.role}-${c.funcionarioId}`}>
                        <td style={{ fontWeight: 600 }}>{c.nome}</td>
                        <td>
                          <span className={`${styles.comissaoRole} ${roleBadgeClass(c.role)}`}>
                            {roleLabel(c.role)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatMoeda(c.totalBase)}</td>
                        <td style={{ textAlign: 'right' }}>{c.percentual}%</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {formatMoeda(c.valorComissao)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!confirmExcluir}
        title="Excluir despesa"
        message={`Excluir a despesa "${confirmExcluir?.descricao || (confirmExcluir ? CATEGORIA_LABEL[confirmExcluir.categoria] : '')}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        loading={excluindo}
        onConfirm={handleExcluirDespesa}
        onCancel={() => setConfirmExcluir(null)}
      />
    </div>
  )
}
