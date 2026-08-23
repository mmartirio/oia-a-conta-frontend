import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiUser, FiTag, FiX } from 'react-icons/fi'
import { comandaApi } from '../../api/comandaApi'
import { clienteApi } from '../../api/clienteApi'
import { cupomApi } from '../../api/cupomApi'
import { promocaoApi, type PromocaoAplicavel } from '../../api/promocaoApi'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { formatCurrency, formatTime, STATUS_PEDIDO_LABEL, METODO_PAGAMENTO_LABEL } from '../../utils/formatters'
import { useToast } from '../../contexts/ToastContext'
import type { Comanda, Cliente, MetodoPagamento, Pedido } from '../../types'
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
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [fecharModal, setFecharModal] = useState(false)
  const [metodo, setMetodo] = useState<MetodoPagamento>('DINHEIRO')
  const [fechando, setFechando] = useState(false)
  const toast = useToast()

  // ── Cliente ─────────────────────────────────────────────
  const [clienteModal, setClienteModal] = useState(false)
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null | undefined>(undefined)
  const [clienteBuscando, setClienteBuscando] = useState(false)
  const [clienteNovoNome, setClienteNovoNome] = useState('')
  const [clienteSalvando, setClienteSalvando] = useState(false)
  const [clienteError, setClienteError] = useState('')

  // ── Desconto ────────────────────────────────────────────
  const [descontoModal, setDescontoModal] = useState(false)
  const [cupomCodigoInput, setCupomCodigoInput] = useState('')
  const [aplicandoDesconto, setAplicandoDesconto] = useState(false)
  const [descontoError, setDescontoError] = useState('')
  const [promocoesAplicaveis, setPromocoesAplicaveis] = useState<PromocaoAplicavel[]>([])

  const load = () => {
    if (!id) return
    comandaApi.buscarPorId(Number(id))
      .then(r => setComanda(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  useEffect(() => {
    if (comanda?.clienteId) {
      clienteApi.buscarPorId(comanda.clienteId).then(r => setCliente(r.data)).catch(() => setCliente(null))
    } else {
      setCliente(null)
    }
  }, [comanda?.clienteId])

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

  // ── Cliente: handlers ───────────────────────────────────
  const openClienteModal = () => {
    setClienteBusca('')
    setClienteEncontrado(undefined)
    setClienteNovoNome('')
    setClienteError('')
    setClienteModal(true)
  }

  const handleBuscarCliente = async () => {
    if (!clienteBusca.trim()) return
    setClienteBuscando(true)
    setClienteError('')
    try {
      const r = await clienteApi.buscarPorTelefone(clienteBusca.trim())
      setClienteEncontrado(r.data)
    } catch {
      setClienteEncontrado(null)
    } finally {
      setClienteBuscando(false)
    }
  }

  const handleSelecionarCliente = async (c: Cliente) => {
    if (!comanda) return
    try {
      await comandaApi.definirCliente(comanda.id, c.id)
      setClienteModal(false)
      load()
    } catch {
      toast.error('Erro ao vincular cliente à comanda')
    }
  }

  const handleCadastrarCliente = async () => {
    if (!clienteNovoNome.trim()) {
      setClienteError('Informe o nome do cliente')
      return
    }
    setClienteSalvando(true)
    setClienteError('')
    try {
      const r = await clienteApi.criar({ nome: clienteNovoNome.trim(), telefone: clienteBusca.trim() })
      await handleSelecionarCliente(r.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setClienteError(msg ?? 'Erro ao cadastrar cliente')
    } finally {
      setClienteSalvando(false)
    }
  }

  // ── Desconto: handlers ──────────────────────────────────
  const openDescontoModal = () => {
    setCupomCodigoInput('')
    setDescontoError('')
    setDescontoModal(true)
    promocaoApi.aplicaveis(comanda?.clienteId).then(r => setPromocoesAplicaveis(r.data)).catch(() => setPromocoesAplicaveis([]))
  }

  const handleAplicarCupom = async () => {
    if (!comanda || !cupomCodigoInput.trim()) {
      setDescontoError('Informe o código do cupom')
      return
    }
    setAplicandoDesconto(true)
    setDescontoError('')
    try {
      // Cupom validado no catalog-service antes de aplicar, pra mostrar o
      // motivo exato de rejeição (expirado, fora do grupo, etc).
      const validacao = await cupomApi.validar(cupomCodigoInput.trim(), comanda.clienteId)
      if (!validacao.data.valido) {
        setDescontoError(validacao.data.motivoInvalido ?? 'Cupom inválido')
        return
      }
      await comandaApi.aplicarCupom(comanda.id, cupomCodigoInput.trim())
      setDescontoModal(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setDescontoError(msg ?? 'Erro ao aplicar cupom')
    } finally {
      setAplicandoDesconto(false)
    }
  }

  const handleAplicarPromocao = async (promocaoId: number) => {
    if (!comanda) return
    setAplicandoDesconto(true)
    setDescontoError('')
    try {
      await comandaApi.aplicarPromocao(comanda.id, promocaoId)
      setDescontoModal(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setDescontoError(msg ?? 'Erro ao aplicar promoção')
    } finally {
      setAplicandoDesconto(false)
    }
  }

  const handleRemoverDesconto = async () => {
    if (!comanda) return
    try {
      await comandaApi.removerDesconto(comanda.id)
      load()
    } catch {
      toast.error('Erro ao remover desconto')
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
          {cliente ? (
            <div className={styles.clienteChip}>
              <span>{cliente.nome}</span>
            </div>
          ) : comanda.status !== 'FECHADA' && (
            <Button variant="outline" size="sm" onClick={openClienteModal}><FiUser size={14} /> Cliente</Button>
          )}
          {comanda.status !== 'FECHADA' && (
            <Button variant="outline" size="sm" onClick={openDescontoModal}><FiTag size={14} /> Desconto</Button>
          )}
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

      {comanda.descontoOrigemDescricao && (comanda.desconto ?? 0) > 0 && (
        <Card padding="sm" className={`${styles.promoRow} ${styles.descontoAtivoCard}`}>
          <span>{comanda.descontoOrigemDescricao} aplicado — desconto de {formatCurrency(comanda.desconto ?? 0)}</span>
          {comanda.status !== 'FECHADA' && (
            <button onClick={handleRemoverDesconto} aria-label="Remover desconto"><FiX size={16} /></button>
          )}
        </Card>
      )}

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
                    <span className={styles.itemNome}>
                      {item.produtoNome}
                      {item.comboNome && <em> ({item.comboNome})</em>}
                    </span>
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
        <div className={styles.totalBreakdown}>
          {(comanda.desconto ?? 0) > 0 && (
            <span className={styles.totalDesconto}>Subtotal {formatCurrency(comanda.subtotal ?? comanda.total)} · − {formatCurrency(comanda.desconto ?? 0)}</span>
          )}
          <span className={styles.totalValue}>{formatCurrency(comanda.total)}</span>
        </div>
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

      {/* Modal Cliente */}
      <Modal
        isOpen={clienteModal}
        onClose={() => setClienteModal(false)}
        title="Identificar Cliente"
        footer={<Button variant="outline" onClick={() => setClienteModal(false)}>Fechar</Button>}
      >
        <div className={styles.modalForm}>
          {clienteError && <div className={styles.modalError}>{clienteError}</div>}
          <Input
            label="Telefone do cliente"
            value={clienteBusca}
            onChange={e => setClienteBusca(e.target.value)}
            placeholder="(11) 91234-5678"
            onKeyDown={e => { if (e.key === 'Enter') handleBuscarCliente() }}
          />
          <Button onClick={handleBuscarCliente} loading={clienteBuscando}>Buscar</Button>

          {clienteEncontrado && (
            <div className={styles.buscaResultadoRow}>
              <span>{clienteEncontrado.nome} · {clienteEncontrado.telefone}</span>
              <Button size="sm" onClick={() => handleSelecionarCliente(clienteEncontrado)}>Selecionar</Button>
            </div>
          )}

          {clienteEncontrado === null && (
            <>
              <p className={styles.modalHint}>Nenhum cliente com esse telefone. Cadastrar novo:</p>
              <Input
                label="Nome do cliente"
                value={clienteNovoNome}
                onChange={e => setClienteNovoNome(e.target.value)}
              />
              <Button onClick={handleCadastrarCliente} loading={clienteSalvando}>
                Cadastrar e selecionar
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Modal Desconto */}
      <Modal
        isOpen={descontoModal}
        onClose={() => setDescontoModal(false)}
        title="Aplicar Desconto"
        footer={<Button variant="outline" onClick={() => setDescontoModal(false)}>Fechar</Button>}
      >
        <div className={styles.modalForm}>
          {descontoError && <div className={styles.modalError}>{descontoError}</div>}

          <Input
            label="Código do cupom"
            value={cupomCodigoInput}
            onChange={e => setCupomCodigoInput(e.target.value.toUpperCase())}
            placeholder="Ex: PROMO10"
            onKeyDown={e => { if (e.key === 'Enter') handleAplicarCupom() }}
          />
          <Button onClick={handleAplicarCupom} loading={aplicandoDesconto}>Aplicar Cupom</Button>

          {promocoesAplicaveis.length > 0 && (
            <>
              <p className={styles.modalHint}>Promoções disponíveis:</p>
              <div className={styles.promoList}>
                {promocoesAplicaveis.map(promo => (
                  <div key={promo.promocaoId} className={styles.promoRow}>
                    <span>{promo.nome} ({promo.tipoDesconto === 'PERCENTUAL' ? `${promo.valorDesconto}%` : formatCurrency(promo.valorDesconto)})</span>
                    <Button size="sm" loading={aplicandoDesconto} onClick={() => handleAplicarPromocao(promo.promocaoId)}>Aplicar</Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
