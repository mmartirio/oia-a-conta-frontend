import { useEffect, useState } from 'react'
import { pagamentoOnlineApi, type StatusConexaoMercadoPago } from '../api/pagamentoOnlineApi'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'
import styles from './MercadoPagoConexao.module.css'

// Card de Configurações → Pagamento: conecta a conta Mercado Pago do
// restaurante pra aceitar PIX e cartão online no cardápio digital. O dono é
// mandado pro MP, autoriza, e volta em /admin/mercadopago/callback.
export function MercadoPagoConexao() {
  const [status, setStatus] = useState<StatusConexaoMercadoPago | null>(null)
  const [erro, setErro] = useState('')
  const [conectando, setConectando] = useState(false)
  const [confirmarDesconexao, setConfirmarDesconexao] = useState(false)

  const carregar = () => {
    pagamentoOnlineApi.status()
      .then(r => setStatus(r.data))
      .catch(() => setErro('Não foi possível carregar o status do pagamento online.'))
  }

  useEffect(carregar, [])

  const conectar = async () => {
    setErro('')
    setConectando(true)
    try {
      const { data } = await pagamentoOnlineApi.iniciarConexao()
      window.location.href = data.url
    } catch (err) {
      setErro((err as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? 'Não foi possível iniciar a conexão com o Mercado Pago.')
      setConectando(false)
    }
  }

  const desconectar = async () => {
    setConfirmarDesconexao(false)
    try {
      await pagamentoOnlineApi.desconectar()
      carregar()
    } catch {
      setErro('Não foi possível desconectar.')
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.titulo}>Pagamento online no cardápio</h3>
          <p className={styles.descricao}>
            Seus clientes pagam com PIX ou cartão de crédito direto no cardápio digital, e o dinheiro cai na sua
            conta Mercado Pago. O pedido só chega para você depois de pago.
          </p>
        </div>
        {status?.conectado && <span className={styles.badgeConectado}>● Conectado</span>}
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      {status && !status.disponivel && !status.conectado && (
        <p className={styles.hint}>Pagamento online ainda não está disponível. Fale com o suporte.</p>
      )}

      {status?.conectado ? (
        <div className={styles.acoes}>
          <span className={styles.hint}>
            Conta Mercado Pago {status.mpUserId ? `#${status.mpUserId}` : ''}
            {status.conectadoEm ? ` · conectada em ${new Date(status.conectadoEm).toLocaleDateString('pt-BR')}` : ''}
          </span>
          <Button variant="outline" size="sm" onClick={() => setConfirmarDesconexao(true)}>Desconectar</Button>
        </div>
      ) : status?.disponivel && (
        <div className={styles.acoes}>
          <Button loading={conectando} onClick={conectar}>Conectar Mercado Pago</Button>
          <span className={styles.hint}>Para receber PIX, sua conta Mercado Pago precisa ter uma chave PIX cadastrada.</span>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmarDesconexao}
        danger
        title="Desconectar Mercado Pago?"
        message="O cardápio deixa de oferecer PIX e cartão online. Pedidos já pagos não são afetados."
        confirmLabel="Desconectar"
        onConfirm={desconectar}
        onCancel={() => setConfirmarDesconexao(false)}
      />
    </div>
  )
}
