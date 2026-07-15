import { useEffect, useState } from 'react'
import { billingApi, type Contrato, type Pagamento } from '../../api/billingApi'
import styles from './AdminAssinatura.module.css'

const STATUS_LABEL: Record<string, string> = {
  TRIAL: 'Trial', ATIVO: 'Ativo', INADIMPLENTE: 'Inadimplente',
  BLOQUEADO: 'Bloqueado', CANCELADO: 'Cancelado',
}
const STATUS_CLS: Record<string, string> = {
  TRIAL: styles.badgeTrial, ATIVO: styles.badgeAtivo,
  INADIMPLENTE: styles.badgeInadimplente, BLOQUEADO: styles.badgeBloqueado,
  CANCELADO: styles.badgeCancelado,
}
const PAG_LABEL: Record<string, string> = {
  PAGO: 'Pago', PENDENTE: 'Pendente', ESTORNADO: 'Estornado', FALHOU: 'Falhou',
}
const PAG_CLS: Record<string, string> = {
  PAGO: styles.pagPago, PENDENTE: styles.pagPendente,
  ESTORNADO: styles.pagEstornado, FALHOU: styles.pagFalhou,
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

export function AdminAssinatura() {
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    billingApi.meuContrato()
      .then(async r => {
        setContrato(r.data)
        const p = await billingApi.listarTodosPagamentos(r.data.id)
        setPagamentos(p.data)
      })
      .catch(() => setErro('Nenhuma assinatura encontrada para este restaurante.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className={styles.empty}>Carregando...</p>

  if (erro || !contrato) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Minha Assinatura</h1>
        <div className={styles.semPlano}>
          <span className={styles.semPlanoIcon}>📋</span>
          <p>{erro || 'Nenhuma assinatura encontrada.'}</p>
          <p className={styles.semPlanoSub}>Entre em contato com o suporte para ativar seu plano.</p>
        </div>
      </div>
    )
  }

  const funcionalidades: string[] = (() => {
    try { return JSON.parse(contrato.plano.funcionalidades) } catch { return [] }
  })()

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Minha Assinatura</h1>

      {/* Card do plano */}
      <div className={styles.planoCard}>
        <div className={styles.planoHeader}>
          <div>
            <p className={styles.planoNomeLabel}>Plano atual</p>
            <h2 className={styles.planoNome}>{contrato.plano.nome}</h2>
            <p className={styles.planoDesc}>{contrato.plano.descricao}</p>
          </div>
          <div className={styles.planoPrecoWrap}>
            <span className={styles.planoPreco}>{fmt(contrato.plano.precoMensal)}</span>
            <span className={styles.planoPeriodicidade}>/mês</span>
            <span className={`${styles.badge} ${STATUS_CLS[contrato.status] ?? ''}`}>
              {STATUS_LABEL[contrato.status] ?? contrato.status}
            </span>
          </div>
        </div>

        <div className={styles.limites}>
          <div className={styles.limiteItem}>
            <span className={styles.limiteValor}>{contrato.plano.limiteUsuarios}</span>
            <span className={styles.limiteLabel}>Usuários</span>
          </div>
          <div className={styles.limiteDivider} />
          <div className={styles.limiteItem}>
            <span className={styles.limiteValor}>{contrato.plano.limiteMesas}</span>
            <span className={styles.limiteLabel}>Mesas</span>
          </div>
        </div>

        {funcionalidades.length > 0 && (
          <div className={styles.funcList}>
            {funcionalidades.map((f, i) => (
              <span key={i} className={styles.funcItem}>✓ {f}</span>
            ))}
          </div>
        )}
      </div>

      {/* Datas */}
      <div className={styles.datasGrid}>
        <div className={styles.dataCard}>
          <p className={styles.dataLabel}>Início</p>
          <p className={styles.dataValor}>{fmtData(contrato.dataInicio)}</p>
        </div>
        <div className={styles.dataCard}>
          <p className={styles.dataLabel}>Vencimento atual</p>
          <p className={styles.dataValor}>{fmtData(contrato.dataVencimento)}</p>
        </div>
        <div className={styles.dataCard}>
          <p className={styles.dataLabel}>Próximo vencimento</p>
          <p className={styles.dataValor}>{fmtData(contrato.dataProximoVencimento)}</p>
        </div>
      </div>

      {/* Histórico de pagamentos */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Histórico de Pagamentos</h2>
        {pagamentos.length === 0 ? (
          <p className={styles.empty}>Nenhum pagamento registrado.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Método</th>
                  <th>Observação</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map(p => (
                  <tr key={p.id}>
                    <td>{fmtData(p.dataPagamento || p.createdAt)}</td>
                    <td>{p.metodo || '—'}</td>
                    <td className={styles.obs}>{p.observacao || '—'}</td>
                    <td>
                      <span className={`${styles.pagBadge} ${PAG_CLS[p.status] ?? ''}`}>
                        {PAG_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(contrato.status === 'INADIMPLENTE' || contrato.status === 'BLOQUEADO') && (
        <div className={styles.alertaInadimplente}>
          ⚠️ Há um pagamento pendente. Entre em contato com o suporte para regularizar sua situação.
        </div>
      )}
    </div>
  )
}
