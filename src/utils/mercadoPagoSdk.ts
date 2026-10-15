// Carrega o SDK JS v2 do Mercado Pago (Bricks) uma vez só por página —
// usado no cartão da assinatura (CartaoAssinatura) e no pagamento online
// do cardápio (PagamentoOnlinePedido).

const SDK_URL = 'https://sdk.mercadopago.com/js/v2'

export interface BrickController { unmount: () => void }

export interface CardFormData {
  token: string
  issuer_id?: string
  payment_method_id: string
  installments?: number
  payer: { email: string; identification?: { type: string; number: string } }
}

export interface MercadoPagoInstance {
  bricks: () => {
    create: (tipo: 'cardPayment', containerId: string, settings: unknown) => Promise<BrickController>
  }
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale: string }) => MercadoPagoInstance
  }
}

let sdkPromise: Promise<void> | null = null

export function carregarSdkMercadoPago(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve()
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SDK_URL
      script.onload = () => resolve()
      script.onerror = () => { sdkPromise = null; reject(new Error('sdk')) }
      document.head.appendChild(script)
    })
  }
  return sdkPromise
}
