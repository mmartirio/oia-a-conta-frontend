import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ComposedChart, BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { FiArrowDown, FiArrowUp, FiDownload, FiTrash2 } from 'react-icons/fi'
import { financeiroApi, type MetasMes, type ResumoInsumos } from '../../api/financeiroApi'
import { despesaApi } from '../../api/despesaApi'
import type { Venda } from '../../api/caixaApi'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { baixarCsv } from '../../utils/csv'
import type { CategoriaDespesa, ComissaoInfo, ComparativoFinanceiro, Despesa, EvolucaoDiaria, ResumoFinanceiro } from '../../types'
import { Abas, Chips, Kpi, PageHeader, Secao, Vazio, corTema, ui } from '../gestor/painelUi'
import {
  METODO_LABEL, dataCurta, intervaloDoMes, intervaloDoPeriodo, mesAtual, moeda, moedaCurta,
  type Intervalo, type Periodo,
} from './financeiro/periodo'
import styles from './AdminFinanceiro.module.css'

type Aba = 'visao' | 'vendas' | 'despesas' | 'insumos' | 'metas' | 'comissoes'

// Paleta categórica já validada (skill dataviz) — terracota/laranja da marca
// + azul ajustado pra passar no piso de contraste.
const COR = { salao: '#CF4622', delivery: '#F68E05', despesas: '#1F6FA8' }

const CATEGORIA_LABEL: Record<CategoriaDespesa, string> = {
  ALUGUEL: 'Aluguel', INSUMOS: 'Insumos', SALARIOS: 'Salários', ENERGIA: 'Energia', MANUTENCAO: 'Manutenção', OUTROS: 'Outros',
}
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: 'HOJE', rotulo: 'Hoje' },
  { id: 'ONTEM', rotulo: 'Ontem' },
  { id: 'SETE', rotulo: '7 dias' },
  { id: 'MES', rotulo: 'Este mês' },
  { id: 'MES_ANTERIOR', rotulo: 'Mês passado' },
  { id: 'CUSTOM', rotulo: 'Personalizado' },
]

// Barra horizontal de participação (formas de pagamento, categorias).
function Participacao({ itens }: { itens: { rotulo: string; valor: number }[] }) {
  const total = itens.reduce((s, i) => s + i.valor, 0)
  if (total <= 0) return <Vazio>Sem dados no período.</Vazio>
  return (
    <ul className={styles.participacao}>
      {[...itens].sort((a, b) => b.valor - a.valor).map(i => {
        const pct = (i.valor / total) * 100
        return (
          <li key={i.rotulo}>
            <div className={styles.participacaoTopo}>
              <span>{i.rotulo}</span>
              <span><strong>{moeda(i.valor)}</strong> <span className={ui.secundario}>{pct.toFixed(0)}%</span></span>
            </div>
            <div className={styles.participacaoTrilho}><div className={styles.participacaoBarra} style={{ width: `${pct}%` }} /></div>
          </li>
        )
      })}
    </ul>
  )
}

