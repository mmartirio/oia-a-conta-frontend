import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiCreditCard } from 'react-icons/fi'
import { billingApi, type Contrato } from '../../api/billingApi'
import {
  Chips, PageHeader, ROTULO_STATUS_CONTRATO, SeloContrato, Secao, Vazio, data, moeda, ui, useNomesEmpresas,
} from './painelUi'

type FiltroStatus = 'TODOS' | Contrato['status']

export function GestorEmpresas() {
  const navigate = useNavigate()
  const nomeEmpresa = useNomesEmpresas()
  const [params, setParams] = useSearchParams()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const filtro = (params.get('status') as FiltroStatus) || 'TODOS'

  useEffect(() => {
    billingApi.listarTodosContratos()
      .then(r => setContratos(r.data))
      .finally(() => setLoading(false))
  }, [])

  const contagem = useMemo(() => {
    const c: Record<string, number> = {}
    contratos.forEach(x => { c[x.status] = (c[x.status] ?? 0) + 1 })
    return c
  }, [contratos])

  const termo = busca.trim().toLowerCase()
  const visiveis = contratos
    .filter(c => filtro === 'TODOS' || c.status === filtro)
    .filter(c => !termo
      || nomeEmpresa(c.restauranteId).toLowerCase().includes(termo)
      || String(c.restauranteId).includes(termo)
      || (c.plano?.nome ?? '').toLowerCase().includes(termo))
    .sort((a, b) => nomeEmpresa(a.restauranteId).localeCompare(nomeEmpresa(b.restauranteId), 'pt-BR'))

  const opcoes = [
    { id: 'TODOS' as FiltroStatus, rotulo: 'Todas', contagem: contratos.length },
    ...(['ATIVO', 'TRIAL', 'INADIMPLENTE', 'BLOQUEADO', 'CANCELADO'] as const)
      .filter(s => contagem[s])
      .map(s => ({ id: s as FiltroStatus, rotulo: ROTULO_STATUS_CONTRATO[s], contagem: contagem[s] })),
  ]

  return (
    <div>
      <PageHeader
        titulo="Empresas"
        subtitulo="Todos os restaurantes da plataforma. Clique numa empresa para ver a ficha completa."
      />

      <div className={ui.filtros}>
        <input
          className={ui.busca}
          placeholder="Buscar por nome, ID ou plano..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <Chips
          opcoes={opcoes}
          valor={filtro}
          onChange={v => setParams(v === 'TODOS' ? {} : { status: v }, { replace: true })}
        />
      </div>

      <Secao semPadding>
        {loading ? <Vazio>Carregando...</Vazio> : visiveis.length === 0 ? <Vazio>Nenhuma empresa encontrada.</Vazio> : (
          <div className={ui.tabelaWrap}>
            <table className={ui.tabela}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Plano</th>
                  <th className={ui.num}>Mensalidade</th>
                  <th>Status</th>
                  <th>Cobrança</th>
                  <th>Próx. vencimento</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map(c => (
                  <tr
                    key={c.id}
                    className={ui.linhaClicavel}
                    onClick={() => navigate(`/gestor/empresas/${c.restauranteId}`)}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') navigate(`/gestor/empresas/${c.restauranteId}`) }}
                  >
                    <td>
                      <span className={ui.empresaNome}>{nomeEmpresa(c.restauranteId)}</span>{' '}
                      <span className={ui.secundario}>#{c.restauranteId}</span>
                    </td>
                    <td>{c.plano?.nome ?? '—'}</td>
                    <td className={ui.num}>{moeda(c.plano?.precoMensal)}</td>
                    <td><SeloContrato status={c.status} /></td>
                    <td>
                      {c.mpPreapprovalId
                        ? <span title="Assinatura com cobrança automática no cartão"><FiCreditCard size={13} /> Cartão</span>
                        : <span className={ui.secundario}>Manual</span>}
                    </td>
                    <td>{data(c.dataProximoVencimento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </div>
  )
}
