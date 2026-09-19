import { useState, useEffect, useRef, FormEvent } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/authApi'
import { billingApi, type Plano } from '../api/billingApi'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PlanoCard } from '../components/PlanoCard'
import planoCardStyles from '../components/PlanoCard.module.css'
import { formatPhone } from '../utils/formatters'
import { VERSAO_CONTRATO } from '../constants/legal'
import logo from '../assets/logo/OIA A CONTA - LOGO.png'
import styles from './Auth.module.css'
import reg from './Registro.module.css'

const STEP_LABEL: Record<Step, string> = {
  plano: 'Plano',
  modalidade: 'Modalidade',
  form: 'Dados',
  verificacao: 'Confirmação',
}
const STEP_ORDER: Step[] = ['plano', 'modalidade', 'form', 'verificacao']

function ProgressoWizard({ atual, claro }: { atual: Step; claro?: boolean }) {
  const idxAtual = STEP_ORDER.indexOf(atual)
  return (
    <div className={`${reg.progresso} ${claro ? reg.progressoClaro : ''}`}>
      {STEP_ORDER.map((s, i) => (
        <div key={s} className={`${reg.progressoItem} ${i <= idxAtual ? reg.progressoItemAtivo : ''}`}>
          <span className={reg.progressoNumero}>{i + 1}</span>
          <span className={reg.progressoLabel}>{STEP_LABEL[s]}</span>
          {i < STEP_ORDER.length - 1 && <span className={reg.progressoLinha} />}
        </div>
      ))}
    </div>
  )
}

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

type Step = 'plano' | 'modalidade' | 'form' | 'verificacao'
type ModalidadeOperacao = 'MESAS' | 'DELIVERY'

