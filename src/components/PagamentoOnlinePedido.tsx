import { useCallback, useEffect, useRef, useState } from 'react'
import { publicApi, type PagamentoOnlineResumo } from '../api/publicApi'
import { carregarSdkMercadoPago, type BrickController, type CardFormData } from '../utils/mercadoPagoSdk'
import styles from './PagamentoOnlinePedido.module.css'

// Pagamento online do pedido do cardápio — o dinheiro vai pra conta Mercado
// Pago do restaurante (o backend cria o pagamento com o token dele). PIX:
// QR/copia-e-cola na tela + consulta periódica até cair. Cartão: Card Payment
// Brick (iframe do MP, o número do cartão nunca passa pela gente).

const CONTAINER_ID = 'pagamentoPedidoBrick'
const INTERVALO_STATUS_MS = 4000

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mensagemErro(err: unknown, padrao: string) {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? padrao
}

interface Props {
  entregaId: number
  token: string
  total: number
  metodo: 'PIX' | 'CARTAO_CREDITO'
  publicKey: string
  onPago: () => void
}

export function PagamentoOnlinePedido({ entregaId, token, total, metodo, publicKey, onPago }: Props) {
  const [erro, setErro] = useState('')
  const onPagoRef = useRef(onPago)
  onPagoRef.current = onPago

  return (
    <div className={styles.wrap}>
      <div className={styles.total}>
        <span>Total do pedido</span>
        <strong>{fmt(total)}</strong>
      </div>
      {erro && <div className={styles.erro}>{erro}</div>}
      {metodo === 'PIX' ? (
        <PagamentoPix entregaId={entregaId} token={token} onPago={() => onPagoRef.current()} setErro={setErro} />
      ) : (
        <PagamentoCartao
          entregaId={entregaId} token={token} total={total} publicKey={publicKey}
          onPago={() => onPagoRef.current()} setErro={setErro}
        />
      )}
      <p className={styles.seguranca}>🔒 Pagamento processado pelo Mercado Pago, direto para o restaurante</p>
    </div>
  )
}

