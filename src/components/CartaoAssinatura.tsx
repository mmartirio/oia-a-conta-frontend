import { useEffect, useRef, useState } from 'react'
import { billingApi, type Contrato } from '../api/billingApi'
import { carregarSdkMercadoPago, type BrickController, type CardFormData } from '../utils/mercadoPagoSdk'
import styles from './CartaoAssinatura.module.css'

// Cadastro do cartão da assinatura mensal — o formulário é o Card Payment
// Brick do Mercado Pago (iframe deles), então o número do cartão nunca passa
// pelo nosso frontend/backend: o Brick devolve um token de uso único, que o
// billing-service usa pra criar a assinatura (ver AssinaturaService no backend).

const CONTAINER_ID = 'cartaoAssinaturaBrick'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  emailPadrao?: string
  onSucesso: (contrato: Contrato) => void
  // Mostrado só quando o pagamento por cartão está indisponível (MP não
  // configurado no servidor ou falha ao carregar) — no cadastro, deixa o
  // dono seguir pro painel em vez de travar; ele cadastra depois em
  // "Minha Assinatura".
  onIndisponivel?: () => void
}

export function CartaoAssinatura({ emailPadrao, onSucesso, onIndisponivel }: Props) {
  const [indisponivel, setIndisponivel] = useState(false)
  const [config, setConfig] = useState<{ publicKey: string; valor: number; primeiraCobranca: string } | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  // Token do cartão é de uso único — se a criação da assinatura falhar, o
  // Brick precisa ser recriado pra gerar outro (tentativa++ força isso).
  const [tentativa, setTentativa] = useState(0)
  const onSucessoRef = useRef(onSucesso)
  onSucessoRef.current = onSucesso

  useEffect(() => {
    billingApi.configAssinatura()
      .then(r => setConfig(r.data))
      .catch(() => { setErro('Não foi possível carregar os dados da assinatura.'); setCarregando(false); setIndisponivel(true) })
  }, [])

  useEffect(() => {
    if (!config) return
    if (!config.publicKey) {
      setErro('Pagamento por cartão indisponível no momento. Você pode cadastrar o cartão depois em "Minha Assinatura".')
      setCarregando(false)
      setIndisponivel(true)
      return
    }
    let controller: BrickController | null = null
    let cancelado = false
    setCarregando(true)

    carregarSdkMercadoPago()
      .then(() => {
        if (cancelado || !window.MercadoPago) return
        const mp = new window.MercadoPago(config.publicKey, { locale: 'pt-BR' })
        return mp.bricks().create('cardPayment', CONTAINER_ID, {
          initialization: { amount: config.valor, payer: { email: emailPadrao ?? '' } },
          customization: {
            paymentMethods: { maxInstallments: 1, types: { excluded: ['debit_card', 'prepaid_card'] } },
            visual: { texts: { formSubmit: 'Cadastrar cartão' }, hidePaymentButton: false },
          },
          callbacks: {
            onReady: () => setCarregando(false),
            onError: () => setErro('Erro no formulário do cartão. Confira os dados e tente de novo.'),
            onSubmit: async (formData: CardFormData) => {
              setErro('')
              try {
                const { data } = await billingApi.criarAssinatura(formData.token, formData.payer.email)
                onSucessoRef.current(data)
              } catch (err: unknown) {
                const msg = (err as { response?: { data?: { mensagem?: string } } }).response?.data?.mensagem
                setErro(msg ?? 'Não foi possível cadastrar o cartão. Tente novamente.')
                setTentativa(t => t + 1)
                throw err
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
        setIndisponivel(true)
      })

    return () => {
      cancelado = true
      controller?.unmount()
    }
  }, [config, emailPadrao, tentativa])

  const cobraAgora = config && new Date(`${config.primeiraCobranca}T00:00:00`) <= new Date()

  return (
    <div className={styles.wrap}>
      {config && (
        <div className={styles.resumo}>
          {cobraAgora ? (
            <>A primeira mensalidade de <strong>{fmt(config.valor)}</strong> é cobrada agora no cartão.</>
          ) : (
            <>
              Você não paga nada hoje. A primeira cobrança de <strong>{fmt(config.valor)}</strong> será
              em <strong>{new Date(`${config.primeiraCobranca}T00:00:00`).toLocaleDateString('pt-BR')}</strong>,
              e depois todo mês, automaticamente.
            </>
          )}
        </div>
      )}
      {erro && <div className={styles.erro}>{erro}</div>}
      {carregando && !erro && <p className={styles.carregando}>Carregando formulário de pagamento...</p>}
      <div id={CONTAINER_ID} />
      {indisponivel && onIndisponivel && (
        <button type="button" className={styles.pular} onClick={onIndisponivel}>
          Continuar sem cadastrar o cartão agora →
        </button>
      )}
      <p className={styles.seguranca}>🔒 Pagamento processado pelo Mercado Pago · cancele quando quiser</p>
    </div>
  )
}
