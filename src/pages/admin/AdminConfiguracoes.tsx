import { useEffect, useState } from 'react'
import { FiTrash2, FiPlus, FiX } from 'react-icons/fi'
import { configuracaoApi } from '../../api/configuracaoApi'
import { pausaApi, type Pausa } from '../../api/pausaApi'
import { restauranteApi } from '../../api/restauranteApi'
import { horarioApi } from '../../api/horarioApi'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { temAcesso } from '../../constants/permissoes'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Switch } from '../../components/ui/Switch'
import { Tabs } from '../../components/ui/Tabs'
import { QrCodeLink } from '../../components/ui/QrCodeLink'
import { removerFundoBranco } from '../../utils/imageProcessing'
import { playAlertaPedidoCliente, OPCOES_ALERTA_PEDIDO, type TipoAlertaPedido } from '../../utils/audio'
import type { DiaSemana, HorarioFuncionamento } from '../../types'

function lerComoDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'))
    reader.readAsDataURL(file)
  })
}
import styles from './AdminConfiguracoes.module.css'

type AbaConfiguracao = 'geral' | 'pagamento' | 'cardapio-publico' | 'horarios' | 'pausas' | 'maquininha'

const ABAS: { id: AbaConfiguracao; label: string; permissoes: string[] }[] = [
  { id: 'geral', label: 'Geral', permissoes: ['CONFIG_STATUS_LOJA', 'CONFIG_ALERTA_PEDIDO', 'CONFIG_DADOS_EMPRESA'] },
  { id: 'pagamento', label: 'Pagamento & Comissões', permissoes: ['CONFIG_PIX', 'CONFIG_COMISSOES'] },
  { id: 'maquininha', label: 'Taxas da Maquininha', permissoes: ['CONFIG_TAXAS_MAQUININHA'] },
  { id: 'cardapio-publico', label: 'Cardápio Público', permissoes: ['CONFIG_DADOS_EMPRESA', 'CONFIG_LOGO', 'CONFIG_CORES', 'CONFIG_BACKGROUND'] },
  { id: 'horarios', label: 'Horário de Funcionamento', permissoes: ['CONFIG_HORARIOS'] },
  { id: 'pausas', label: 'Pausas de Funcionamento', permissoes: ['CONFIG_PAUSAS'] },
]

const COR_PRIMARIA_PADRAO = '#CF4622'
const COR_SECUNDARIA_PADRAO = '#F68E05'
const COR_ACCENT_PADRAO = '#012F54'
const COR_TEXTO_PADRAO = '#FFFFFF'

const LOGO_MAX_BYTES = 1.5 * 1024 * 1024

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface IntervaloEdit {
  horaAbertura: string
  horaFechamento: string
}