export function Registro() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { verificarEmail } = useAuth()

  const [step, setStep] = useState<Step>('plano')
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loadingPlanos, setLoadingPlanos] = useState(true)
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null)
  const [modalidadeOperacao, setModalidadeOperacao] = useState<ModalidadeOperacao | null>(null)

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
      .then(r => {
        const ativos = r.data.filter(p => p.ativo)
        setPlanos(ativos)
        // Veio da landing page com um plano específico em mente (?planoId=X)
        // — pula a etapa de escolha e cai direto no formulário com o plano
        // já selecionado. Se a modalidade também veio na URL (escolhida no
        // toggle do próprio card), pula a etapa "modalidade" também — ela só
        // reaparece se o usuário pedir pra trocar lá do formulário (ver
        // botão "Voltar" na etapa 2).
        const planoId = searchParams.get('planoId')
        if (planoId) {
          const preSelecionado = ativos.find(p => String(p.id) === planoId)
          if (preSelecionado) {
            setPlanoSelecionado(preSelecionado)
            const modalidadeUrl = searchParams.get('modalidade')
            if (preSelecionado.exigeModalidadeOperacao && (modalidadeUrl === 'MESAS' || modalidadeUrl === 'DELIVERY')) {
              setModalidadeOperacao(modalidadeUrl)
              setStep('form')
            } else {
              setStep(preSelecionado.exigeModalidadeOperacao ? 'modalidade' : 'form')
            }
          }
        }
      })
      .catch(() => setPlanos([]))
      .finally(() => setLoadingPlanos(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (reenvioTimer <= 0) return
    const t = setTimeout(() => setReenvioTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [reenvioTimer])

  const selecionarPlano = (p: Plano, modalidade: ModalidadeOperacao) => {
    setPlanoSelecionado(p)
    setModalidadeOperacao(p.exigeModalidadeOperacao ? modalidade : null)
    setStep('form')
  }

  const escolherModalidade = (m: ModalidadeOperacao) => {
    setModalidadeOperacao(m)
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

  // Chegou aqui redirecionado pela tela de Login — tentou entrar com Google
  // mas não tem cadastro (AuthService.loginComGoogle devolve 404 nesse
  // caso). Reaproveita o credential do Google pra pré-preencher, em vez de
  // pedir pra logar com o Google de novo aqui.
  useEffect(() => {
    const credential = (location.state as { googleCredential?: string } | null)?.googleCredential
    if (!credential) return
    handleGoogle({ credential })
    setError('Não encontramos uma conta para esse e-mail — complete seu cadastro abaixo.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        modalidadeOperacao: modalidadeOperacao ?? undefined,
        termosAceitos: aceitouTermos,
        versaoContrato: VERSAO_CONTRATO,
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

          <ProgressoWizard atual={step} claro />

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
          <Link to="/" className={reg.voltarSite}>← Voltar para o site</Link>
          <div className={reg.header}>
            <img src={logo} alt="Oia a Conta" className={reg.logo} />
            <h1 className={reg.title}>Escolha seu plano</h1>
            <p className={reg.subtitle}>Escolha o plano ideal para o seu restaurante</p>
          </div>

          <ProgressoWizard atual={step} />

          {loadingPlanos ? (
            <p className={reg.loading}>Carregando planos...</p>
          ) : planos.length === 0 ? (
            <p className={reg.loading}>Nenhum plano disponível no momento.</p>
          ) : (
            <div className={reg.planosGrid}>
              {planos.map(p => (
                <PlanoCard key={p.id} plano={p}>
                  {modalidade => (
                    <Button
                      fullWidth
                      variant={p.destaque ? 'primary' : 'outline'}
                      className={planoCardStyles.selecionarBtn}
                      onClick={() => selecionarPlano(p, modalidade)}
                    >
                      Selecionar
                    </Button>
                  )}
                </PlanoCard>
              ))}
            </div>
          )}

          <p className={reg.footerLink}>
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    )
  }

  // ── Etapa 1.5: modalidade de operação (só planos que exigem, ex: Startup) ─
  if (step === 'modalidade') {
    return (
      <div className={styles.page}>
        <div className={`${styles.card} ${reg.formCard}`}>
          <div className={styles.logo}>
            <img src={logo} alt="Oia a Conta" />
          </div>

          <ProgressoWizard atual={step} claro />

          {planoSelecionado && (
            <div className={reg.planoBadgeSelected}>
              Plano: <strong>{planoSelecionado.nome}</strong>
            </div>
          )}

          <h2 className={styles.title}>Como seu restaurante vai operar?</h2>
          <p className={styles.subtitle}>
            O plano {planoSelecionado?.nome} atende um único formato — dá pra mudar depois falando com o suporte.
          </p>

          <div className={reg.planosGrid}>
            <Button fullWidth variant="outline" onClick={() => escolherModalidade('MESAS')}>
              Presencial (mesas e comandas)
            </Button>
            <Button fullWidth variant="outline" onClick={() => escolherModalidade('DELIVERY')}>
              Delivery e entregadores
            </Button>
          </div>

          <Button type="button" variant="ghost" fullWidth onClick={() => setStep('plano')}>
            ← Voltar e trocar plano
          </Button>
        </div>
      </div>
    )
  }

  // ── Etapa 2: formulário de cadastro ──────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={`${styles.card} ${reg.formCard}`}>
        <div className={styles.logo}>
          <img src={logo} alt="Oia a Conta" />
        </div>

        <ProgressoWizard atual={step} claro />

        {planoSelecionado && (
          <div className={reg.planoBadgeSelected}>
            Plano: <strong>{planoSelecionado.nome}</strong>
          </div>
        )}

        {planoSelecionado?.exigeModalidadeOperacao && modalidadeOperacao && (
          <div className={reg.modalidadeBadgeSelected}>
            Modalidade: <strong>{modalidadeOperacao === 'MESAS' ? 'Presencial' : 'Delivery'}</strong>
            <button
              type="button"
              className={reg.modalidadeTrocarBtn}
              onClick={() => setStep('modalidade')}
            >
              Trocar
            </button>
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
            onChange={e => setForm(f => ({ ...f, telefone: formatPhone(e.target.value) }))}
            placeholder="(11) 99999-9999"
            maxLength={15}
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
            <label className={reg.contratoAceite}>
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={e => setAceitouTermos(e.target.checked)}
              />
              <span>
                Li e aceito o{' '}
                <a href="/contrato" target="_blank" rel="noopener noreferrer">Contrato de Adesão</a>, os{' '}
                <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer">Termos de Uso</a> e a{' '}
                <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
              </span>
            </label>
          )}

          <p className={reg.trustNote}>🔒 Seus dados estão protegidos · cancele quando quiser</p>

          <Button type="submit" loading={loading} fullWidth size="lg" disabled={!aceitouTermos}>
            Cadastrar e verificar e-mail
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              setStep(planoSelecionado?.exigeModalidadeOperacao ? 'modalidade' : 'plano')
              setAceitouTermos(false)
            }}
          >
            ← Voltar
          </Button>
        </form>

        <p className={styles.footer}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
