import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiCreditCard } from 'react-icons/fi'
import { billingApi, type Contrato, type Pagamento, type Ticket } from '../../api/billingApi'
import { gestorApi, type RestauranteCadastro, type UsuarioAdmin } from '../../api/gestorApi'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { publicMenuUrl } from '../../utils/publicMenuUrl'
import {
  Abas, Kpi, PageHeader, ROTULO_STATUS_CONTRATO, SeloContrato, SeloPagamento, SeloTicket, Secao, Vazio,
  data, moeda, ui,
} from './painelUi'

type Aba = 'resumo' | 'pagamentos' | 'usuarios' | 'suporte'
const STATUS_CONTRATO = ['ATIVO', 'TRIAL', 'INADIMPLENTE', 'BLOQUEADO', 'CANCELADO'] as const

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <div className={ui.fichaRotulo}>{rotulo}</div>
      <div className={ui.fichaValor}>{valor || '—'}</div>
    </div>
  )
}

export function GestorEmpresaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const restauranteId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'resumo'

  const [cadastro, setCadastro] = useState<RestauranteCadastro | null>(null)
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [semContrato, setSemContrato] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [pagPage, setPagPage] = useState(0)
  const [pagTotalPages, setPagTotalPages] = useState(0)

  // ações
  const [novoStatus, setNovoStatus] = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [modalidade, setModalidade] = useState<'MESAS' | 'DELIVERY' | ''>('')
  const [salvandoModalidade, setSalvandoModalidade] = useState(false)
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [resetAlvo, setResetAlvo] = useState<UsuarioAdmin | null>(null)
  const [resetando, setResetando] = useState(false)
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null)

  useEffect(() => {
    if (!restauranteId) return
    gestorApi.buscarRestaurante(restauranteId).then(r => setCadastro(r.data)).catch(() => setCadastro(null))
    gestorApi.listarUsuariosPorRestaurante(restauranteId).then(r => setUsuarios(r.data)).catch(() => setUsuarios([]))
    gestorApi.ticketsDaEmpresa(restauranteId).then(r => setTickets(r.data)).catch(() => setTickets([]))
    billingApi.buscarContratoPorRestaurante(restauranteId)
      .then(r => { setContrato(r.data); setNovoStatus(r.data.status); setModalidade(r.data.modalidadeOperacao ?? '') })
      .catch(() => setSemContrato(true))
  }, [restauranteId])

  const carregarPagamentos = (contratoId: number, pagina: number) =>
    billingApi.listarPagamentos(contratoId, pagina).then(r => {
      setPagamentos(r.data.content)
      setPagTotalPages(r.data.totalPages)
    })

  useEffect(() => { if (contrato) carregarPagamentos(contrato.id, pagPage) }, [contrato?.id, pagPage])

  const trocarAba = (a: Aba) => setParams(a === 'resumo' ? {} : { aba: a }, { replace: true })

  const salvarStatus = async () => {
    if (!contrato || novoStatus === contrato.status) return
    setSalvandoStatus(true)
    try {
      const r = await billingApi.atualizarStatusContrato(contrato.id, novoStatus)
      setContrato(r.data)
      toast.success('Status do contrato atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setSalvandoStatus(false)
    }
  }

  const salvarModalidade = async () => {
    if (!contrato || !modalidade) return
    setSalvandoModalidade(true)
    try {
      const r = await billingApi.atualizarModalidadeContrato(contrato.id, modalidade)
      setContrato(r.data)
      toast.success('Modalidade de operação atualizada')
    } catch {
      toast.error('Erro ao atualizar modalidade')
    } finally {
      setSalvandoModalidade(false)
    }
  }

  const registrarPagamento = async () => {
    if (!contrato) return
    const v = Number(valor.replace(',', '.'))
    if (!v || v <= 0) return
    setRegistrando(true)
    try {
      await billingApi.pagamentoManual(contrato.id, v, observacao || undefined)
      toast.success('Pagamento registrado')
      setValor(''); setObservacao('')
      const r = await billingApi.buscarContratoPorRestaurante(restauranteId)
      setContrato(r.data); setNovoStatus(r.data.status)
      setPagPage(0)
      await carregarPagamentos(r.data.id, 0)
    } catch {
      toast.error('Erro ao registrar pagamento')
    } finally {
      setRegistrando(false)
    }
  }

  const resetarSenha = async () => {
    if (!resetAlvo) return
    setResetando(true)
    try {
      const r = await gestorApi.resetSenha(resetAlvo.id)
      setSenhaGerada({ nome: resetAlvo.nome, senha: r.data.novaSenha })
    } catch {
      toast.error('Erro ao resetar a senha')
    } finally {
      setResetando(false)
      setResetAlvo(null)
    }
  }

  const nome = cadastro?.nome ?? `Empresa #${restauranteId}`
  const ticketsAbertos = tickets.filter(t => t.status === 'ABERTO' || t.status === 'EM_ANDAMENTO').length
  const endereco = cadastro && [
    [cadastro.enderecoRua, cadastro.enderecoNumero].filter(Boolean).join(', '),
    cadastro.enderecoBairro, cadastro.enderecoCidade, cadastro.enderecoComplemento,
  ].filter(Boolean).join(' — ')

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/gestor/empresas')} style={{ marginBottom: '0.75rem' }}>
        <FiArrowLeft size={15} /> Empresas
      </Button>

      <PageHeader
        titulo={<>{nome} <span className={ui.secundario}>#{restauranteId}</span></>}
        subtitulo={contrato
          ? <><SeloContrato status={contrato.status} /> &nbsp;{contrato.plano?.nome} · cliente desde {data(contrato.dataInicio)}</>
          : semContrato ? 'Sem contrato' : undefined}
      />

      <Abas
        ativa={aba}
        onChange={trocarAba}
        abas={[
          { id: 'resumo', rotulo: 'Resumo' },
          { id: 'pagamentos', rotulo: 'Pagamentos' },
          { id: 'usuarios', rotulo: `Usuários (${usuarios.length})` },
          { id: 'suporte', rotulo: 'Suporte', badge: ticketsAbertos },
        ]}
      />

      {aba === 'resumo' && (
        <>
          {contrato && (
            <div className={ui.kpiGrid}>
              <Kpi rotulo="Plano" valor={contrato.plano?.nome ?? '—'} detalhe={`${moeda(contrato.plano?.precoMensal)}/mês`} />
              <Kpi
                rotulo="Próximo vencimento"
                valor={data(contrato.dataProximoVencimento)}
                tom={contrato.status === 'INADIMPLENTE' || contrato.status === 'BLOQUEADO' ? 'critico' : 'neutro'}
              />
              <Kpi
                rotulo="Cobrança"
                valor={contrato.mpPreapprovalId ? <><FiCreditCard size={20} /> Cartão</> : 'Manual'}
                detalhe={contrato.mpPreapprovalId ? 'Automática pelo Mercado Pago' : 'Registrada pelo gestor'}
                tom={contrato.mpPreapprovalId ? 'bom' : 'neutro'}
              />
              {contrato.saldoEncargosModalidade > 0 && (
                <Kpi rotulo="Encargos pendentes" valor={moeda(contrato.saldoEncargosModalidade)} detalhe="Somados no próximo pagamento manual" tom="alerta" />
              )}
            </div>
          )}

          <Secao titulo="Dados cadastrais">
            {!cadastro ? <Vazio>Carregando...</Vazio> : (
              <div className={ui.ficha}>
                <Campo rotulo="Nome" valor={cadastro.nome} />
                <Campo rotulo="CNPJ" valor={cadastro.cnpj} />
                <Campo rotulo="Telefone" valor={cadastro.telefone} />
                <Campo rotulo="E-mail do responsável" valor={cadastro.emailResponsavel} />
                <Campo rotulo="Endereço" valor={endereco} />
                <Campo rotulo="Cardápio online" valor={cadastro.slug ? <a href={publicMenuUrl(cadastro.slug)} target="_blank" rel="noreferrer">{publicMenuUrl(cadastro.slug).replace('https://', '')}</a> : null} />
                <Campo rotulo="Acesso" valor={cadastro.ativo ? 'Liberado' : `Bloqueado${cadastro.dataBloqueio ? ' desde ' + data(cadastro.dataBloqueio) : ''}`} />
                <Campo rotulo="WhatsApp" valor={cadastro.whatsappConfigurado ? 'Instância criada' : 'Não configurado'} />
                <Campo rotulo="Cadastrada em" valor={data(cadastro.createdAt)} />
              </div>
            )}
          </Secao>

          {contrato && (
            <Secao titulo="Contrato">
              <div className={ui.formLinha}>
                <div className={ui.campo}>
                  <label htmlFor="status-contrato">Status</label>
                  <select id="status-contrato" value={novoStatus} onChange={e => setNovoStatus(e.target.value)}>
                    {STATUS_CONTRATO.map(s => <option key={s} value={s}>{ROTULO_STATUS_CONTRATO[s]}</option>)}
                  </select>
                </div>
                <Button loading={salvandoStatus} disabled={novoStatus === contrato.status} onClick={salvarStatus}>
                  Salvar status
                </Button>
              </div>

              {contrato.plano?.exigeModalidadeOperacao && (
                <div style={{ marginTop: '1.25rem' }}>
                  <p className={ui.nota}>
                    O plano {contrato.plano.nome} opera só com mesas <em>ou</em> só com delivery. Trocas grátis usadas:{' '}
                    <strong>{contrato.trocasModalidadeGratisUsadas}/2</strong>
                    {contrato.trocasModalidadeGratisUsadas >= 2 && <span className={ui.alerta}> — próximas trocas cobram R$ 30,00 cada.</span>}
                  </p>
                  <div className={ui.formLinha}>
                    <div className={ui.campo}>
                      <label htmlFor="modalidade">Modalidade</label>
                      <select id="modalidade" value={modalidade} onChange={e => setModalidade(e.target.value as 'MESAS' | 'DELIVERY')}>
                        <option value="" disabled>Selecione...</option>
                        <option value="MESAS">Presencial (mesas e comandas)</option>
                        <option value="DELIVERY">Delivery</option>
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      loading={salvandoModalidade}
                      disabled={!modalidade || modalidade === contrato.modalidadeOperacao}
                      onClick={salvarModalidade}
                    >
                      Salvar modalidade
                    </Button>
                  </div>
                </div>
              )}
            </Secao>
          )}
        </>
      )}

      {aba === 'pagamentos' && (
        !contrato ? <Secao><Vazio>{semContrato ? 'Esta empresa não tem contrato.' : 'Carregando...'}</Vazio></Secao> : (
          <>
            <Secao titulo="Registrar pagamento manual">
              <p className={ui.nota}>
                Para pagamentos fora do cartão (PIX, transferência). Ativa o contrato por mais 30 dias
                {contrato.saldoEncargosModalidade > 0 && <> e quita os encargos pendentes de {moeda(contrato.saldoEncargosModalidade)}</>}.
              </p>
              <div className={ui.formLinha}>
                <div className={ui.campo}>
                  <label htmlFor="valor">Valor (R$)</label>
                  <input id="valor" type="number" min="0" step="0.01" value={valor}
                    onChange={e => setValor(e.target.value)} placeholder={String(contrato.plano?.precoMensal ?? '')} style={{ width: 140 }} />
                </div>
                <div className={ui.campo} style={{ flex: 1, minWidth: 220 }}>
                  <label htmlFor="obs">Observação</label>
                  <input id="obs" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: PIX recebido em 16/10" />
                </div>
                <Button loading={registrando} disabled={!valor} onClick={registrarPagamento}>Registrar</Button>
              </div>
            </Secao>

            <Secao titulo="Histórico" semPadding>
              {pagamentos.length === 0 ? <Vazio>Nenhum pagamento registrado.</Vazio> : (
                <div className={ui.tabelaWrap}>
                  <table className={ui.tabela}>
                    <thead>
                      <tr><th>Data</th><th className={ui.num}>Valor</th><th>Método</th><th>Status</th><th>Observação</th></tr>
                    </thead>
                    <tbody>
                      {pagamentos.map(p => (
                        <tr key={p.id}>
                          <td>{data(p.dataPagamento || p.createdAt)}</td>
                          <td className={ui.num}><strong>{moeda(p.valor)}</strong></td>
                          <td>{p.metodo === 'CARTAO_RECORRENTE' ? 'Cartão (assinatura)' : p.metodo || '—'}</td>
                          <td><SeloPagamento status={p.status} /></td>
                          <td className={ui.secundario}>{p.observacao || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination page={pagPage} totalPages={pagTotalPages} onPageChange={setPagPage} />
                </div>
              )}
            </Secao>
          </>
        )
      )}

      {aba === 'usuarios' && (
        <Secao semPadding>
          {usuarios.length === 0 ? <Vazio>Nenhum usuário.</Vazio> : (
            <div className={ui.tabelaWrap}>
              <table className={ui.tabela}>
                <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th /></tr></thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id}>
                      <td className={ui.empresaNome}>{u.nome}</td>
                      <td>{u.email}</td>
                      <td>{u.role === 'ADMIN' ? 'Administrador' : u.role}</td>
                      <td>{u.ativo ? 'Ativo' : <span className={ui.secundario}>Inativo</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Button size="sm" variant="ghost" onClick={() => setResetAlvo(u)}>Resetar senha</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      )}

      {aba === 'suporte' && (
        <Secao semPadding>
          {tickets.length === 0 ? <Vazio>Nenhum ticket desta empresa.</Vazio> : (
            <ul className={ui.lista}>
              {tickets.map(t => (
                <li key={t.id} className={ui.listaItem} onClick={() => navigate(`/gestor/suporte/${t.id}`)}>
                  <div className={ui.listaPrincipal}>
                    <span className={ui.listaTitulo}>{t.titulo}</span>
                    <span className={ui.listaSub}>#{t.id} · aberto em {data(t.createdAt)} · prioridade {t.prioridade.toLowerCase()}</span>
                  </div>
                  <SeloTicket status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Secao>
      )}

      <ConfirmDialog
        isOpen={resetAlvo !== null}
        title="Resetar senha"
        message={`Gerar uma senha temporária para ${resetAlvo?.nome ?? ''}? A senha atual deixa de funcionar.`}
        confirmLabel="Gerar nova senha"
        danger
        loading={resetando}
        onConfirm={resetarSenha}
        onCancel={() => setResetAlvo(null)}
      />

      {senhaGerada && (
        <ConfirmDialog
          isOpen
          title="Senha temporária gerada"
          message={`Envie para ${senhaGerada.nome}: ${senhaGerada.senha}`}
          confirmLabel="Copiar e fechar"
          onConfirm={() => { navigator.clipboard?.writeText(senhaGerada.senha).catch(() => {}); setSenhaGerada(null) }}
          onCancel={() => setSenhaGerada(null)}
        />
      )}
    </div>
  )
}