const DIAS_SEMANA: { value: DiaSemana; label: string }[] = [
  { value: 'MONDAY', label: 'Segunda-feira' },
  { value: 'TUESDAY', label: 'Terça-feira' },
  { value: 'WEDNESDAY', label: 'Quarta-feira' },
  { value: 'THURSDAY', label: 'Quinta-feira' },
  { value: 'FRIDAY', label: 'Sexta-feira' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
]

function horaCurta(hora: string) {
  return hora.length >= 5 ? hora.slice(0, 5) : hora
}

function diasVazios(): Record<DiaSemana, IntervaloEdit[]> {
  return {
    MONDAY: [], TUESDAY: [], WEDNESDAY: [], THURSDAY: [], FRIDAY: [], SATURDAY: [], SUNDAY: [],
  }
}

export function AdminConfiguracoes() {
  const { user } = useAuth()
  const temPermissao = (chave: string) => temAcesso(user?.permissoes, chave)
  const abasPermitidas = ABAS.filter(a => a.permissoes.some(temPermissao))

  const [aba, setAba] = useState<AbaConfiguracao>(abasPermitidas[0]?.id ?? 'geral')
  const [pixChave, setPixChave] = useState('')
  const [comissaoGarcon, setComissaoGarcon] = useState('')
  const [comissaoEntregador, setComissaoEntregador] = useState('')
  const [comissaoCozinheiro, setComissaoCozinheiro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvandoPix, setSalvandoPix] = useState(false)
  const [pixSalvo, setPixSalvo] = useState(false)
  const [salvandoComissoes, setSalvandoComissoes] = useState(false)
  const [comissoesSalvas, setComissoesSalvas] = useState(false)
  const toast = useToast()

  // ── Taxas da Maquininha ──
  const [taxaDebito, setTaxaDebito] = useState('0')
  const [taxaCreditoVista, setTaxaCreditoVista] = useState('0')
  const [taxaCreditoParcelado, setTaxaCreditoParcelado] = useState('0')
  const [salvandoTaxas, setSalvandoTaxas] = useState(false)
  const [taxasSalvas, setTaxasSalvas] = useState(false)

  const [pausas, setPausas] = useState<Pausa[]>([])
  const [pausaTitulo, setPausaTitulo] = useState('')
  const [pausaInicio, setPausaInicio] = useState('')
  const [pausaFim, setPausaFim] = useState('')
  const [salvandoPausa, setSalvandoPausa] = useState(false)
  const [confirmCancelarPausa, setConfirmCancelarPausa] = useState<Pausa | null>(null)
  const [cancelandoPausa, setCancelandoPausa] = useState(false)

  const [modalEncerramentoAberto, setModalEncerramentoAberto] = useState(false)
  const [motivoEncerramento, setMotivoEncerramento] = useState('')
  const [encerrando, setEncerrando] = useState(false)

  // ── Status da Loja (toggle manual) ──
  const [fechadoManualmente, setFechadoManualmente] = useState(false)
  const [motivoFechamentoManual, setMotivoFechamentoManual] = useState<string | null>(null)
  const [modalFecharAberto, setModalFecharAberto] = useState(false)
  const [motivoFechar, setMotivoFechar] = useState('')
  const [salvandoStatusLoja, setSalvandoStatusLoja] = useState(false)
  const [alertaPedidoSom, setAlertaPedidoSom] = useState<TipoAlertaPedido>('SOM_1')
  const [salvandoAlertaSom, setSalvandoAlertaSom] = useState(false)

  // ── Dados da Empresa ──
  const [loadingEmpresa, setLoadingEmpresa] = useState(true)
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false)
  const [empresaNome, setEmpresaNome] = useState('')
  const [empresaCnpj, setEmpresaCnpj] = useState('')
  const [empresaTelefone, setEmpresaTelefone] = useState('')
  const [empresaEnderecoRua, setEmpresaEnderecoRua] = useState('')
  const [empresaEnderecoNumero, setEmpresaEnderecoNumero] = useState('')
  const [empresaEnderecoBairro, setEmpresaEnderecoBairro] = useState('')
  const [empresaEnderecoCidade, setEmpresaEnderecoCidade] = useState('')
  const [empresaEnderecoComplemento, setEmpresaEnderecoComplemento] = useState('')
  const [empresaSlug, setEmpresaSlug] = useState('')
  const [empresaPlano, setEmpresaPlano] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)

  // ── Cardápio Público: logo + cores ──
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [corPrimaria, setCorPrimaria] = useState(COR_PRIMARIA_PADRAO)
  const [corSecundaria, setCorSecundaria] = useState(COR_SECUNDARIA_PADRAO)
  const [corAccent, setCorAccent] = useState(COR_ACCENT_PADRAO)
  const [corTexto, setCorTexto] = useState(COR_TEXTO_PADRAO)
  const [salvandoLogo, setSalvandoLogo] = useState(false)
  const [removerFundoLogo, setRemoverFundoLogo] = useState(true)
  const [salvandoCores, setSalvandoCores] = useState(false)

  // ── Cardápio Público: imagem de fundo ──
  const [backgroundBase64, setBackgroundBase64] = useState<string | null>(null)
  const [backgroundOpacidade, setBackgroundOpacidade] = useState(15)
  const [salvandoBackground, setSalvandoBackground] = useState(false)
  const [salvandoOpacidade, setSalvandoOpacidade] = useState(false)

  // ── Horário de Funcionamento ──
  const [loadingHorarios, setLoadingHorarios] = useState(true)
  const [salvandoHorarios, setSalvandoHorarios] = useState(false)
  const [horariosPorDia, setHorariosPorDia] = useState<Record<DiaSemana, IntervaloEdit[]>>(diasVazios())

  const carregarPausas = () => {
    pausaApi.listar().then(r => setPausas(r.data)).catch(() => {})
  }

  useEffect(() => {
    configuracaoApi.get()
      .then(r => {
        setPixChave(r.data.pixChave ?? '')
        setComissaoGarcon(String(r.data.comissaoGarcon ?? 0))
        setComissaoEntregador(String(r.data.comissaoEntregador ?? 0))
        setComissaoCozinheiro(String(r.data.comissaoCozinheiro ?? 0))
        setFechadoManualmente(r.data.fechadoManualmente ?? false)
        setMotivoFechamentoManual(r.data.motivoFechamentoManual ?? null)
        setAlertaPedidoSom((r.data.alertaPedidoSom as TipoAlertaPedido) || 'SOM_1')
        setTaxaDebito(String(r.data.taxaDebito ?? 0))
        setTaxaCreditoVista(String(r.data.taxaCreditoVista ?? 0))
        setTaxaCreditoParcelado(String(r.data.taxaCreditoParcelado ?? 0))
      })
      .finally(() => setLoading(false))
    carregarPausas()

    restauranteApi.buscarDados()
      .then(r => {
        setEmpresaNome(r.data.nome ?? '')
        setEmpresaCnpj(r.data.cnpj ?? '')
        setEmpresaTelefone(r.data.telefone ?? '')
        setEmpresaEnderecoRua(r.data.enderecoRua ?? '')
        setEmpresaEnderecoNumero(r.data.enderecoNumero ?? '')
        setEmpresaEnderecoBairro(r.data.enderecoBairro ?? '')
        setEmpresaEnderecoCidade(r.data.enderecoCidade ?? '')
        setEmpresaEnderecoComplemento(r.data.enderecoComplemento ?? '')
        setEmpresaSlug(r.data.slug ?? '')
        setEmpresaPlano(r.data.plano ?? '')
        setLogoBase64(r.data.logoBase64 ?? null)
        setCorPrimaria(r.data.corPrimaria || COR_PRIMARIA_PADRAO)
        setCorSecundaria(r.data.corSecundaria || COR_SECUNDARIA_PADRAO)
        setCorAccent(r.data.corAccent || COR_ACCENT_PADRAO)
        setCorTexto(r.data.corTexto || COR_TEXTO_PADRAO)
        setBackgroundBase64(r.data.backgroundBase64 ?? null)
        setBackgroundOpacidade(r.data.backgroundOpacidade ?? 15)
      })
      .catch(() => {})
      .finally(() => setLoadingEmpresa(false))

    horarioApi.listar()
      .then(r => {
        const agrupado = diasVazios()
        r.data.forEach((h: HorarioFuncionamento) => {
          agrupado[h.diaSemana].push({
            horaAbertura: horaCurta(h.horaAbertura),
            horaFechamento: horaCurta(h.horaFechamento),
          })
        })
        setHorariosPorDia(agrupado)
      })
      .catch(() => {})
      .finally(() => setLoadingHorarios(false))
  }, [])

  const handleAgendarPausa = async () => {
    if (!pausaTitulo.trim() || !pausaInicio || !pausaFim) return
    setSalvandoPausa(true)
    try {
      await pausaApi.criar({
        titulo: pausaTitulo.trim(),
        inicio: new Date(pausaInicio).toISOString(),
        fim: new Date(pausaFim).toISOString(),
      })
      toast.success('Pausa agendada com sucesso')
      setPausaTitulo('')
      setPausaInicio('')
      setPausaFim('')
      carregarPausas()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao agendar pausa')
    } finally {
      setSalvandoPausa(false)
    }
  }

  const handleEncerrarAgora = async () => {
    if (!motivoEncerramento.trim()) return
    setEncerrando(true)
    try {
      await pausaApi.criarEncerramentoAntecipado({ motivo: motivoEncerramento.trim() })
      toast.success('Atendimento encerrado para hoje')
      setModalEncerramentoAberto(false)
      setMotivoEncerramento('')
      carregarPausas()
    } catch {
      toast.error('Erro ao encerrar atendimento')
    } finally {
      setEncerrando(false)
    }
  }

  const handleCancelarPausa = async () => {
    if (!confirmCancelarPausa) return
    setCancelandoPausa(true)
    try {
      await pausaApi.cancelar(confirmCancelarPausa.id)
      setConfirmCancelarPausa(null)
      carregarPausas()
    } catch {
      toast.error('Erro ao cancelar pausa')
    } finally {
      setCancelandoPausa(false)
    }
  }

  const handleSalvarPix = async () => {
    setSalvandoPix(true)
    setPixSalvo(false)
    try {
      await configuracaoApi.atualizarPix(pixChave)
      setPixSalvo(true)
      setTimeout(() => setPixSalvo(false), 3000)
    } catch {
      toast.error('Erro ao salvar a chave PIX')
    } finally {
      setSalvandoPix(false)
    }
  }

  const handleSalvarComissoes = async () => {
    setSalvandoComissoes(true)
    setComissoesSalvas(false)
    try {
      await configuracaoApi.atualizarComissoes({
        comissaoGarcon: Number(comissaoGarcon),
        comissaoEntregador: Number(comissaoEntregador),
        comissaoCozinheiro: Number(comissaoCozinheiro),
      })
      setComissoesSalvas(true)
      setTimeout(() => setComissoesSalvas(false), 3000)
    } catch {
      toast.error('Erro ao salvar as comissões')
    } finally {
      setSalvandoComissoes(false)
    }
  }

  const handleSalvarTaxas = async () => {
    setSalvandoTaxas(true)
    setTaxasSalvas(false)
    try {
      await configuracaoApi.atualizarTaxasMaquininha({
        taxaDebito: Number(taxaDebito),
        taxaCreditoVista: Number(taxaCreditoVista),
        taxaCreditoParcelado: Number(taxaCreditoParcelado),
      })
      setTaxasSalvas(true)
      setTimeout(() => setTaxasSalvas(false), 3000)
    } catch {
      toast.error('Erro ao salvar as taxas da maquininha')
    } finally {
      setSalvandoTaxas(false)
    }
  }

  // ── Status da Loja ──
  const handleToggleLoja = (aberta: boolean) => {
    if (aberta) {
      handleReabrirLoja()
    } else {
      setMotivoFechar('')
      setModalFecharAberto(true)
    }
  }

  const handleTestarAlertaSom = (tipo: TipoAlertaPedido) => {
    playAlertaPedidoCliente(tipo)
  }

  const handleSalvarAlertaSom = async (tipo: TipoAlertaPedido) => {
    const anterior = alertaPedidoSom
    setAlertaPedidoSom(tipo)
    setSalvandoAlertaSom(true)
    try {
      await configuracaoApi.atualizarAlertaPedido(tipo)
      playAlertaPedidoCliente(tipo)
    } catch {
      setAlertaPedidoSom(anterior)
      toast.error('Erro ao salvar o alerta sonoro')
    } finally {
      setSalvandoAlertaSom(false)
    }
  }

  const handleReabrirLoja = async () => {
    setSalvandoStatusLoja(true)
    try {
      const r = await configuracaoApi.atualizarStatusLoja(false)
      setFechadoManualmente(r.data.fechadoManualmente ?? false)
      setMotivoFechamentoManual(r.data.motivoFechamentoManual ?? null)
      toast.success('Loja reaberta com sucesso')
    } catch {
      toast.error('Erro ao reabrir a loja')
    } finally {
      setSalvandoStatusLoja(false)
    }
  }

  const handleConfirmarFecharLoja = async () => {
    setSalvandoStatusLoja(true)
    try {
      const r = await configuracaoApi.atualizarStatusLoja(true, motivoFechar.trim() || undefined)
      setFechadoManualmente(r.data.fechadoManualmente ?? true)
      setMotivoFechamentoManual(r.data.motivoFechamentoManual ?? null)
      toast.success('Loja fechada com sucesso')
      setModalFecharAberto(false)
      setMotivoFechar('')
    } catch {
      toast.error('Erro ao fechar a loja')
    } finally {
      setSalvandoStatusLoja(false)
    }
  }

  // ── Dados da Empresa ──
  const handleSalvarEmpresa = async () => {
    if (!empresaNome.trim()) return
    setSalvandoEmpresa(true)
    try {
      // Envia string vazia (não `undefined`) quando o campo foi limpo — `undefined` some do
      // JSON e o backend interpreta "campo ausente" como "não alterar", impedindo limpar o campo.
      const r = await restauranteApi.atualizarDados({
        nome: empresaNome.trim(),
        slug: empresaSlug.trim() || undefined,
        cnpj: empresaCnpj.trim(),
        telefone: empresaTelefone.trim(),
        enderecoRua: empresaEnderecoRua.trim(),
        enderecoNumero: empresaEnderecoNumero.trim(),
        enderecoBairro: empresaEnderecoBairro.trim(),
        enderecoCidade: empresaEnderecoCidade.trim(),
        enderecoComplemento: empresaEnderecoComplemento.trim(),
      })
      setEmpresaNome(r.data.nome ?? '')
      setEmpresaSlug(r.data.slug ?? '')
      setEmpresaCnpj(r.data.cnpj ?? '')
      setEmpresaTelefone(r.data.telefone ?? '')
      setEmpresaEnderecoRua(r.data.enderecoRua ?? '')
      setEmpresaEnderecoNumero(r.data.enderecoNumero ?? '')
      setEmpresaEnderecoBairro(r.data.enderecoBairro ?? '')
      setEmpresaEnderecoCidade(r.data.enderecoCidade ?? '')
      setEmpresaEnderecoComplemento(r.data.enderecoComplemento ?? '')
      toast.success('Dados da empresa salvos com sucesso')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao salvar dados da empresa')
    } finally {
      setSalvandoEmpresa(false)
    }
  }

  // ── Cardápio Público: logo + cores ──
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Imagem muito grande. Envie um arquivo de até 1,5MB.')
      return
    }
    setSalvandoLogo(true)
    try {
      const dataUri = removerFundoLogo ? await removerFundoBranco(file) : await lerComoDataUri(file)
      const r = await restauranteApi.atualizarLogo(dataUri)
      setLogoBase64(r.data.logoBase64 ?? null)
      toast.success('Logo atualizada com sucesso')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao enviar a logo')
    } finally {
      setSalvandoLogo(false)
    }
  }

  const handleRemoverLogo = async () => {
    setSalvandoLogo(true)
    try {
      const r = await restauranteApi.atualizarLogo(null)
      setLogoBase64(r.data.logoBase64 ?? null)
      toast.success('Logo removida')
    } catch {
      toast.error('Erro ao remover a logo')
    } finally {
      setSalvandoLogo(false)
    }
  }

  const handleSalvarCores = async () => {
    setSalvandoCores(true)
    try {
      const r = await restauranteApi.atualizarCores({
        corPrimaria,
        corSecundaria,
        corAccent,
        corTexto,
      })
      setCorPrimaria(r.data.corPrimaria || COR_PRIMARIA_PADRAO)
      setCorSecundaria(r.data.corSecundaria || COR_SECUNDARIA_PADRAO)
      setCorAccent(r.data.corAccent || COR_ACCENT_PADRAO)
      setCorTexto(r.data.corTexto || COR_TEXTO_PADRAO)
      toast.success('Cores salvas com sucesso')
    } catch {
      toast.error('Erro ao salvar as cores')
    } finally {
      setSalvandoCores(false)
    }
  }

  const handleRestaurarCoresPadrao = () => {
    setCorPrimaria(COR_PRIMARIA_PADRAO)
    setCorSecundaria(COR_SECUNDARIA_PADRAO)
    setCorAccent(COR_ACCENT_PADRAO)
    setCorTexto(COR_TEXTO_PADRAO)
  }

  // ── Cardápio Público: imagem de fundo ──
  const handleUploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Imagem muito grande. Envie um arquivo de até 1,5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUri = reader.result as string
      setSalvandoBackground(true)
      try {
        const r = await restauranteApi.atualizarBackground(dataUri)
        setBackgroundBase64(r.data.backgroundBase64 ?? null)
        setBackgroundOpacidade(r.data.backgroundOpacidade ?? 15)
        toast.success('Imagem de fundo atualizada com sucesso')
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        toast.error(msg ?? 'Erro ao enviar a imagem de fundo')
      } finally {
        setSalvandoBackground(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoverBackground = async () => {
    setSalvandoBackground(true)
    try {
      const r = await restauranteApi.atualizarBackground(null)
      setBackgroundBase64(r.data.backgroundBase64 ?? null)
      toast.success('Imagem de fundo removida')
    } catch {
      toast.error('Erro ao remover a imagem de fundo')
    } finally {
      setSalvandoBackground(false)
    }
  }

  const handleSalvarOpacidade = async (valor: number) => {
    setBackgroundOpacidade(valor)
    setSalvandoOpacidade(true)
    try {
      const r = await restauranteApi.atualizarBackground(backgroundBase64, valor)
      setBackgroundOpacidade(r.data.backgroundOpacidade ?? valor)
    } catch {
      toast.error('Erro ao salvar a opacidade')
    } finally {
      setSalvandoOpacidade(false)
    }
  }

  // ── Horário de Funcionamento ──
  const handleAdicionarIntervalo = (dia: DiaSemana) => {
    setHorariosPorDia(prev => ({
      ...prev,
      [dia]: [...prev[dia], { horaAbertura: '', horaFechamento: '' }],
    }))
  }

  const handleRemoverIntervalo = (dia: DiaSemana, idx: number) => {
    setHorariosPorDia(prev => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== idx),
    }))
  }

  const handleAlterarIntervalo = (dia: DiaSemana, idx: number, campo: keyof IntervaloEdit, valor: string) => {
    setHorariosPorDia(prev => ({
      ...prev,
      [dia]: prev[dia].map((iv, i) => i === idx ? { ...iv, [campo]: valor } : iv),
    }))
  }

  const handleSalvarHorarios = async () => {
    setSalvandoHorarios(true)
    try {
      const lista: HorarioFuncionamento[] = DIAS_SEMANA.flatMap(({ value }) =>
        horariosPorDia[value]
          .filter(iv => iv.horaAbertura && iv.horaFechamento)
          .map(iv => ({ diaSemana: value, horaAbertura: iv.horaAbertura, horaFechamento: iv.horaFechamento }))
      )
      const r = await horarioApi.salvarSemana(lista)
      const agrupado = diasVazios()
      r.data.forEach((h: HorarioFuncionamento) => {
        agrupado[h.diaSemana].push({
          horaAbertura: horaCurta(h.horaAbertura),
          horaFechamento: horaCurta(h.horaFechamento),
        })
      })
      setHorariosPorDia(agrupado)
      toast.success('Horários salvos com sucesso')
    } catch {
      toast.error('Erro ao salvar horários')
    } finally {
      setSalvandoHorarios(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--color-text-secondary)' }}>Carregando...</p>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configurações</h1>

      <Tabs tabs={abasPermitidas} activeTab={aba} onChange={id => setAba(id as AbaConfiguracao)} />

      {aba === 'geral' && (
      <>
      {/* ── Status da Loja ── */}
      {temPermissao('CONFIG_STATUS_LOJA') && (
      <div className={styles.statusSection}>
        <h2 className={styles.pausasTitle}>Status da Loja</h2>
        {fechadoManualmente && (
          <div className={styles.statusBanner}>
            Loja fechada manualmente
            {motivoFechamentoManual ? ` — motivo: ${motivoFechamentoManual}` : ''}
          </div>
        )}
        <div className={styles.statusRow}>
          <Switch
            checked={!fechadoManualmente}
            onChange={handleToggleLoja}
            disabled={salvandoStatusLoja}
            label={fechadoManualmente ? 'Loja fechada' : 'Loja aberta'}
          />
          <p className={styles.hint}>
            Fechar manualmente a loja impede novos pedidos até que você a reabra, independente do
            horário de funcionamento configurado.
          </p>
        </div>
      </div>
      )}

      {/* ── Alerta sonoro de novo pedido ── */}
      {temPermissao('CONFIG_ALERTA_PEDIDO') && (
      <div className={styles.statusSection}>
        <h2 className={styles.pausasTitle}>Alerta de Novo Pedido</h2>
        <p className={styles.hint}>
          Som tocado (em loop) quando um pedido de cliente (WhatsApp/cardápio) chega aguardando
          aceite ou rejeição.
        </p>
        <div className={styles.alertaSomOpcoes}>
          {OPCOES_ALERTA_PEDIDO.map(op => (
            <label key={op.valor} className={styles.alertaSomOpcao}>
              <input
                type="radio"
                name="alertaPedidoSom"
                checked={alertaPedidoSom === op.valor}
                onChange={() => handleSalvarAlertaSom(op.valor)}
                disabled={salvandoAlertaSom}
              />
              <span>{op.label}</span>
              <button
                type="button"
                className={styles.btnTestarSom}
                onClick={() => handleTestarAlertaSom(op.valor)}
              >
                ▶ Testar
              </button>
            </label>
          ))}
        </div>
      </div>
      )}

      {/* ── Dados da Empresa ── */}
      {temPermissao('CONFIG_DADOS_EMPRESA') && (
      <div className={styles.empresaSection}>
        <h2 className={styles.pausasTitle}>Dados da Empresa</h2>
        {loadingEmpresa ? (
          <p className={styles.hint}>Carregando...</p>
        ) : (
          <>
            <div className={styles.empresaReadonly}>
              <span><strong>Plano:</strong> {empresaPlano || '—'}</span>
            </div>

            <div className={styles.fieldRow}>
              <div className={`${styles.field} ${styles.fieldFlex2}`}>
                <Input label="Nome" value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} placeholder="Nome do restaurante" />
              </div>
              <div className={styles.field}>
                <Input label="CNPJ" value={empresaCnpj} onChange={e => setEmpresaCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className={styles.field}>
                <Input label="Telefone" value={empresaTelefone} onChange={e => setEmpresaTelefone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={`${styles.field} ${styles.fieldFlex2}`}>
                <Input label="Rua" value={empresaEnderecoRua} onChange={e => setEmpresaEnderecoRua(e.target.value)} placeholder="Nome da rua" />
              </div>
              <div className={styles.field}>
                <Input label="Número" value={empresaEnderecoNumero} onChange={e => setEmpresaEnderecoNumero(e.target.value)} placeholder="Nº" />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <Input label="Bairro" value={empresaEnderecoBairro} onChange={e => setEmpresaEnderecoBairro(e.target.value)} placeholder="Bairro" />
              </div>
              <div className={styles.field}>
                <Input label="Cidade" value={empresaEnderecoCidade} onChange={e => setEmpresaEnderecoCidade(e.target.value)} placeholder="Cidade" />
              </div>
              <div className={styles.field}>
                <Input label="Complemento" value={empresaEnderecoComplemento} onChange={e => setEmpresaEnderecoComplemento(e.target.value)} placeholder="Apto, bloco..." />
              </div>
            </div>

            <div className={styles.actions}>
              <Button loading={salvandoEmpresa} onClick={handleSalvarEmpresa} disabled={!empresaNome.trim()}>
                Salvar Dados da Empresa
              </Button>
            </div>
          </>
        )}
      </div>
      )}
      </>
      )}

      {aba === 'pagamento' && (
      <div className={styles.form}>
        {temPermissao('CONFIG_PIX') && (
        <div className={styles.group}>
          <label className={styles.label}>Chave PIX do Restaurante</label>
          <span className={styles.hint}>Chave exibida ao cliente para pagamento via PIX (CPF, CNPJ, e-mail, celular ou chave aleatória)</span>
          <input
            className={styles.input}
            type="text"
            value={pixChave}
            onChange={e => setPixChave(e.target.value)}
            placeholder="ex: 12345678000195"
          />
          <div className={styles.actions}>
            <Button loading={salvandoPix} onClick={handleSalvarPix}>Salvar Chave PIX</Button>
            {pixSalvo && <span className={styles.success}>Salvo com sucesso!</span>}
          </div>
        </div>
        )}

        {temPermissao('CONFIG_COMISSOES') && (
        <div className={styles.group}>
          <label className={styles.label}>Comissões por Role (%)</label>
          <div className={styles.comissoesGrid}>
            <div className={styles.comissaoItem}>
              <label className={styles.hint}>Garçom</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={comissaoGarcon}
                onChange={e => setComissaoGarcon(e.target.value)}
              />
            </div>
            <div className={styles.comissaoItem}>
              <label className={styles.hint}>Entregador</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={comissaoEntregador}
                onChange={e => setComissaoEntregador(e.target.value)}
              />
            </div>
            <div className={styles.comissaoItem}>
              <label className={styles.hint}>Cozinheiro</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={comissaoCozinheiro}
                onChange={e => setComissaoCozinheiro(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.actions}>
            <Button loading={salvandoComissoes} onClick={handleSalvarComissoes}>Salvar Comissões</Button>
            {comissoesSalvas && <span className={styles.success}>Salvo com sucesso!</span>}
          </div>
        </div>
        )}
      </div>
      )}

      {aba === 'maquininha' && (
      <div className={styles.form}>
        <div className={styles.group}>
          <label className={styles.label}>Taxas da Maquininha</label>
          <span className={styles.hint}>
            Percentual cobrado pela operadora de cartão em cada forma de pagamento — usado só como
            referência no caixa (não altera o valor cobrado do cliente).
          </span>
          <div className={styles.comissoesGrid}>
            <div className={styles.comissaoItem}>
              <label className={styles.hint}>Débito</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxaDebito}
                onChange={e => setTaxaDebito(e.target.value)}
              />
            </div>
            <div className={styles.comissaoItem}>
              <label className={styles.hint}>Crédito à vista</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxaCreditoVista}
                onChange={e => setTaxaCreditoVista(e.target.value)}
              />
            </div>
            <div className={styles.comissaoItem}>
              <label className={styles.hint}>Crédito parcelado</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxaCreditoParcelado}
                onChange={e => setTaxaCreditoParcelado(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button loading={salvandoTaxas} onClick={handleSalvarTaxas}>Salvar Taxas</Button>
          {taxasSalvas && <span className={styles.success}>Salvo com sucesso!</span>}
        </div>
      </div>
      )}

      {aba === 'cardapio-publico' && (
      <>
      {/* ── Link público ── */}
      {temPermissao('CONFIG_DADOS_EMPRESA') && (
      <div className={styles.empresaSection}>
        <h2 className={styles.pausasTitle}>Link do Cardápio</h2>
        <div className={styles.linkCardapioBox}>
          <label className={styles.label}>Link público do cardápio</label>
          <div className={styles.linkCardapioRow}>
            <Input
              value={empresaSlug}
              onChange={e => setEmpresaSlug(e.target.value)}
              placeholder="nome-do-seu-restaurante"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/cardapio/${empresaSlug}`)
                setLinkCopiado(true)
                setTimeout(() => setLinkCopiado(false), 2000)
              }}
              disabled={!empresaSlug}
            >
              {linkCopiado ? 'Copiado!' : 'Copiar link'}
            </Button>
          </div>
          {empresaSlug ? (
            <a
              href={`${window.location.origin}/cardapio/${empresaSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.hint}
            >
              {window.location.origin}/cardapio/{empresaSlug}
            </a>
          ) : (
            <span className={styles.hint}>{window.location.origin}/cardapio/...</span>
          )}
          <span className={styles.hint}>
            Só letras, números e hífens. Ao mudar, o link antigo para de funcionar — avise seus clientes.
          </span>
          <span className={styles.hint}>
            O link é atualizado automaticamente sempre que o nome do restaurante muda (em "Geral" → Dados da Empresa).
          </span>
          {empresaSlug && (
            <QrCodeLink value={`${window.location.origin}/cardapio/${empresaSlug}`} fileName={`qrcode-${empresaSlug}.png`} />
          )}
        </div>
        <div className={styles.actions}>
          <Button loading={salvandoEmpresa} onClick={handleSalvarEmpresa} disabled={!empresaNome.trim()}>
            Salvar Link
          </Button>
        </div>
      </div>
      )}

      {/* ── Logo do restaurante ── */}
      {temPermissao('CONFIG_LOGO') && (
      <div className={styles.empresaSection}>
        <h2 className={styles.pausasTitle}>Logo do Restaurante</h2>
        <p className={styles.hint}>
          Aparece no topo do cardápio público no lugar da logo padrão. Envie uma imagem PNG, JPG ou WEBP de até 1,5MB.
        </p>
        <div className={styles.logoBox}>
          <div className={styles.logoPreview}>
            {logoBase64
              ? <img src={logoBase64} alt="Logo do restaurante" className={styles.logoImg} />
              : <span className={styles.hint}>Nenhuma logo enviada — usando a logo padrão</span>}
          </div>
          <div className={styles.logoActions}>
            <label className={styles.btnUploadLogo}>
              {salvandoLogo ? 'Enviando...' : 'Enviar logo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadLogo}
                disabled={salvandoLogo}
                hidden
              />
            </label>
            {logoBase64 && (
              <Button variant="ghost" onClick={handleRemoverLogo} disabled={salvandoLogo}>
                Remover logo
              </Button>
            )}
          </div>
          <label className={styles.checkboxLine}>
            <input
              type="checkbox"
              checked={removerFundoLogo}
              onChange={e => setRemoverFundoLogo(e.target.checked)}
              disabled={salvandoLogo}
            />
            Remover fundo branco automaticamente ao enviar
          </label>
        </div>
      </div>
      )}

      {/* ── Cores do cardápio público ── */}
      {temPermissao('CONFIG_CORES') && (
      <div className={styles.empresaSection}>
        <h2 className={styles.pausasTitle}>Cores do Cardápio</h2>
        <p className={styles.hint}>
          Se a logo do restaurante tiver cores parecidas com as do cabeçalho, ela pode "sumir" contra o
          fundo — ajuste as cores abaixo para dar contraste.
        </p>

        <div
          className={styles.corPreviewHeader}
          style={{ background: `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`, borderBottomColor: corAccent, color: corTexto }}
        >
          {logoBase64
            ? <img src={logoBase64} alt="Prévia da logo" className={styles.corPreviewLogo} />
            : <span className={styles.corPreviewLogoPlaceholder}>Logo</span>}
          <span className={styles.corPreviewNome}>{empresaNome || 'Nome do Restaurante'}</span>
        </div>

        <div className={styles.coresGrid}>
          <div className={styles.corItem}>
            <label className={styles.hint}>Cor primária</label>
            <input type="color" className={styles.corInput} value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)} />
          </div>
          <div className={styles.corItem}>
            <label className={styles.hint}>Cor secundária</label>
            <input type="color" className={styles.corInput} value={corSecundaria} onChange={e => setCorSecundaria(e.target.value)} />
          </div>
          <div className={styles.corItem}>
            <label className={styles.hint}>Cor de destaque</label>
            <input type="color" className={styles.corInput} value={corAccent} onChange={e => setCorAccent(e.target.value)} />
          </div>
          <div className={styles.corItem}>
            <label className={styles.hint}>Cor do texto do título</label>
            <input type="color" className={styles.corInput} value={corTexto} onChange={e => setCorTexto(e.target.value)} />
          </div>
        </div>

        <div className={styles.actions}>
          <Button loading={salvandoCores} onClick={handleSalvarCores}>
            Salvar Cores
          </Button>
          <Button variant="ghost" onClick={handleRestaurarCoresPadrao} disabled={salvandoCores}>
            Restaurar padrão
          </Button>
        </div>
      </div>
      )}

      {/* ── Imagem de fundo ── */}
      {temPermissao('CONFIG_BACKGROUND') && (
      <div className={styles.empresaSection}>
        <h2 className={styles.pausasTitle}>Imagem de Fundo</h2>
        <p className={styles.hint}>
          Aparece atrás do conteúdo do cardápio público, com opacidade ajustável — o texto continua 100% legível.
        </p>
        <div className={styles.logoBox}>
          <div
            className={styles.backgroundPreview}
            style={backgroundBase64 ? { backgroundImage: `url(${backgroundBase64})`, backgroundColor: undefined } : {}}
          >
            {backgroundBase64 && (
              <div className={styles.backgroundPreviewOverlay} style={{ opacity: 1 - backgroundOpacidade / 100 }} />
            )}
            {!backgroundBase64 && <span className={styles.hint}>Nenhuma imagem de fundo enviada</span>}
          </div>
          <div className={styles.logoActions}>
            <label className={styles.btnUploadLogo}>
              {salvandoBackground ? 'Enviando...' : 'Enviar imagem'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadBackground}
                disabled={salvandoBackground}
                hidden
              />
            </label>
            {backgroundBase64 && (
              <Button variant="ghost" onClick={handleRemoverBackground} disabled={salvandoBackground}>
                Remover imagem
              </Button>
            )}
          </div>
        </div>

        {backgroundBase64 && (
          <div className={styles.opacidadeRow}>
            <label className={styles.hint}>Opacidade: {backgroundOpacidade}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={backgroundOpacidade}
              onChange={e => setBackgroundOpacidade(Number(e.target.value))}
              onMouseUp={e => handleSalvarOpacidade(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={e => handleSalvarOpacidade(Number((e.target as HTMLInputElement).value))}
              disabled={salvandoOpacidade}
              className={styles.opacidadeSlider}
            />
          </div>
        )}
      </div>
      )}
      </>
      )}

      {aba === 'horarios' && (
      <div className={styles.horariosSection}>
        <h2 className={styles.pausasTitle}>Horário de Funcionamento</h2>
        <p className={styles.hint}>
          Configure os intervalos de funcionamento de cada dia da semana. É possível adicionar mais de
          um intervalo por dia (ex: almoço e jantar). Dias sem nenhum intervalo ficam fechados.
        </p>

        {loadingHorarios ? (
          <p className={styles.hint}>Carregando...</p>
        ) : (
          <>
            <div className={styles.diasList}>
              {DIAS_SEMANA.map(({ value, label }) => {
                const intervalos = horariosPorDia[value]
                return (
                  <div key={value} className={styles.diaRow}>
                    <div className={styles.diaNome}>
                      {label}
                      {intervalos.length === 0 && <span className={styles.diaFechado}>Fechado</span>}
                    </div>
                    <div className={styles.diaIntervalos}>
                      {intervalos.map((iv, idx) => (
                        <div key={idx} className={styles.intervaloItem}>
                          <input
                            type="time"
                            className={styles.timeInput}
                            value={iv.horaAbertura}
                            onChange={e => handleAlterarIntervalo(value, idx, 'horaAbertura', e.target.value)}
                          />
                          <span className={styles.intervaloAte}>até</span>
                          <input
                            type="time"
                            className={styles.timeInput}
                            value={iv.horaFechamento}
                            onChange={e => handleAlterarIntervalo(value, idx, 'horaFechamento', e.target.value)}
                          />
                          <button
                            type="button"
                            className={styles.btnRemoverIntervalo}
                            onClick={() => handleRemoverIntervalo(value, idx)}
                            title="Remover intervalo"
                          >
                            <FiX size={15} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.btnAdicionarIntervalo}
                        onClick={() => handleAdicionarIntervalo(value)}
                      >
                        <FiPlus size={13} /> Adicionar intervalo
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.actions}>
              <Button loading={salvandoHorarios} onClick={handleSalvarHorarios}>
                Salvar Horários
              </Button>
            </div>
          </>
        )}
      </div>
      )}

      {aba === 'pausas' && (
      <div className={styles.pausasSection}>
        <h2 className={styles.pausasTitle}>Pausas de Funcionamento</h2>
        <p className={styles.hint}>
          Agende períodos em que o restaurante fica fechado (folga, manutenção, feriado) ou encerre o
          atendimento de hoje antecipadamente.
        </p>

        <div className={styles.pausaForm}>
          <Input
            label="Título"
            value={pausaTitulo}
            onChange={e => setPausaTitulo(e.target.value)}
            placeholder="Ex: Folga de domingo"
          />
          <Input
            label="Início"
            type="datetime-local"
            value={pausaInicio}
            onChange={e => setPausaInicio(e.target.value)}
          />
          <Input
            label="Fim"
            type="datetime-local"
            value={pausaFim}
            onChange={e => setPausaFim(e.target.value)}
          />
          <Button
            loading={salvandoPausa}
            onClick={handleAgendarPausa}
            disabled={!pausaTitulo.trim() || !pausaInicio || !pausaFim}
          >
            Agendar Pausa
          </Button>
        </div>

        <div className={styles.encerramentoBox}>
          <div>
            <p className={styles.encerramentoLabel}>Precisa fechar agora?</p>
            <p className={styles.hint}>Encerra o atendimento pelo resto do dia de hoje.</p>
          </div>
          <Button variant="danger" onClick={() => setModalEncerramentoAberto(true)}>
            Encerrar atendimento agora
          </Button>
        </div>

        <h3 className={styles.pausasListTitle}>Pausas agendadas</h3>
        {pausas.length === 0 ? (
          <p className={styles.empty}>Nenhuma pausa agendada.</p>
        ) : (
          <div className={styles.pausasList}>
            {pausas.map(p => (
              <div key={p.id} className={styles.pausaItem}>
                <div>
                  <div className={styles.pausaItemTitulo}>
                    {p.tipo === 'ENCERRAMENTO_ANTECIPADO' ? 'Encerramento antecipado' : (p.titulo || 'Pausa')}
                  </div>
                  <div className={styles.pausaItemPeriodo}>
                    {formatDataHora(p.inicio)} até {formatDataHora(p.fim)}
                  </div>
                  {p.motivo && <div className={styles.pausaItemMotivo}>{p.motivo}</div>}
                </div>
                <button
                  className={styles.btnCancelarPausa}
                  onClick={() => setConfirmCancelarPausa(p)}
                  title="Cancelar pausa"
                >
                  <FiTrash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <Modal
        isOpen={modalEncerramentoAberto}
        onClose={() => setModalEncerramentoAberto(false)}
        title="Encerrar atendimento agora"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalEncerramentoAberto(false)} disabled={encerrando}>
              Cancelar
            </Button>
            <Button variant="danger" loading={encerrando} onClick={handleEncerrarAgora} disabled={!motivoEncerramento.trim()}>
              Encerrar Atendimento
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo"
          value={motivoEncerramento}
          onChange={e => setMotivoEncerramento(e.target.value)}
          placeholder="Ex: Imprevisto na cozinha, encerramos por hoje"
          rows={3}
        />
      </Modal>

      <Modal
        isOpen={modalFecharAberto}
        onClose={() => setModalFecharAberto(false)}
        title="Fechar loja manualmente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalFecharAberto(false)} disabled={salvandoStatusLoja}>
              Cancelar
            </Button>
            <Button variant="danger" loading={salvandoStatusLoja} onClick={handleConfirmarFecharLoja}>
              Fechar Loja
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo (opcional)"
          value={motivoFechar}
          onChange={e => setMotivoFechar(e.target.value)}
          placeholder="Ex: Sistema de pedidos indisponível temporariamente"
          rows={3}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmCancelarPausa}
        title="Cancelar pausa"
        message="Deseja cancelar esta pausa agendada?"
        confirmLabel="Cancelar Pausa"
        danger
        loading={cancelandoPausa}
        onConfirm={handleCancelarPausa}
        onCancel={() => setConfirmCancelarPausa(null)}
      />
    </div>
  )
}
