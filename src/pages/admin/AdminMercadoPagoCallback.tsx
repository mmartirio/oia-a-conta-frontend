import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { pagamentoOnlineApi } from '../../api/pagamentoOnlineApi'
import { Button } from '../../components/ui/Button'

// Retorno do OAuth do Mercado Pago (redirect_uri cadastrada na aplicação do
// MP = MP_OAUTH_REDIRECT_URI no backend). Troca o code pelos tokens no
// order-service e volta pra Configurações → Pagamento.
export function AdminMercadoPagoCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [erro, setErro] = useState('')
  const enviadoRef = useRef(false)

  useEffect(() => {
    if (enviadoRef.current) return
    enviadoRef.current = true
    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) {
      setErro('A autorização foi cancelada ou não foi concluída no Mercado Pago.')
      return
    }
    pagamentoOnlineApi.concluirConexao(code, state)
      .then(() => navigate('/admin/configuracoes?aba=pagamento', { replace: true }))
      .catch(err => setErro((err as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? 'Não foi possível concluir a conexão com o Mercado Pago.'))
  }, [params, navigate])

  return (
    <div style={{ maxWidth: 520, margin: '3rem auto', textAlign: 'center', padding: '0 1rem' }}>
      {erro ? (
        <>
          <h2>Não foi possível conectar</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>{erro}</p>
          <Button onClick={() => navigate('/admin/configuracoes?aba=pagamento', { replace: true })}>
            Voltar para Configurações
          </Button>
        </>
      ) : (
        <p>Conectando sua conta Mercado Pago...</p>
      )}
    </div>
  )
}