function Progresso({ rotulo, realizado, meta, inverso, projecao }: {
  rotulo: string; realizado: number; meta: number | null; inverso?: boolean; projecao?: number | null
}) {
  if (meta == null || meta <= 0) {
    return <Kpi rotulo={rotulo} valor={moeda(realizado)} detalhe="Sem meta definida" />
  }
  const pct = (realizado / meta) * 100
  // "inverso" = teto (despesas): passar do limite é ruim.
  const tom = inverso ? (pct > 100 ? 'critico' : pct > 85 ? 'alerta' : 'bom') : (pct >= 100 ? 'bom' : 'neutro')
  return (
    <div className={`${ui.kpi} ${ui[`kpi_${tom}`]}`}>
      <div className={ui.kpiRotulo}>{rotulo}</div>
      <div className={ui.kpiValor}>{moeda(realizado)}</div>
      <div className={styles.metaTrilho} aria-label={`${pct.toFixed(0)}% da meta`}>
        <div className={`${styles.metaBarra} ${styles[`metaBarra_${tom}`]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className={ui.kpiDetalhe}>
        {pct.toFixed(0)}% de {moeda(meta)}{inverso ? ' (teto)' : ''}
        {projecao != null && <> · projeção {moeda(projecao)}</>}
      </div>
    </div>
  )
}

export function AdminFinanceiro() {
  const toast = useToast()
  const { user } = useAuth()
  const podeEditarMetas = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'visao'
  const trocarAba = (a: Aba) => setParams(a === 'visao' ? {} : { aba: a }, { replace: true })

  // ── Período ──
  const [periodo, setPeriodo] = useState<Periodo>('MES')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')
  const [faixa, setFaixa] = useState<Intervalo | null>(() => intervaloDoPeriodo('MES'))

  useEffect(() => {
    if (periodo !== 'CUSTOM') setFaixa(intervaloDoPeriodo(periodo))
  }, [periodo])

  // ── Dados do período (cada bloco independente: um erro/sem permissão não derruba a tela) ──
  const [carregando, setCarregando] = useState(false)
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [comparativo, setComparativo] = useState<ComparativoFinanceiro | null>(null)
  const [evolucao, setEvolucao] = useState<EvolucaoDiaria[]>([])
  const [vendas, setVendas] = useState<Venda[] | null>(null)
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [insumos, setInsumos] = useState<ResumoInsumos | null>(null)
  const [comissoes, setComissoes] = useState<ComissaoInfo[] | null>(null)
  const [erro, setErro] = useState('')

  const carregar = async (f: Intervalo) => {
    setCarregando(true)
    setErro('')
    const [r, c, e, v, d, i, k] = await Promise.allSettled([
      financeiroApi.getResumo(f.inicio, f.fim),
      financeiroApi.getComparativo(f.inicio, f.fim),
      financeiroApi.getEvolucao(f.inicio, f.fim),
      financeiroApi.getVendas(f.inicio, f.fim),
      despesaApi.listar(f.inicioData, f.fimData),
      financeiroApi.getInsumos(f.inicio, f.fim),
      financeiroApi.getComissoes(f.inicio, f.fim),
    ])
    if (r.status === 'fulfilled') setResumo(r.value.data)
    else { setResumo(null); setErro('Não foi possível carregar os dados financeiros.') }
    setComparativo(c.status === 'fulfilled' ? c.value.data : null)
    setEvolucao(e.status === 'fulfilled' ? e.value.data : [])
    setVendas(v.status === 'fulfilled' ? v.value.data : [])
    setDespesas(d.status === 'fulfilled' ? d.value.data : [])
    setInsumos(i.status === 'fulfilled' ? i.value.data : null)
    setComissoes(k.status === 'fulfilled' ? k.value.data : null) // null = sem permissão
    setCarregando(false)
  }

  useEffect(() => { if (faixa) carregar(faixa) }, [faixa])

  // ── Derivados ──
  const qtdVendas = resumo ? resumo.qtdComandas + resumo.qtdEntregas : 0
  const ticketMedio = qtdVendas ? (resumo?.totalGeral ?? 0) / qtdVendas : 0
  const comprasInsumos = Number(insumos?.totalEntradas ?? 0)
  const custos = (resumo?.totalDespesas ?? 0) + comprasInsumos
  const resultado = (resumo?.totalGeral ?? 0) - custos
  const margem = resumo?.totalGeral ? (resultado / resumo.totalGeral) * 100 : null

  const porHora = useMemo(() => {
    const m = new Map<number, number>()
    ;(vendas ?? []).forEach(v => { const h = new Date(v.horario).getHours(); m.set(h, (m.get(h) ?? 0) + Number(v.total)) })
    if (m.size === 0) return []
    const horas = [...m.keys()]
    const de = Math.min(...horas), ate = Math.max(...horas)
    return Array.from({ length: ate - de + 1 }, (_, i) => ({ hora: `${de + i}h`, valor: m.get(de + i) ?? 0 }))
  }, [vendas])

  const porDiaSemana = useMemo(() => {
    const t = Array(7).fill(0)
    ;(vendas ?? []).forEach(v => { t[new Date(v.horario).getDay()] += Number(v.total) })
    return DIAS_SEMANA.map((dia, i) => ({ dia, valor: t[i] }))
  }, [vendas])

  const formasPagamento = resumo
    ? Object.entries(resumo.breakdownPorMetodo).map(([m, v]) => ({ rotulo: METODO_LABEL[m] ?? m, valor: Number(v) })).filter(x => x.valor > 0)
    : []

  // ── Cores dos gráficos (resolvidas do tema) ──
  const corPrimaria = corTema('--color-primary', '#CF4622')
  const corGrade = corTema('--color-border', '#e5ded6')
  const corEixo = corTema('--color-text-secondary', '#64748b')
  const eixo = { fontSize: 12, fill: corEixo }

  return (
    <div className={styles.page}>
      <PageHeader titulo="Financeiro" subtitulo="Faturamento, custos, metas e compras de insumos do restaurante." />

      <div className={ui.filtros}>
        <Chips opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} />
        {periodo === 'CUSTOM' && (
          <div className={styles.dateInputs}>
            <input type="date" className={styles.dateInput} value={customInicio} onChange={e => setCustomInicio(e.target.value)} />
            <span>até</span>
            <input type="date" className={styles.dateInput} value={customFim} onChange={e => setCustomFim(e.target.value)} />
            <Button size="sm" onClick={() => {
              const f = intervaloDoPeriodo('CUSTOM', customInicio, customFim)
              if (f) setFaixa(f); else toast.error('Período inválido')
            }}>Aplicar</Button>
          </div>
        )}
        {faixa && <span className={ui.secundario}>{dataCurta(faixa.inicioData)} a {dataCurta(faixa.fimData)}</span>}
      </div>

      <Abas
        ativa={aba}
        onChange={trocarAba}
        abas={[
          { id: 'visao', rotulo: 'Visão geral' },
          { id: 'vendas', rotulo: 'Vendas' },
          { id: 'despesas', rotulo: 'Despesas' },
          { id: 'insumos', rotulo: 'Insumos' },
          { id: 'metas', rotulo: 'Metas' },
          ...(comissoes !== null ? [{ id: 'comissoes' as Aba, rotulo: 'Comissões' }] : []),
        ]}
      />

      {carregando && <Vazio>Carregando...</Vazio>}
      {erro && !carregando && (
        <div className={styles.erroBox}>
          <p>{erro}</p>
          <Button variant="outline" size="sm" onClick={() => faixa && carregar(faixa)}>Tentar novamente</Button>
        </div>
      )}

      {!carregando && resumo && aba === 'visao' && (
        <>
          <div className={ui.kpiGrid}>
            <Kpi
              rotulo="Faturamento"
              valor={moeda(resumo.totalGeral)}
              detalhe={comparativo ? (
                <span className={comparativo.variacaoPercentual >= 0 ? styles.subiu : styles.caiu}>
                  {comparativo.variacaoPercentual >= 0 ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                  {' '}{Math.abs(comparativo.variacaoPercentual).toFixed(1)}% vs. período anterior
                </span>
              ) : `${qtdVendas} vendas`}
              tom="bom"
            />
            <Kpi rotulo="Ticket médio" valor={moeda(ticketMedio)} detalhe={`${qtdVendas} vendas no período`} />
            <Kpi
              rotulo="Custos"
              valor={moeda(custos)}
              detalhe={`Despesas ${moeda(resumo.totalDespesas)} · Insumos ${moeda(comprasInsumos)}`}
              tom="alerta"
            />
            <Kpi
              rotulo="Resultado"
              valor={moeda(resultado)}
              detalhe={margem != null ? `Margem de ${margem.toFixed(1)}%` : 'Faturamento − custos'}
              tom={resultado >= 0 ? 'bom' : 'critico'}
            />
          </div>

          <Secao titulo="Faturamento e despesas por dia">
            {evolucao.length <= 1 ? <Vazio>Escolha um período de mais de um dia para ver a evolução.</Vazio> : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart data={evolucao} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid vertical={false} stroke={corGrade} />
                    <XAxis dataKey="data" tickFormatter={dataCurta} tick={eixo} axisLine={false} tickLine={false} />
                    <YAxis width={64} tickFormatter={moedaCurta} tick={eixo} axisLine={false} tickLine={false} />
                    <Tooltip labelFormatter={(v: string) => dataCurta(v)} formatter={(v: number | string, n: string) => [moeda(Number(v)), n]} />
                    <Legend />
                    <Bar dataKey="totalComandas" name="Salão" stackId="fat" fill={COR.salao} />
                    <Bar dataKey="totalEntregas" name="Delivery" stackId="fat" fill={COR.delivery} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="totalDespesas" name="Despesas" stroke={COR.despesas} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Secao>

          <div className={ui.grid2}>
            <Secao titulo="Horários de pico (faturamento por hora)">
              {porHora.length === 0 ? <Vazio>Sem vendas no período.</Vazio> : (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={porHora} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={corGrade} />
                      <XAxis dataKey="hora" tick={eixo} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis width={56} tickFormatter={moedaCurta} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number | string) => [moeda(Number(v)), 'Faturamento']} />
                      <Bar dataKey="valor" fill={corPrimaria} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Secao>
            <Secao titulo="Faturamento por dia da semana">
              {(vendas ?? []).length === 0 ? <Vazio>Sem vendas no período.</Vazio> : (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={porDiaSemana} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={corGrade} />
                      <XAxis dataKey="dia" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis width={56} tickFormatter={moedaCurta} tick={eixo} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number | string) => [moeda(Number(v)), 'Faturamento']} />
                      <Bar dataKey="valor" fill={corPrimaria} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Secao>
          </div>

          <div className={ui.grid2} style={{ marginTop: '1.25rem' }}>
            <Secao titulo="Formas de pagamento">
              <Participacao itens={formasPagamento} />
            </Secao>
            <Secao titulo="Salão × Delivery">
              <Participacao itens={[
                { rotulo: `Salão (${resumo.qtdComandas})`, valor: Number(resumo.totalComandas) },
                { rotulo: `Delivery (${resumo.qtdEntregas})`, valor: Number(resumo.totalEntregas) },
              ]} />
            </Secao>
          </div>
        </>
      )}

      {!carregando && aba === 'vendas' && <AbaVendas vendas={vendas ?? []} faixa={faixa} />}
      {!carregando && aba === 'despesas' && faixa && (
        <AbaDespesas despesas={despesas} faixa={faixa} onMudou={() => carregar(faixa)} />
      )}
      {!carregando && aba === 'insumos' && <AbaInsumos insumos={insumos} faixa={faixa} />}
      {aba === 'metas' && <AbaMetas podeEditar={podeEditarMetas} />}
      {!carregando && aba === 'comissoes' && comissoes && <AbaComissoes comissoes={comissoes} />}
    </div>
  )
}

// ─── Vendas ──────────────────────────────────────────────────────────────────

function AbaVendas({ vendas, faixa }: { vendas: Venda[]; faixa: Intervalo | null }) {
  const [tipo, setTipo] = useState<'TODAS' | 'COMANDA' | 'ENTREGA'>('TODAS')
  const [metodo, setMetodo] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const visiveis = vendas
    .filter(v => tipo === 'TODAS' || v.tipo === tipo)
    .filter(v => metodo === 'TODOS' || v.metodoPagamento === metodo)
    .filter(v => !termo || (v.descricao ?? '').toLowerCase().includes(termo) || (v.itensDescricao ?? '').toLowerCase().includes(termo))
  const total = visiveis.reduce((s, v) => s + Number(v.total), 0)
  const metodos = [...new Set(vendas.map(v => v.metodoPagamento).filter(Boolean))]

  const exportar = () => baixarCsv(
    `vendas_${faixa?.inicioData}_a_${faixa?.fimData}.csv`,
    ['Data/hora', 'Tipo', 'Descrição', 'Itens', 'Forma de pagamento', 'Valor'],
    visiveis.map(v => [
      new Date(v.horario).toLocaleString('pt-BR'), v.tipo === 'ENTREGA' ? 'Delivery' : 'Salão',
      v.descricao, v.itensDescricao ?? '', METODO_LABEL[v.metodoPagamento] ?? v.metodoPagamento, Number(v.total),
    ]),
  )

  return (
    <>
      <div className={ui.filtros}>
        <input className={ui.busca} placeholder="Buscar por mesa, cliente ou produto..." value={busca} onChange={e => setBusca(e.target.value)} />
        <Chips
          valor={tipo}
          onChange={setTipo}
          opcoes={[
            { id: 'TODAS', rotulo: 'Todas', contagem: vendas.length },
            { id: 'COMANDA', rotulo: 'Salão', contagem: vendas.filter(v => v.tipo === 'COMANDA').length },
            { id: 'ENTREGA', rotulo: 'Delivery', contagem: vendas.filter(v => v.tipo === 'ENTREGA').length },
          ]}
        />
        <select className={styles.select} value={metodo} onChange={e => setMetodo(e.target.value)} aria-label="Forma de pagamento">
          <option value="TODOS">Todas as formas</option>
          {metodos.map(m => <option key={m} value={m}>{METODO_LABEL[m] ?? m}</option>)}
        </select>
      </div>
      <Secao
        titulo={`${visiveis.length} venda(s) · ${moeda(total)}`}
        semPadding
        acoes={<Button size="sm" variant="ghost" onClick={exportar} disabled={visiveis.length === 0}><FiDownload size={14} /> Exportar CSV</Button>}
      >
        {visiveis.length === 0 ? <Vazio>Nenhuma venda no período.</Vazio> : (
          <div className={ui.tabelaWrap}>
            <table className={ui.tabela}>
              <thead><tr><th>Data/hora</th><th>Tipo</th><th>Descrição</th><th>Pagamento</th><th className={ui.num}>Valor</th></tr></thead>
              <tbody>
                {visiveis.map(v => (
                  <tr key={`${v.tipo}-${v.id}`}>
                    <td>{new Date(v.horario).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{v.tipo === 'ENTREGA' ? 'Delivery' : 'Salão'}</td>
                    <td>
                      {v.descricao}
                      {v.mesaNumero != null && v.itensDescricao && <div className={ui.secundario}>{v.itensDescricao}</div>}
                    </td>
                    <td>{METODO_LABEL[v.metodoPagamento] ?? v.metodoPagamento}{v.parcelas && v.parcelas > 1 ? ` (${v.parcelas}x)` : ''}</td>
                    <td className={ui.num}><strong>{moeda(Number(v.total))}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </>
  )
}

// ─── Despesas ────────────────────────────────────────────────────────────────

function AbaDespesas({ despesas, faixa, onMudou }: { despesas: Despesa[]; faixa: Intervalo; onMudou: () => void }) {
  const toast = useToast()
  const [categoria, setCategoria] = useState<CategoriaDespesa>('OUTROS')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(() => new Date().toLocaleDateString('sv-SE'))
  const [salvando, setSalvando] = useState(false)
  const [excluir, setExcluir] = useState<Despesa | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const total = despesas.reduce((s, d) => s + Number(d.valor), 0)

  const porCategoria = useMemo(() => {
    const m = new Map<CategoriaDespesa, number>()
    despesas.forEach(d => m.set(d.categoria, (m.get(d.categoria) ?? 0) + Number(d.valor)))
    return [...m.entries()].map(([c, v]) => ({ rotulo: CATEGORIA_LABEL[c] ?? c, valor: v }))
  }, [despesas])

  const adicionar = async () => {
    const v = Number(valor.replace(',', '.'))
    if (!v || v <= 0 || !data) { toast.error('Informe valor e data'); return }
    setSalvando(true)
    try {
      await despesaApi.criar({ categoria, descricao: descricao || undefined, valor: v, data })
      toast.success('Despesa registrada')
      setDescricao(''); setValor('')
      onMudou()
    } catch {
      toast.error('Erro ao registrar despesa')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    setExcluindo(true)
    try {
      await despesaApi.excluir(excluir.id)
      setExcluir(null)
      onMudou()
    } catch {
      toast.error('Erro ao excluir despesa')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <>
      <Secao titulo="Nova despesa">
        <div className={ui.formLinha}>
          <div className={ui.campo}>
            <label htmlFor="d-cat">Categoria</label>
            <select id="d-cat" value={categoria} onChange={e => setCategoria(e.target.value as CategoriaDespesa)}>
              {Object.entries(CATEGORIA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className={ui.campo} style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="d-desc">Descrição</label>
            <input id="d-desc" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: conta de luz de outubro" />
          </div>
          <div className={ui.campo}>
            <label htmlFor="d-valor">Valor (R$)</label>
            <input id="d-valor" type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} style={{ width: 130 }} />
          </div>
          <div className={ui.campo}>
            <label htmlFor="d-data">Data</label>
            <input id="d-data" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <Button loading={salvando} onClick={adicionar}>Adicionar</Button>
        </div>
        <p className={ui.nota} style={{ margin: '0.75rem 0 0' }}>
          Compras de insumos lançadas no Estoque (entrada com custo) já entram na aba Insumos — não lance de novo aqui.
        </p>
      </Secao>

      <div className={ui.grid2}>
        <Secao titulo={`Por categoria · ${moeda(total)}`}>
          <Participacao itens={porCategoria} />
        </Secao>
        <Secao
          titulo={`Lançamentos (${despesas.length})`}
          semPadding
          acoes={<Button size="sm" variant="ghost" disabled={despesas.length === 0} onClick={() => baixarCsv(
            `despesas_${faixa.inicioData}_a_${faixa.fimData}.csv`,
            ['Data', 'Categoria', 'Descrição', 'Valor'],
            despesas.map(d => [dataCurta(d.data), CATEGORIA_LABEL[d.categoria] ?? d.categoria, d.descricao ?? '', Number(d.valor)]),
          )}><FiDownload size={14} /> CSV</Button>}
        >
          {despesas.length === 0 ? <Vazio>Nenhuma despesa no período.</Vazio> : (
            <div className={ui.tabelaWrap}>
              <table className={ui.tabela} style={{ minWidth: 420 }}>
                <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th className={ui.num}>Valor</th><th /></tr></thead>
                <tbody>
                  {despesas.map(d => (
                    <tr key={d.id}>
                      <td>{dataCurta(d.data)}</td>
                      <td>{CATEGORIA_LABEL[d.categoria] ?? d.categoria}</td>
                      <td className={ui.secundario}>{d.descricao || '—'}</td>
                      <td className={ui.num}><strong>{moeda(Number(d.valor))}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={styles.btnExcluirDespesa} onClick={() => setExcluir(d)} title="Excluir despesa" aria-label="Excluir despesa">
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      </div>

      <ConfirmDialog
        isOpen={!!excluir}
        title="Excluir despesa"
        message={`Excluir "${excluir?.descricao || (excluir ? CATEGORIA_LABEL[excluir.categoria] : '')}" de ${moeda(Number(excluir?.valor ?? 0))}?`}
        confirmLabel="Excluir"
        danger
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </>
  )
}

// ─── Insumos ─────────────────────────────────────────────────────────────────

function AbaInsumos({ insumos, faixa }: { insumos: ResumoInsumos | null; faixa: Intervalo | null }) {
  if (!insumos) return <Vazio>Não foi possível carregar as compras de insumos.</Vazio>
  return (
    <>
      <div className={ui.kpiGrid}>
        <Kpi rotulo="Compras no período" valor={moeda(insumos.totalEntradas)} detalhe={`${insumos.qtdEntradas} entrada(s) no estoque`} tom="alerta" />
        <Kpi rotulo="Valor em estoque hoje" valor={moeda(insumos.valorEmEstoque)} detalhe="Saldo × custo médio de cada produto" />
        <Kpi
          rotulo="Entradas sem custo"
          valor={insumos.entradasSemCusto}
          detalhe={insumos.entradasSemCusto > 0 ? 'Não entram no total — informe o custo nas próximas' : 'Todas com custo informado'}
          tom={insumos.entradasSemCusto > 0 ? 'alerta' : 'bom'}
        />
      </div>

      <Secao
        titulo="Entradas de estoque no período"
        semPadding
        acoes={<>
          <Link to="/admin/estoque"><Button size="sm" variant="ghost">Lançar entrada</Button></Link>
          <Button size="sm" variant="ghost" disabled={insumos.entradas.length === 0} onClick={() => baixarCsv(
            `compras_insumos_${faixa?.inicioData}_a_${faixa?.fimData}.csv`,
            ['Data/hora', 'Produto', 'Quantidade', 'Custo unitário', 'Total', 'Lançado por', 'Motivo'],
            insumos.entradas.map(e => [new Date(e.criadoEm).toLocaleString('pt-BR'), e.produtoNome, e.quantidade,
              e.custoUnitario != null ? Number(e.custoUnitario) : null, e.valorTotal != null ? Number(e.valorTotal) : null,
              e.criadoPorNome ?? '', e.motivo ?? '']),
          )}><FiDownload size={14} /> CSV</Button>
        </>}
      >
        {insumos.entradas.length === 0 ? <Vazio>Nenhuma entrada de estoque no período.</Vazio> : (
          <div className={ui.tabelaWrap}>
            <table className={ui.tabela}>
              <thead><tr><th>Data</th><th>Produto</th><th className={ui.num}>Qtd.</th><th className={ui.num}>Custo unit.</th><th className={ui.num}>Total</th><th>Por</th></tr></thead>
              <tbody>
                {insumos.entradas.map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={ui.empresaNome}>{e.produtoNome}{e.motivo && <div className={ui.secundario}>{e.motivo}</div>}</td>
                    <td className={ui.num}>{e.quantidade}</td>
                    <td className={ui.num}>{e.custoUnitario != null ? moeda(Number(e.custoUnitario)) : <span className={ui.secundario}>—</span>}</td>
                    <td className={ui.num}>{e.valorTotal != null ? <strong>{moeda(Number(e.valorTotal))}</strong> : <span className={ui.secundario}>sem custo</span>}</td>
                    <td className={ui.secundario}>{e.criadoPorNome ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="O que está parado em estoque (por valor)" semPadding>
        {insumos.itensEstoque.length === 0 ? <Vazio>Nenhum produto com custo médio — lance entradas com custo no Estoque.</Vazio> : (
          <div className={ui.tabelaWrap}>
            <table className={ui.tabela}>
              <thead><tr><th>Produto</th><th className={ui.num}>Saldo</th><th className={ui.num}>Custo médio</th><th className={ui.num}>Valor</th></tr></thead>
              <tbody>
                {insumos.itensEstoque.map(i => (
                  <tr key={i.produtoId}>
                    <td className={ui.empresaNome}>{i.produtoNome}</td>
                    <td className={ui.num}>{i.quantidade}</td>
                    <td className={ui.num}>{moeda(Number(i.custoMedio))}</td>
                    <td className={ui.num}><strong>{moeda(Number(i.valor))}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </>
  )
}

// ─── Metas ───────────────────────────────────────────────────────────────────

function AbaMetas({ podeEditar }: { podeEditar: boolean }) {
  const toast = useToast()
  const [mes, setMes] = useState(mesAtual())
  const [metas, setMetas] = useState<MetasMes | null>(null)
  const [form, setForm] = useState({ metaFaturamento: '', metaLucro: '', limiteDespesas: '' })
  const [salvando, setSalvando] = useState(false)
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [evolucao, setEvolucao] = useState<EvolucaoDiaria[]>([])
  const [compras, setCompras] = useState(0)
  const faixaMes = useMemo(() => intervaloDoMes(mes), [mes])

  useEffect(() => {
    financeiroApi.getMetas(mes).then(r => {
      setMetas(r.data)
      setForm({
        metaFaturamento: r.data.metaFaturamento?.toString() ?? '',
        metaLucro: r.data.metaLucro?.toString() ?? '',
        limiteDespesas: r.data.limiteDespesas?.toString() ?? '',
      })
    }).catch(() => setMetas({ mes, metaFaturamento: null, metaLucro: null, limiteDespesas: null }))
    Promise.allSettled([
      financeiroApi.getResumo(faixaMes.inicio, faixaMes.fim),
      financeiroApi.getEvolucao(faixaMes.inicio, faixaMes.fim),
      financeiroApi.getInsumos(faixaMes.inicio, faixaMes.fim),
    ]).then(([r, e, i]) => {
      setResumo(r.status === 'fulfilled' ? r.value.data : null)
      setEvolucao(e.status === 'fulfilled' ? e.value.data : [])
      setCompras(i.status === 'fulfilled' ? Number(i.value.data.totalEntradas) : 0)
    })
  }, [mes, faixaMes])

  const salvar = async () => {
    setSalvando(true)
    const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
    try {
      const r = await financeiroApi.salvarMetas({
        mes, metaFaturamento: num(form.metaFaturamento), metaLucro: num(form.metaLucro), limiteDespesas: num(form.limiteDespesas),
      })
      setMetas(r.data)
      toast.success('Metas salvas')
    } catch {
      toast.error('Erro ao salvar as metas')
    } finally {
      setSalvando(false)
    }
  }

  const faturamento = Number(resumo?.totalGeral ?? 0)
  const gastos = Number(resumo?.totalDespesas ?? 0) + compras
  const lucro = faturamento - gastos
  const projetar = (v: number) => faixaMes.ehMesAtual && faixaMes.diasDecorridos > 0
    ? (v / faixaMes.diasDecorridos) * faixaMes.diasNoMes : null

  // Acumulado do mês × ritmo linear da meta (dia a dia).
  const acumulado = useMemo(() => {
    const porDia = new Map(evolucao.map(d => [d.data.slice(0, 10), Number(d.totalComandas) + Number(d.totalEntregas)]))
    const [a, m] = mes.split('-').map(Number)
    let soma = 0
    return Array.from({ length: faixaMes.diasNoMes }, (_, i) => {
      const dia = `${a}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      const passou = i < faixaMes.diasDecorridos
      if (passou) soma += porDia.get(dia) ?? 0
      return {
        dia: String(i + 1),
        realizado: passou ? soma : null,
        meta: metas?.metaFaturamento ? (Number(metas.metaFaturamento) / faixaMes.diasNoMes) * (i + 1) : null,
      }
    })
  }, [evolucao, mes, faixaMes, metas])

  const corPrimaria = corTema('--color-primary', '#CF4622')
  const corGrade = corTema('--color-border', '#e5ded6')
  const corEixo = corTema('--color-text-secondary', '#64748b')

  return (
    <>
      <div className={ui.filtros}>
        <div className={ui.campo}>
          <label htmlFor="mes-meta">Mês</label>
          <input id="mes-meta" type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} />
        </div>
        {faixaMes.ehMesAtual && (
          <span className={ui.secundario} style={{ alignSelf: 'flex-end' }}>
            Dia {faixaMes.diasDecorridos} de {faixaMes.diasNoMes} — projeção pelo ritmo atual
          </span>
        )}
      </div>

      <div className={ui.kpiGrid}>
        <Progresso rotulo="Faturamento" realizado={faturamento} meta={metas?.metaFaturamento ?? null} projecao={projetar(faturamento)} />
        <Progresso rotulo="Lucro (após despesas e insumos)" realizado={lucro} meta={metas?.metaLucro ?? null} projecao={projetar(lucro)} />
        <Progresso rotulo="Gastos (despesas + insumos)" realizado={gastos} meta={metas?.limiteDespesas ?? null} inverso projecao={projetar(gastos)} />
      </div>

      <Secao titulo="Faturamento acumulado no mês × meta">
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={acumulado} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={corGrade} />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: corEixo }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis width={64} tickFormatter={moedaCurta} tick={{ fontSize: 12, fill: corEixo }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(d: string) => `Dia ${d}`} formatter={(v: number | string, n: string) => [moeda(Number(v)), n]} />
              <Legend />
              <Line type="monotone" dataKey="realizado" name="Realizado" stroke={corPrimaria} strokeWidth={2.5} dot={false} connectNulls={false} />
              {metas?.metaFaturamento != null && (
                <Line type="linear" dataKey="meta" name="Ritmo da meta" stroke={corEixo} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Secao>

      <Secao titulo="Definir metas do mês">
        {!podeEditar && <p className={ui.nota}>Só administradores podem alterar as metas.</p>}
        <div className={ui.formLinha}>
          {([
            ['metaFaturamento', 'Meta de faturamento (R$)'],
            ['metaLucro', 'Meta de lucro (R$)'],
            ['limiteDespesas', 'Teto de gastos (R$)'],
          ] as const).map(([campo, rotulo]) => (
            <div key={campo} className={ui.campo}>
              <label htmlFor={campo}>{rotulo}</label>
              <input id={campo} type="number" min="0" step="0.01" disabled={!podeEditar} value={form[campo]}
                onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))} placeholder="Sem meta" style={{ width: 180 }} />
            </div>
          ))}
          {podeEditar && <Button loading={salvando} onClick={salvar}>Salvar metas</Button>}
        </div>
      </Secao>
    </>
  )
}

