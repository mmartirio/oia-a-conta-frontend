import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { caixaApi, type Venda } from '../../api/caixaApi'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../../components/ui/Button'
import styles from './PdvSalao.module.css'

const METODO_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
}

const BANDEIRA_LABEL: Record<string, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Master',
  ELO: 'Elo',
  BANESECARD: 'BaneseCard',
  ALELO: 'Alelo',
  VR: 'VR',
  HIPERCARD: 'Hipercard',
}

const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const formatMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Página própria (não um modal) — o caixa pode deixar aberta numa aba/
// monitor separado enquanto trabalha a Fila de Pagamento em outra.
export function PdvHistoricoVendas() {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [vendas, setVendas] = useState<Venda[]>([])
  const [carregando, setCarregando] = useState(false)
  const [buscou, setBuscou] = useState(false)
  const [detalhesVenda, setDetalhesVenda] = useState<Venda | null>(null)
  const toast = useToast()

  const buscar = (novaData: string) => {
    setCarregando(true)
    caixaApi.vendasHistorico(novaData)
      .then(r => setVendas(r.data))
      .catch(() => { setVendas([]); toast.error('Erro ao carregar o histórico de vendas') })
      .finally(() => { setCarregando(false); setBuscou(true) })
  }

  // Busca assim que a página abre, já com a data padrão (hoje).
  useEffect(() => { buscar(data) }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Histórico de Vendas</h1>
        <div className={styles.headerActions}>
          <Link to="/pdv"><Button variant="outline">Voltar ao Caixa</Button></Link>
        </div>
      </div>

      <input
        className={styles.historicoData}
        type="date"
        value={data}
        max={new Date().toISOString().slice(0, 10)}
        onChange={e => { setData(e.target.value); buscar(e.target.value) }}
      />

      {carregando ? (
        <p className={styles.hint}>Carregando...</p>
      ) : !buscou || vendas.length === 0 ? (
        <p className={styles.empty}>Nenhuma venda nesse dia.</p>
      ) : (
        <div className={styles.vendasRealizadasLista}>
          {vendas.map(v => (
            <div key={`${v.tipo}-${v.id}`} className={styles.vendaRow}>
              <span className={styles.vendaHora}>{formatHora(v.horario)}</span>
              <span className={styles.vendaDescricao}>{v.descricao}</span>
              <span className={styles.vendaMetodo}>{METODO_LABEL[v.metodoPagamento] ?? v.metodoPagamento}</span>
              <span className={styles.vendaTotal}>{formatMoeda(v.total)}</span>
              {v.tipo === 'COMANDA' && (
                <button className={styles.vendaDetalhesBtn} onClick={() => setDetalhesVenda(v)}>
                  Detalhes
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {detalhesVenda && (
        <div className={styles.overlay} onClick={() => setDetalhesVenda(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {detalhesVenda.mesaNumero ? `Mesa ${detalhesVenda.mesaNumero}` : 'Venda'}
            </h2>
            <div className={styles.modalTotal}>{formatMoeda(detalhesVenda.total)}</div>

            <div className={styles.detalhesVendaLista}>
              <div className={styles.detalhesVendaLinha}>
                <span>Produtos</span>
                <span>{detalhesVenda.itensDescricao}</span>
              </div>
              <div className={styles.detalhesVendaLinha}>
                <span>Forma de pagamento</span>
                <span>{METODO_LABEL[detalhesVenda.metodoPagamento] ?? detalhesVenda.metodoPagamento}</span>
              </div>
              {detalhesVenda.troco != null && (
                <div className={styles.detalhesVendaLinha}>
                  <span>Troco</span>
                  <span>{formatMoeda(detalhesVenda.troco)}</span>
                </div>
              )}
              {detalhesVenda.parcelas != null && (
                <div className={styles.detalhesVendaLinha}>
                  <span>Parcelas</span>
                  <span>{detalhesVenda.parcelas}x</span>
                </div>
              )}
              {detalhesVenda.bandeiraCartao && (
                <div className={styles.detalhesVendaLinha}>
                  <span>Bandeira</span>
                  <span>{BANDEIRA_LABEL[detalhesVenda.bandeiraCartao] ?? detalhesVenda.bandeiraCartao}</span>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setDetalhesVenda(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
