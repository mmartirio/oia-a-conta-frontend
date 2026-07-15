import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { comandaApi } from '../../api/comandaApi'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { formatCurrency, formatTime, STATUS_PEDIDO_LABEL, METODO_PAGAMENTO_LABEL } from '../../utils/formatters'
import { useToast } from '../../contexts/ToastContext'
import type { Comanda, MetodoPagamento, Pedido } from '../../types'
import styles from './GarconComanda.module.css'

const METODOS: MetodoPagamento[] = ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO']

function statusPedidoVariant(status: Pedido['status']) {
  if (status === 'PRONTO') return 'success'
  if (status === 'PREPARANDO') return 'warning'
  if (status === 'ENTREGUE') return 'default'
  return 'info'
}

export function GarconComanda() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [loading, setLoading] = useState(true)
  const [fecharModal, setFecharModal] = useState(false)
  const [metodo, setMetodo] = useState<MetodoPagamento>('DINHEIRO')
  const [fechando, setFechando] = useState(false)
  const toast = useToast()

  const load = () => {
    if (!id) return
    comandaApi.buscarPorId(Number(id))
      .then(r => setComanda(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleFechar = async () => {
    if (!comanda) return
    setFechando(true)
    try {
      await comandaApi.fechar(comanda.id, metodo)
      navigate('/garcon', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao fechar comanda')
    } finally {
      setFechando(false)
    }
  }

  if (loading) return <p>Carregando...</p>
  if (!comanda) return <p>Comanda não encontrada.</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mesa {comanda.mesaNumero}</h1>
          <p className={styles.subtitle}>Garçom: {comanda.garconNome}</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" size="sm" onClick={load}>Atualizar</Button>
          <Button onClick={() => navigate(`/garcon/comanda/${id}/novo-pedido`)}>
            + Pedido
          </Button>
          {comanda.status === 'ABERTA' && (
            <Button variant="danger" onClick={() => setFecharModal(true)}>
              Fechar Conta
            </Button>
          )}
        </div>
      </div>

      <div className={styles.pedidosList}>
        {comanda.pedidos.length === 0 ? (
          <p className={styles.empty}>Nenhum pedido ainda. Adicione o primeiro!</p>
        ) : (
          comanda.pedidos.map(p => (
            <Card key={p.id} className={styles.pedidoCard}>
              <div className={styles.pedidoHeader}>
                <span className={styles.pedidoId}>Pedido #{p.id}</span>
                <Badge variant={statusPedidoVariant(p.status)} size="sm">
                  {STATUS_PEDIDO_LABEL[p.status]}
                </Badge>
                <span className={styles.pedidoTime}>{formatTime(p.criadoEm)}</span>
              </div>
              <ul className={styles.itensList}>
                {p.itens.map(item => (
                  <li key={item.id} className={styles.item}>
                    <span className={styles.itemQtd}>{item.quantidade}x</span>
                    <span className={styles.itemNome}>{item.produtoNome}</span>
                    {item.observacao && (
                      <span className={styles.itemObs}>({item.observacao})</span>
                    )}
                    <span className={styles.itemPreco}>{formatCurrency(item.precoUnitario * item.quantidade)}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.pedidoTotal}>Subtotal: {formatCurrency(p.total)}</div>
            </Card>
          ))
        )}
      </div>

      <div className={styles.totalBar}>
        <span className={styles.totalLabel}>Total da Comanda</span>
        <span className={styles.totalValue}>{formatCurrency(comanda.total)}</span>
      </div>

      <Modal
        isOpen={fecharModal}
        onClose={() => setFecharModal(false)}
        title="Fechar Conta"
        footer={
          <>
            <Button variant="outline" onClick={() => setFecharModal(false)}>Cancelar</Button>
            <Button variant="danger" loading={fechando} onClick={handleFechar}>
              Confirmar Fechamento
            </Button>
          </>
        }
      >
        <p className={styles.totalResume}>Total: <strong>{formatCurrency(comanda.total)}</strong></p>
        <div className={styles.metodos}>
          {METODOS.map(m => (
            <label key={m} className={`${styles.metodoOption} ${metodo === m ? styles.metodoSelected : ''}`}>
              <input
                type="radio"
                name="metodo"
                value={m}
                checked={metodo === m}
                onChange={() => setMetodo(m)}
              />
              {METODO_PAGAMENTO_LABEL[m]}
            </label>
          ))}
        </div>
      </Modal>
    </div>
  )
}