// ─── Comissões ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = { GARCON: 'Garçom', ENTREGADOR: 'Entregador', COZINHEIRO: 'Cozinheiro' }

function AbaComissoes({ comissoes }: { comissoes: ComissaoInfo[] }) {
  const total = comissoes.reduce((s, c) => s + Number(c.valorComissao), 0)
  return (
    <Secao titulo={`Comissões · total ${moeda(total)}`} semPadding>
      {comissoes.length === 0 ? <Vazio>Nenhuma comissão no período (configure os percentuais em Configurações › Pagamento).</Vazio> : (
        <div className={ui.tabelaWrap}>
          <table className={ui.tabela}>
            <thead><tr><th>Funcionário</th><th>Função</th><th className={ui.num}>Base</th><th className={ui.num}>%</th><th className={ui.num}>Comissão</th></tr></thead>
            <tbody>
              {comissoes.map(c => (
                <tr key={`${c.role}-${c.funcionarioId}`}>
                  <td className={ui.empresaNome}>{c.nome}</td>
                  <td>{ROLE_LABEL[c.role] ?? c.role}</td>
                  <td className={ui.num}>{moeda(Number(c.totalBase))}</td>
                  <td className={ui.num}>{c.percentual}%</td>
                  <td className={ui.num}><strong>{moeda(Number(c.valorComissao))}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Secao>
  )
}