function PagamentoPix({ entregaId, token, onPago, setErro }: {
  entregaId: number; token: string; onPago: () => void; setErro: (m: string) => void
}) {
  const [pix, setPix] = useState<PagamentoOnlineResumo | null>(null)
  const [gerando, setGerando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [expirado, setExpirado] = useState(false)
  const gerouRef = useRef(false)

  const gerar = useCallback(async () => {
    setErro('')
    setExpirado(false)
    setGerando(true)
    try {
      const { data } = await publicApi.pagarPedido(entregaId, token, {})
      if (data.pago) { onPago(); return }
      setPix(data)
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível gerar o PIX. Tente novamente.'))
    } finally {
      setGerando(false)
    }
  }, [entregaId, token, onPago, setErro])

  // Gera o PIX ao abrir (ref evita gerar dois no double-mount do StrictMode).
  useEffect(() => {
    if (gerouRef.current) return
    gerouRef.current = true
    gerar()
  }, [gerar])

  useEffect(() => {
    if (!pix?.pixQrCode || expirado) return
    const timer = setInterval(async () => {
      try {
        const { data } = await publicApi.statusPagamentoPedido(entregaId, token)
        if (data.pago) { clearInterval(timer); onPago(); return }
        if (data.cancelado || data.status === 'cancelled' || data.status === 'expired') {
          clearInterval(timer)
          setExpirado(true)
        }
      } catch { /* rede instável — tenta de novo no próximo ciclo */ }
    }, INTERVALO_STATUS_MS)
    return () => clearInterval(timer)
  }, [pix, expirado, entregaId, token, onPago])

  const copiar = async () => {
    if (!pix?.pixQrCode) return
    try {
      await navigator.clipboard.writeText(pix.pixQrCode)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setErro('Não foi possível copiar — selecione o código e copie manualmente.')
    }
  }

  if (gerando && !pix) return <p className={styles.carregando}>Gerando PIX...</p>

  if (expirado) {
    return (
      <div className={styles.pixBox}>
        <p className={styles.instrucao}>Esse PIX expirou.</p>
        <button className={styles.btn} onClick={gerar} disabled={gerando}>
          {gerando ? 'Gerando...' : 'Gerar novo PIX'}
        </button>
      </div>
    )
  }

  if (!pix?.pixQrCode) {
    return (
      <button className={styles.btn} onClick={gerar} disabled={gerando}>
        {gerando ? 'Gerando...' : 'Gerar PIX'}
      </button>
    )
  }

  return (
    <div className={styles.pixBox}>
      <p className={styles.instrucao}>Abra o app do seu banco e pague com o QR code ou o PIX copia e cola:</p>
      {pix.pixQrCodeBase64 && (
        <img className={styles.qr} src={`data:image/png;base64,${pix.pixQrCodeBase64}`} alt="QR code PIX" />
      )}
      <textarea className={styles.copiaCola} readOnly value={pix.pixQrCode} rows={3} onFocus={e => e.target.select()} />
      <button className={styles.btn} onClick={copiar}>
        {copiado ? '✓ Código copiado' : 'Copiar código PIX'}
      </button>
      <p className={styles.aguardando}>
        <span className={styles.spinner} /> Aguardando pagamento — a confirmação é automática
      </p>
    </div>
  )
}

function PagamentoCartao({ entregaId, token, total, publicKey, onPago, setErro }: {
  entregaId: number; token: string; total: number; publicKey: string
  onPago: () => void; setErro: (m: string) => void
}) {
  const [carregando, setCarregando] = useState(true)
  // Token do cartão é de uso único — recusa/erro recria o Brick.
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let controller: BrickController | null = null
    let cancelado = false
    setCarregando(true)

    carregarSdkMercadoPago()
      .then(() => {
        if (cancelado || !window.MercadoPago) return
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
        return mp.bricks().create('cardPayment', CONTAINER_ID, {
          initialization: { amount: total },
          customization: {
            paymentMethods: { maxInstallments: 1, types: { excluded: ['debit_card', 'prepaid_card'] } },
            visual: { texts: { formSubmit: `Pagar ${fmt(total)}` } },
          },
          callbacks: {
            onReady: () => setCarregando(false),
            onError: () => setErro('Erro no formulário do cartão. Confira os dados e tente de novo.'),
            onSubmit: async (formData: CardFormData) => {
              setErro('')
              try {
                const { data } = await publicApi.pagarPedido(entregaId, token, {
                  token: formData.token,
                  paymentMethodId: formData.payment_method_id,
                  issuerId: formData.issuer_id,
                  payerEmail: formData.payer?.email,
                  identificationType: formData.payer?.identification?.type,
                  identificationNumber: formData.payer?.identification?.number,
                })
                if (data.pago) { onPago(); return }
                setErro(data.motivo ?? (data.status === 'in_process' || data.status === 'pending'
                  ? 'Pagamento em análise pelo Mercado Pago. Você será avisado no WhatsApp quando o restaurante aceitar.'
                  : 'Pagamento não aprovado. Tente outro cartão ou PIX.'))
                if (data.status !== 'in_process' && data.status !== 'pending') setTentativa(t => t + 1)
              } catch (err) {
                setErro(mensagemErro(err, 'Não foi possível processar o pagamento. Tente novamente.'))
                setTentativa(t => t + 1)
              }
            },
          },
        })
      })
      .then(c => {
        if (!c) return
        if (cancelado) c.unmount()
        else controller = c
      })
      .catch(() => {
        if (cancelado) return
        setErro('Não foi possível carregar o formulário de pagamento.')
        setCarregando(false)
      })

    return () => {
      cancelado = true
      controller?.unmount()
    }
  }, [entregaId, token, total, publicKey, tentativa, onPago, setErro])

  return (
    <>
      {carregando && <p className={styles.carregando}>Carregando formulário de pagamento...</p>}
      <div id={CONTAINER_ID} />
    </>
  )
}
