import { useEffect, useRef, useState } from 'react'
import { ifoodApi, type IfoodStatus, type IfoodVinculoIniciar, type IfoodVinculoStatusValor, type IfoodCatalogoSync } from '../../api/ifoodApi'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../contexts/ToastContext'
import styles from './AdminIfood.module.css'

function formatarData(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AdminIfood() {
  const [status, setStatus] = useState<IfoodStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [vinculando, setVinculando] = useState(false)
  const [vinculo, setVinculo] = useState<IfoodVinculoIniciar | null>(null)
  const [vinculoStatus, setVinculoStatus] = useState<IfoodVinculoStatusValor | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSync, setUltimaSync] = useState<IfoodCatalogoSync | null>(null)
  const [confirmDesconectar, setConfirmDesconectar] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toast = useToast()

  const carregarStatus = async () => {
    try {
      const r = await ifoodApi.status()
      setStatus(r.data)
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    carregarStatus()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const pararPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
  }

  const handleConectar = async () => {
    setVinculando(true)
    setVinculoStatus(null)
    try {
      const r = await ifoodApi.vincular()
      setVinculo(r.data)
      pollRef.current = setInterval(async () => {
        try {
          const s = await ifoodApi.vincularStatus()
          setVinculoStatus(s.data.status)
          if (s.data.status === 'CONECTADO') {
            pararPoll()
            setVinculo(null)
            toast.success('Loja conectada ao iFood')
            carregarStatus()
          } else if (s.data.status === 'EXPIRADO') {
            pararPoll()
            toast.error('O código expirou — tente conectar de novo')
          }
        } catch {
          // ignora falhas isoladas do poll, tenta de novo no próximo tick
        }
      }, 4000)
    } catch {
      toast.error('Erro ao iniciar o vínculo com o iFood')
    } finally {
      setVinculando(false)
    }
  }

  const cancelarVinculo = () => {
    pararPoll()
    setVinculo(null)
    setVinculoStatus(null)
  }

  const handleDesconectar = async () => {
    try {
      await ifoodApi.desconectar()
      setConfirmDesconectar(false)
      await carregarStatus()
      toast.success('Loja desconectada do iFood')
    } catch {
      toast.error('Erro ao desconectar')
    }
  }

  const handleSincronizar = async () => {
    setSincronizando(true)
    try {
      const r = await ifoodApi.sincronizarCatalogo()
      setUltimaSync(r.data)
      setStatus(s => s ? { ...s, catalogoSincronizadoEm: r.data.sincronizadoEm } : s)
      toast.success(`Cardápio sincronizado: ${r.data.itensSincronizados} itens`)
    } catch {
      toast.error('Erro ao sincronizar o cardápio com o iFood')
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>iFood</h1>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Conexão</h2>

        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Status:</span>
          {loadingStatus
            ? <Badge variant="default" size="md">Verificando...</Badge>
            : <Badge variant={status?.conectado ? 'success' : 'default'} size="md">
                {status?.conectado ? 'Conectado' : 'Não conectado'}
              </Badge>}
        </div>

        {status?.conectado && (
          <>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Loja:</span>
              <span>{status.merchantNome ?? status.merchantId}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Conectado em:</span>
              <span>{formatarData(status.conectadoEm)}</span>
            </div>
          </>
        )}

        {!status?.conectado && vinculo && (
          <div className={styles.vinculoBox}>
            <p className={styles.vinculoInstrucao}>
              Clique no link abaixo — ele abre o site do <strong>próprio iFood</strong>, não este sistema.
              Faça login lá com o e-mail e senha da sua conta de Parceiro iFood (não tem relação com o login
              daqui) e informe o código abaixo quando for pedido, pra autorizar esta aplicação a acessar sua loja:
            </p>
            <div className={styles.vinculoCodigo}>{vinculo.userCode}</div>
            <a
              className={styles.vinculoLink}
              href={vinculo.verificationUrlComplete || vinculo.verificationUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir painel do iFood
            </a>
            <p className={styles.vinculoInstrucao}>
              Sua senha do iFood nunca passa por aqui — você digita ela só no site deles. Depois que você
              autorizar lá, esta tela detecta automaticamente e conclui a conexão.
            </p>
            <p className={styles.vinculoPolling}>
              {vinculoStatus === 'EXPIRADO'
                ? 'Código expirado — clique em "Conectar ao iFood" pra gerar um novo.'
                : 'Verificando automaticamente a cada 4 segundos...'}
            </p>
            <button className={styles.btnCancelar} onClick={cancelarVinculo}>Cancelar</button>
          </div>
        )}

        <div className={styles.actions}>
          {!status?.conectado && !vinculo && (
            <Button loading={vinculando} onClick={handleConectar}>Conectar ao iFood</Button>
          )}
          {status?.conectado && (
            <Button variant="danger" onClick={() => setConfirmDesconectar(true)}>Desconectar</Button>
          )}
        </div>
      </section>

      {status?.conectado && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Cardápio</h2>
          <p className={styles.sectionHint}>
            Envia categorias, produtos e combos ativos pro catálogo do iFood. Roda automaticamente a cada
            30 minutos, ou você pode forçar agora.
          </p>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Última sincronização:</span>
            <span>{formatarData(status.catalogoSincronizadoEm)}</span>
          </div>
          {ultimaSync && (
            <p className={styles.sectionHint}>
              {ultimaSync.categoriasSincronizadas} categorias, {ultimaSync.itensSincronizados} itens enviados
              {ultimaSync.itensPausados > 0 && `, ${ultimaSync.itensPausados} pausados`}.
            </p>
          )}
          <div className={styles.actions}>
            <Button loading={sincronizando} onClick={handleSincronizar} variant="outline">
              Sincronizar cardápio agora
            </Button>
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={confirmDesconectar}
        title="Desconectar iFood"
        message="Desconectar esta loja do iFood? Pedidos novos deixam de ser recebidos até reconectar."
        confirmLabel="Desconectar"
        danger
        onConfirm={handleDesconectar}
        onCancel={() => setConfirmDesconectar(false)}
      />
    </div>
  )
}
