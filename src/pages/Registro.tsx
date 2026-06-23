import { useState, useEffect, useRef, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/authApi'
import { billingApi, type Plano } from '../api/billingApi'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import logo from '../assets/logo/OIA A CONTA - LOGO.png'
import styles from './Auth.module.css'
import reg from './Registro.module.css'

interface GooglePayload {
  email: string
  name: string
  phone_number?: string
}

function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!'
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => chars[b % chars.length])
    .join('')
}

function parseFuncionalidades(f: string): string[] {
  return f ? f.split(',').map(s => s.trim()).filter(Boolean) : []
}

type Step = 'plano' | 'form' | 'verificacao'

export function Registro() {
  const navigate = useNavigate()
  const { verificarEmail } = useAuth()

  const [step, setStep] = useState<Step>('plano')
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loadingPlanos, setLoadingPlanos] = useState(true)
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null)

  const [form, setForm] = useState({
    restauranteNome: '',
    adminNome: '',
    email: '',
    senha: '',
    telefone: '',
  })
  const [viaGoogle, setViaGoogle] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Etapa 3 — verificação
  const [emailPendente, setEmailPendente] = useState('')
  const [codigos, setCodigos] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [reenvioTimer, setReenvioTimer] = useState(0)
  const [reenvioLoading, setReenvioLoading] = useState(false)

  useEffect(() => {
    billingApi.listarPlanos()
      .then(r => setPlanos(r.data.filter(p => p.ativo)))
      .catch(() => setPlanos([]))
      .finally(() => setLoadingPlanos(false))
  }, [])

  useEffect(() => {
    if (reenvioTimer <= 0) return
    const t = setTimeout(() => setReenvioTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [reenvioTimer])

  const selecionarPlano = (p: Plano) => {
    setPlanoSelecionado(p)
    setStep('form')
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleGoogle = (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return
    try {
      const payload = jwtDecode<GooglePayload>(credentialResponse.credential)
      setForm(f => ({
        ...f,
        adminNome: payload.name ?? f.adminNome,
        email: payload.email ?? f.email,
        telefone: payload.phone_number ?? f.telefone,
        senha: gerarSenha(),
      }))
      setViaGoogle(true)
      setError('')
    } catch {
      setError('Não foi possível ler os dados do Google.')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.registroIniciar({
        restauranteNome: form.restauranteNome,
        adminNome: form.adminNome,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone || undefined,
        planoId: planoSelecionado?.id,
      })
      setEmailPendente(form.email)
      setCodigos(['', '', '', '', '', ''])
      setStep('verificacao')
      setReenvioTimer(60)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message
      setError(msg ?? 'Erro ao iniciar cadastro')
    } finally {
      setLoading(false)
    }
  }

  const handleDigito = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...codigos]
    next[idx] = digit
    setCodigos(next)
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  const handleDigitoKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codigos[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...codigos]
    for (let i = 0; i < 6; i++) next[i] = text[i] ?? ''
    setCodigos(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
  }

  const handleVerificar = async (e: FormEvent) => {
    e.preventDefault()
    const codigo = codigos.join('')
    if (codigo.length < 6) { setError('Digite o código de 6 dígitos.'); return }
    setError('')
    setLoading(true)
    try {
      const usuario = await verificarEmail(emailPendente, codigo)
      navigate(usuario.role === 'ADMIN' ? '/admin' : `/${usuario.role.toLowerCase()}`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message
      setError(msg ?? 'Código inválido ou expirado')
    } finally {
      setLoading(false)
    }
  }

  const handleReenviar = async () => {
    setReenvioLoading(true)
    try {
      await authApi.reenviarCodigo(emailPendente)
      setReenvioTimer(60)
      setError('')
    } catch {
      setError('Não foi possível reenviar o código.')
    } finally {
      setReenvioLoading(false)
    }
  }

  // ── Etapa 3: verificação de e-mail ────────────────────────────────────────
  if (step === 'verificacao') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <img src={logo} alt="Oia a Conta" />
          </div>
          <h2 className={styles.title}>Verifique seu e-mail</h2>
          <p className={styles.subtitle}>
            Enviamos um código de 6 dígitos para<br />
            <strong>{emailPendente}</strong>
          </p>

          {error && <div className={styles.alert}>{error}</div>}

          <form onSubmit={handleVerificar} className={styles.form}>
            <div className={reg.codigoGrid}>
              {codigos.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  className={reg.codigoInput}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigito(i, e.target.value)}
                  onKeyDown={e => handleDigitoKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">
              Confirmar e criar conta
            </Button>
          </form>

          <div className={reg.reenvioRow}>
            {reenvioTimer > 0 ? (
              <span className={reg.reenvioTimer}>Reenviar em {reenvioTimer}s</span>
            ) : (
              <button
                type="button"
                className={reg.reenvioBtn}
                onClick={handleReenviar}
                disabled={reenvioLoading}
              >
                {reenvioLoading ? 'Enviando...' : 'Reenviar código'}
              </button>
            )}
          </div>

          <p className={styles.footer}>
            <button
              type="button"
              className={reg.voltarLink}
              onClick={() => setStep('form')}
            >
              ← Voltar ao formulário
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Etapa 1: seleção de plano ────────────────────────────────────────────
  if (step === 'plano') {
    return (
      <div className={styles.page}>
        <div className={reg.wrapper}>
          <div className={reg.header}>
            <img src={logo} alt="Oia a Conta" className={reg.logo} />
            <h1 className={reg.title}>Escolha seu plano</h1>
            <p className={reg.subtitle}>Escolha o plano ideal para o seu restaurante</p>
          </div>

          {loadingPlanos ? (
            <p className={reg.loading}>Carregando planos...</p>
          ) : planos.length === 0 ? (
            <p className={reg.loading}>Nenhum plano disponível no momento.</p>
          ) : (
            <div className={reg.planosGrid}>
              {planos.map(p => {
                const funcs = parseFuncionalidades(p.funcionalidades)
                return (
                  <div key={p.id} className={`${reg.planoCard} ${p.destaque ? reg.destaque : ''}`}>
                    {p.destaque && <span className={reg.badge}>Mais popular</span>}
                    <h2 className={reg.planoNome}>{p.nome}</h2>
                    <p className={reg.planoDesc}>{p.descricao}</p>
                    <div className={reg.planoPreco}>
                      <span className={reg.precoValor}>
                        {p.precoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className={reg.precoLabel}>/mês</span>
                    </div>
                    <ul className={reg.funcList}>
                      {p.periodoTeste && p.diasTeste > 0 && (
                        <li><strong>{p.diasTeste} dias grátis</strong></li>
                      )}
                      <li>Até {p.limiteUsuarios} usuários</li>
                      <li>Até {p.limiteMesas} mesas</li>
                      {funcs.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    <Button
                      fullWidth
                      variant={p.destaque ? 'primary' : 'outline'}
                      onClick={() => selecionarPlano(p)}
                    >
                      Selecionar
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          <p className={reg.footerLink}>
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    )
  }

  // ── Etapa 2: formulário de cadastro ──────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src={logo} alt="Oia a Conta" />
        </div>

        {planoSelecionado && (
          <div className={reg.planoBadgeSelected}>
            Plano: <strong>{planoSelecionado.nome}</strong>
          </div>
        )}

        <p className={styles.subtitle}>Preencha os dados da empresa</p>

        {error && <div className={styles.alert}>{error}</div>}

        {!viaGoogle && (
          <>
            <div className={reg.googleHint}>Preencha automaticamente com o Google</div>
            <div className={styles.googleWrapper}>
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError('Falha ao conectar com o Google')}
                text="continue_with"
                shape="rectangular"
              />
            </div>
            <div className={styles.divider}><span>ou preencha manualmente</span></div>
          </>
        )}

        {viaGoogle && (
          <div className={reg.googleBadge}>
            <span className={reg.googleDot} />
            Dados preenchidos pelo Google —{' '}
            <button
              type="button"
              className={reg.googleRemover}
              onClick={() => {
                setViaGoogle(false)
                setForm(f => ({ ...f, adminNome: '', email: '', telefone: '', senha: '' }))
              }}
            >
              remover
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Nome da empresa / restaurante"
            id="restauranteNome"
            value={form.restauranteNome}
            onChange={set('restauranteNome')}
            required
            placeholder="Ex: Restaurante do João"
          />
          <Input
            label="Seu nome"
            id="adminNome"
            value={form.adminNome}
            onChange={set('adminNome')}
            required
            placeholder="Nome completo"
            disabled={viaGoogle}
          />
          <Input
            label="E-mail"
            type="email"
            id="email"
            value={form.email}
            onChange={set('email')}
            required
            autoComplete="email"
            disabled={viaGoogle}
          />
          <Input
            label="Telefone (opcional)"
            type="tel"
            id="telefone"
            value={form.telefone}
            onChange={set('telefone')}
            placeholder="(11) 99999-9999"
          />
          <Input
            label="Senha"
            type="password"
            id="senha"
            value={form.senha}
            onChange={set('senha')}
            required
            minLength={6}
            placeholder={viaGoogle ? 'Gerada automaticamente' : 'Mínimo 6 caracteres'}
            disabled={viaGoogle}
          />
          {viaGoogle && (
            <p className={reg.senhaHint}>
              Senha gerada automaticamente. Você também poderá entrar com Google.
            </p>
          )}
          {planoSelecionado && (
            <>
              <div className={reg.contrato}>
                <h3 className={reg.contratoTitle}>Contrato de Adesão ao Serviço</h3>
                <p className={reg.contratoTexto}>
                  Ao criar sua conta, você, na qualidade de <strong>Contratante</strong>, adere ao
                  plano <strong>{planoSelecionado.nome}</strong> da plataforma{' '}
                  <strong>Oia a Conta</strong> pelo valor de{' '}
                  <strong>
                    {planoSelecionado.precoMensal.toLocaleString('pt-BR', {
                      style: 'currency', currency: 'BRL',
                    })}
                    /mês
                  </strong>
                  , cobrado mensalmente via <strong>PIX</strong>, conforme os termos abaixo.
                  Este contrato aplica-se a este e a qualquer plano contratado na plataforma.
                </p>
                <ul className={reg.contratoLista}>
                  {planoSelecionado.periodoTeste && planoSelecionado.diasTeste > 0 && (
                    <li><strong>Período de teste:</strong> {planoSelecionado.diasTeste} dias gratuitos a partir da ativação, conforme art. 49 do CDC (Lei 8.078/90).</li>
                  )}
                  <li><strong>Sem fidelidade:</strong> Não há prazo mínimo de permanência. O cancelamento pode ser solicitado a qualquer momento, sem multa ou encargo.</li>
                  <li><strong>Cobrança:</strong> Mensal recorrente via PIX, com vencimento todo dia correspondente à data de ativação. O acesso é suspenso automaticamente em caso de inadimplência após 3 dias úteis.</li>
                  <li><strong>Troca de plano:</strong> O Contratante pode migrar para outro plano disponível a qualquer momento, com ajuste de cobrança proporcional no próximo vencimento.</li>
                  <li><strong>Dados pessoais (LGPD – Lei 13.709/20):</strong> Os dados fornecidos serão usados exclusivamente para prestação do serviço, faturamento e comunicações relacionadas. Não compartilhamos dados com terceiros para fins comerciais. Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo suporte.</li>
                  <li><strong>Direito de arrependimento:</strong> Nos primeiros 7 dias após a contratação, o consumidor pode cancelar sem custo, conforme art. 49 do CDC.</li>
                  <li><strong>Foro:</strong> Fica eleito o foro da comarca do Contratante para dirimir eventuais conflitos.</li>
                </ul>
              </div>
              <label className={reg.contratoAceite}>
                <input
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={e => setAceitouTermos(e.target.checked)}
                />
                Li e aceito os termos do Contrato de Adesão, incluindo a Política de Privacidade (LGPD)
              </label>
            </>
          )}

          <Button type="submit" loading={loading} fullWidth size="lg" disabled={!aceitouTermos}>
            Cadastrar e verificar e-mail
          </Button>
          <Button type="button" variant="ghost" fullWidth onClick={() => { setStep('plano'); setAceitouTermos(false) }}>
            ← Voltar e trocar plano
          </Button>
        </form>

        <p className={styles.footer}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
