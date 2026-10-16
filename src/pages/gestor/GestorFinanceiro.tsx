import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { billingApi } from '../../api/billingApi'
import { gestorApi, type ContratoAtencao, type PagamentoPainel, type ResumoPainel } from '../../api/gestorApi'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import {
  Abas, Chips, Kpi, PageHeader, SeloContrato, SeloPagamento, Secao, Vazio, corTema, data, moeda, ui, useNomesEmpresas,
} from './painelUi'

// Antes eram 4 telas sobre o mesmo assunto (Cobranças, Pagamentos,
// Financeiro e Relatórios) — tudo aqui, em abas.
type Aba = 'visao' | 'pagamentos' | 'inadimplencia'
type FiltroPag = 'TODOS' | PagamentoPainel['status']
const POR_PAGINA = 25

function nomeMes(yyyyMm: string) {
  const [a, m] = yyyyMm.split('-').map(Number)
  return new Date(a, m - 1, 15).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
}

function rotuloMetodo(m: string | null) {
  if (!m) return 'Manual'
  if (m === 'CARTAO_RECORRENTE') return 'Cartão (assinatura)'
  if (m === 'MERCADOPAGO') return 'Mercado Pago'
  return m.charAt(0) + m.slice(1).toLowerCase()
}

export function GestorFinanceiro() {
  const navigate = useNavigate()
  const toast = useToast()
  const nomeEmpresa = useNomesEmpresas()
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'visao'

  const [resumo, setResumo] = useState<ResumoPainel | null>(null)
  const [pagamentos, setPagamentos] = useState<PagamentoPainel[] | null>(null)
  const [erro, setErro] = useState('')

  // filtros da aba Pagamentos
  const hoje = new Date()
  const [inicio, setInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [fim, setFim] = useState(hoje.toISOString().slice(0, 10))
  const [filtroStatus, setFiltroStatus] = useState<FiltroPag>('TODOS')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(0)

  const [confirmBloqueio, setConfirmBloqueio] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)

  const carregar = () => {
    gestorApi.resumo().then(r => setResumo(r.data)).catch(() => setErro('Não foi possível carregar o financeiro.'))
    gestorApi.todosPagamentos().then(r => setPagamentos(r.data)).catch(() => setPagamentos([]))
  }
  useEffect(carregar, [])

  const trocarAba = (a: Aba) => setParams(a === 'visao' ? {} : { aba: a }, { replace: true })

  const termo = busca.trim().toLowerCase()
  const noPeriodo = useMemo(() => (pagamentos ?? []).filter(p => {
    const d = (p.dataPagamento || p.createdAt).slice(0, 10)
    return d >= inicio && d <= fim
  }), [pagamentos, inicio, fim])
  const filtrados = noPeriodo
    .filter(p => filtroStatus === 'TODOS' || p.status === filtroStatus)
    .filter(p => !termo || nomeEmpresa(p.restauranteId).toLowerCase().includes(termo)
      || String(p.restauranteId).includes(termo) || p.planoNome.toLowerCase().includes(termo))
  const totalPago = noPeriodo.filter(p => p.status === 'PAGO').reduce((s, p) => s + Number(p.valor), 0)
  const qtdPago = noPeriodo.filter(p => p.status === 'PAGO').length
  const qtdFalhou = noPeriodo.filter(p => p.status === 'FALHOU').length
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas - 1)

  const contagemStatus = (s: PagamentoPainel['status']) => noPeriodo.filter(p => p.status === s).length

  const bloquear = async () => {
    setBloqueando(true)
    try {
      await billingApi.bloquearInadimplentes()
      toast.success('Bloqueio processado')
      carregar()
    } catch {
      toast.error('Erro ao processar o bloqueio')
    } finally {
      setBloqueando(false)
      setConfirmBloqueio(false)
    }
  }

  const TabelaContratos = ({ itens, vazio, rotuloData }: { itens: ContratoAtencao[]; vazio: string; rotuloData: string }) =>
    itens.length === 0 ? <Vazio>{vazio}</Vazio> : (
      <div className={ui.tabelaWrap}>
        <table className={ui.tabela}>
          <thead><tr><th>Empresa</th><th>Plano</th><th className={ui.num}>Mensalidade</th><th>Status</th><th>{rotuloData}</th><th /></tr></thead>
          <tbody>
            {itens.map(c => (
              <tr key={c.contratoId}>
                <td><span className={ui.empresaNome}>{nomeEmpresa(c.restauranteId)}</span> <span className={ui.secundario}>#{c.restauranteId}</span></td>
                <td>{c.planoNome}</td>
                <td className={ui.num}>{moeda(c.valor)}</td>
                <td><SeloContrato status={c.status} /></td>
                <td>{data(c.dataVencimento)}</td>
                <td style={{ textAlign: 'right' }}>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/gestor/empresas/${c.restauranteId}?aba=pagamentos`)}>
                    Registrar pagamento
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  if (erro) return <><PageHeader titulo="Financeiro" /><Vazio>{erro}</Vazio></>

  return (
    <div>
      <PageHeader titulo="Financeiro" subtitulo="Receita, pagamentos de todas as empresas e inadimplência." />

      <Abas
        ativa={aba}
        onChange={trocarAba}
        abas={[
          { id: 'visao', rotulo: 'Visão geral' },
          { id: 'pagamentos', rotulo: 'Pagamentos' },
          { id: 'inadimplencia', rotulo: 'Inadimplência', badge: resumo?.atrasados.length },
        ]}
      />

      {aba === 'visao' && (!resumo ? <Vazio>Carregando...</Vazio> : (
        <>
          <div className={ui.kpiGrid}>
            <Kpi rotulo="Receita recorrente (MRR)" valor={moeda(resumo.mrr)} detalhe="Soma das mensalidades ativas" tom="bom" />
            <Kpi rotulo="Recebido no mês" valor={moeda(resumo.receitaMesAtual)} detalhe={`Mês anterior: ${moeda(resumo.receitaMesAnterior)}`} />
            <Kpi rotulo="Assinaturas no cartão" valor={resumo.assinaturasCartao} detalhe={`de ${resumo.totalEmpresas} empresas`} />
            <Kpi
              rotulo="Cobranças recusadas (30 dias)"
              valor={resumo.pagamentosFalhos30d}
              detalhe="Cartão recusado no Mercado Pago"
              tom={resumo.pagamentosFalhos30d > 0 ? 'alerta' : 'bom'}
            />
            <Kpi
              rotulo="Em atraso"
              valor={resumo.atrasados.length}
              detalhe={moeda(resumo.atrasados.reduce((s, c) => s + Number(c.valor), 0)) + ' em mensalidades'}
              tom={resumo.atrasados.length > 0 ? 'critico' : 'bom'}
            />
          </div>
          <Secao titulo="Receita recebida — últimos 12 meses">
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart
                  data={resumo.serieReceita.map(p => ({ mes: nomeMes(p.mes), receita: Number(p.receita) }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid vertical={false} stroke={corTema('--color-border', '#e5ded6')} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: corTema('--color-text-secondary', '#64748b') }} axisLine={false} tickLine={false} />
                  <YAxis width={64} tick={{ fontSize: 12, fill: corTema('--color-text-secondary', '#64748b') }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v: number | string) => [moeda(Number(v)), 'Receita']} />
                  <Bar dataKey="receita" fill={corTema('--color-primary', '#CF4622')} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Secao>
        </>
      ))}

      {aba === 'pagamentos' && (
        <>
          <div className={ui.filtros}>
            <div className={ui.campo}>
              <label htmlFor="ini">De</label>
              <input id="ini" type="date" value={inicio} onChange={e => { setInicio(e.target.value); setPagina(0) }} />
            </div>
            <div className={ui.campo}>
              <label htmlFor="fim">Até</label>
              <input id="fim" type="date" value={fim} onChange={e => { setFim(e.target.value); setPagina(0) }} />
            </div>
            <input className={ui.busca} placeholder="Buscar empresa ou plano..." value={busca}
              onChange={e => { setBusca(e.target.value); setPagina(0) }} style={{ alignSelf: 'flex-end' }} />
          </div>

          <div className={ui.kpiGrid}>
            <Kpi rotulo="Recebido no período" valor={moeda(totalPago)} detalhe={`${qtdPago} pagamento(s)`} tom="bom" />
            <Kpi rotulo="Ticket médio" valor={moeda(qtdPago ? totalPago / qtdPago : 0)} />
            <Kpi rotulo="Recusados no período" valor={qtdFalhou} tom={qtdFalhou > 0 ? 'alerta' : 'neutro'} />
          </div>

          <div className={ui.filtros}>
            <Chips
              valor={filtroStatus}
              onChange={v => { setFiltroStatus(v); setPagina(0) }}
              opcoes={[
                { id: 'TODOS' as FiltroPag, rotulo: 'Todos', contagem: noPeriodo.length },
                { id: 'PAGO' as FiltroPag, rotulo: 'Pagos', contagem: contagemStatus('PAGO') },
                { id: 'PENDENTE' as FiltroPag, rotulo: 'Pendentes', contagem: contagemStatus('PENDENTE') },
                { id: 'FALHOU' as FiltroPag, rotulo: 'Recusados', contagem: contagemStatus('FALHOU') },
                { id: 'ESTORNADO' as FiltroPag, rotulo: 'Estornados', contagem: contagemStatus('ESTORNADO') },
              ]}
            />
          </div>

          <Secao semPadding>
            {pagamentos === null ? <Vazio>Carregando...</Vazio> : filtrados.length === 0 ? <Vazio>Nenhum pagamento no período.</Vazio> : (
              <div className={ui.tabelaWrap}>
                <table className={ui.tabela}>
                  <thead><tr><th>Data</th><th>Empresa</th><th>Plano</th><th className={ui.num}>Valor</th><th>Método</th><th>Status</th><th>Observação</th></tr></thead>
                  <tbody>
                    {filtrados.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA).map(p => (
                      <tr key={p.id} className={ui.linhaClicavel} onClick={() => navigate(`/gestor/empresas/${p.restauranteId}?aba=pagamentos`)}>
                        <td>{data(p.dataPagamento || p.createdAt)}</td>
                        <td><span className={ui.empresaNome}>{nomeEmpresa(p.restauranteId)}</span></td>
                        <td>{p.planoNome}</td>
                        <td className={ui.num}><strong>{moeda(p.valor)}</strong></td>
                        <td>{rotuloMetodo(p.metodo)}</td>
                        <td><SeloPagamento status={p.status} /></td>
                        <td className={ui.secundario}>{p.observacao || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={paginaAtual} totalPages={totalPaginas} onPageChange={setPagina} />
              </div>
            )}
          </Secao>
        </>
      )}

      {aba === 'inadimplencia' && (!resumo ? <Vazio>Carregando...</Vazio> : (
        <>
          <Secao
            titulo={`Em atraso (${resumo.atrasados.length})`}
            semPadding
            acoes={<Button size="sm" variant="ghost" onClick={() => setConfirmBloqueio(true)}>Bloquear inadimplentes agora</Button>}
          >
            <TabelaContratos itens={resumo.atrasados} vazio="Nenhuma empresa em atraso." rotuloData="Venceu em" />
          </Secao>
          <Secao titulo={`Vencendo em 7 dias, sem cartão (${resumo.vencendo7dias.length})`} semPadding>
            <TabelaContratos itens={resumo.vencendo7dias} vazio="Nenhum vencimento manual nos próximos 7 dias." rotuloData="Vence em" />
          </Secao>
          <p className={ui.nota}>
            Contratos com 5 dias de atraso são bloqueados automaticamente todo dia. Empresas com cartão cadastrado
            são cobradas pelo Mercado Pago e saem da lista assim que o pagamento é aprovado.
          </p>
        </>
      ))}

      <ConfirmDialog
        isOpen={confirmBloqueio}
        title="Bloquear inadimplentes"
        message="Bloquear agora todos os contratos com mais de 5 dias de atraso? O acesso dessas empresas ao painel é suspenso até o pagamento."
        confirmLabel="Bloquear"
        danger
        loading={bloqueando}
        onConfirm={bloquear}
        onCancel={() => setConfirmBloqueio(false)}
      />
    </div>
  )
}
