import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { gestorApi, type ContratoAtencao, type ResumoPainel } from '../../api/gestorApi'
import { Button } from '../../components/ui/Button'
import { Kpi, PageHeader, SeloContrato, Secao, Vazio, corTema, data, moeda, ui, useNomesEmpresas } from './painelUi'

function nomeMes(yyyyMm: string) {
  const [a, m] = yyyyMm.split('-').map(Number)
  return new Date(a, m - 1, 15).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
}

export function GestorDashboard() {
  const navigate = useNavigate()
  const nomeEmpresa = useNomesEmpresas()
  const [resumo, setResumo] = useState<ResumoPainel | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    gestorApi.resumo().then(r => setResumo(r.data)).catch(() => setErro('Não foi possível carregar o painel.'))
  }, [])

  if (erro) return <><PageHeader titulo="Painel" /><Vazio>{erro}</Vazio></>
  if (!resumo) return <><PageHeader titulo="Painel" /><Vazio>Carregando...</Vazio></>

  const s = resumo.porStatus
  const variacao = resumo.receitaMesAnterior > 0
    ? ((resumo.receitaMesAtual - resumo.receitaMesAnterior) / resumo.receitaMesAnterior) * 100
    : null
  const serie = resumo.serieReceita.map(p => ({ mes: nomeMes(p.mes), receita: Number(p.receita) }))

  const ItemAtencao = ({ c, detalhe }: { c: ContratoAtencao; detalhe: string }) => (
    <li className={ui.listaItem} onClick={() => navigate(`/gestor/empresas/${c.restauranteId}`)}>
      <div className={ui.listaPrincipal}>
        <span className={ui.listaTitulo}>{nomeEmpresa(c.restauranteId)}</span>
        <span className={ui.listaSub}>{c.planoNome} · {moeda(c.valor)} · {detalhe}</span>
      </div>
      <SeloContrato status={c.status} />
    </li>
  )

  return (
    <div>
      <PageHeader
        titulo="Painel"
        subtitulo="Visão geral da base de clientes, receita e do que precisa de atenção."
      />

      <div className={ui.kpiGrid}>
        <Kpi rotulo="Receita recorrente (MRR)" valor={moeda(resumo.mrr)} detalhe={`${s.ATIVO ?? 0} empresas pagando`} tom="bom" />
        <Kpi
          rotulo="Receita do mês"
          valor={moeda(resumo.receitaMesAtual)}
          detalhe={variacao == null ? `Mês anterior: ${moeda(resumo.receitaMesAnterior)}`
            : `${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(0)}% vs. mês anterior`}
          tom="neutro"
        />
        <Kpi rotulo="Empresas" valor={resumo.totalEmpresas} detalhe={`${s.TRIAL ?? 0} em período de teste`} tom="neutro" />
        <Kpi
          rotulo="Inadimplentes / bloqueadas"
          valor={(s.INADIMPLENTE ?? 0) + (s.BLOQUEADO ?? 0)}
          detalhe={`${s.INADIMPLENTE ?? 0} inadimplentes · ${s.BLOQUEADO ?? 0} bloqueadas`}
          tom={(s.INADIMPLENTE ?? 0) + (s.BLOQUEADO ?? 0) > 0 ? 'critico' : 'bom'}
        />
        <Kpi rotulo="Assinaturas no cartão" valor={resumo.assinaturasCartao} detalhe="Cobrança automática (Mercado Pago)" tom="neutro" />
        <Kpi
          rotulo="Tickets em aberto"
          valor={resumo.ticketsAbertos}
          detalhe={resumo.pagamentosFalhos30d > 0 ? `${resumo.pagamentosFalhos30d} cobrança(s) recusada(s) em 30 dias` : 'Abertos ou em andamento'}
          tom={resumo.ticketsAbertos > 0 ? 'alerta' : 'bom'}
        />
      </div>

      <Secao titulo="Receita recebida — últimos 12 meses" acoes={
        <Button size="sm" variant="ghost" onClick={() => navigate('/gestor/financeiro')}>Ver financeiro</Button>
      }>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={corTema('--color-border', '#e5ded6')} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: corTema('--color-text-secondary', '#64748b') }} axisLine={false} tickLine={false} />
              <YAxis
                width={64}
                tick={{ fontSize: 12, fill: corTema('--color-text-secondary', '#64748b') }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                formatter={(v: number | string) => [moeda(Number(v)), 'Receita']}
              />
              <Bar dataKey="receita" fill={corTema('--color-primary', '#CF4622')} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Secao>

      <div className={ui.grid2}>
        <Secao titulo={`Em atraso (${resumo.atrasados.length})`} semPadding acoes={
          resumo.atrasados.length > 0
            ? <Button size="sm" variant="ghost" onClick={() => navigate('/gestor/financeiro?aba=inadimplencia')}>Cobrar</Button>
            : undefined
        }>
          {resumo.atrasados.length === 0 ? <Vazio>Nenhuma empresa em atraso.</Vazio> : (
            <ul className={ui.lista}>
              {resumo.atrasados.slice(0, 8).map(c => (
                <ItemAtencao key={c.contratoId} c={c} detalhe={`venceu ${data(c.dataVencimento)}`} />
              ))}
            </ul>
          )}
        </Secao>
        <Secao titulo={`Vencendo em 7 dias (${resumo.vencendo7dias.length})`} semPadding>
          {resumo.vencendo7dias.length === 0 ? <Vazio>Nenhum vencimento sem cartão nos próximos 7 dias.</Vazio> : (
            <ul className={ui.lista}>
              {resumo.vencendo7dias.slice(0, 8).map(c => (
                <ItemAtencao key={c.contratoId} c={c} detalhe={`vence ${data(c.dataVencimento)}`} />
              ))}
            </ul>
          )}
        </Secao>
      </div>
    </div>
  )
}
