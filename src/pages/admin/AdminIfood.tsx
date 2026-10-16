import { useEffect, useState } from 'react'
import { ifoodApi, type IfoodStatus, type IfoodLojaDisponivel, type IfoodCatalogoSync } from '../../api/ifoodApi'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
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
  const [escolhendoLoja, setEscolhendoLoja] = useState(false)
  const [lojas, setLojas] = useState<IfoodLojaDisponivel[] | null>(null)
  const [lojaEscolhida, setLojaEscolhida] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSync, setUltimaSync] = useState<IfoodCatalogoSync | null>(null)
  const [confirmDesconectar, setConfirmDesconectar] = useState(false)
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
  }, [])

  // Aplicação Centralizada: o dono autoriza a loja pelo Portal do Parceiro
  // do iFood (fora daqui); esta tela só lista as lojas já autorizadas e
  // ainda não vinculadas a nenhum restaurante, pro admin escolher a dele.
  const handleAbrirEscolha = async () => {
    setEscolhendoLoja(true)
    setLojas(null)
    setLojaEscolhida('')
    try {
      const r = await ifoodApi.lojasDisponiveis()
      setLojas(r.data)
    } catch {
      toast.error('Erro ao buscar lojas disponíveis no iFood')
      setEscolhendoLoja(false)
    }
  }

  const cancelarVinculo = () => {
    setEscolhendoLoja(false)
    setLojas(null)
    setLojaEscolhida('')
  }

  const handleVincular = async () => {
    if (!lojaEscolhida) return
    setVinculando(true)
    try {
      await ifoodApi.vincular(lojaEscolhida)
      cancelarVinculo()
      toast.success('Loja conectada ao iFood')
      await carregarStatus()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao conectar a loja')
    } finally {
      setVinculando(false)
    }
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

        {!status?.conectado && escolhendoLoja && (
          <div className={styles.vinculoBox}>
            <p className={styles.vinculoInstrucao}>
              Antes de escolher aqui, a loja precisa já estar autorizada pra esta aplicação no{' '}
              <strong>Portal do Parceiro do iFood</strong> (Integrações). Depois de autorizar lá, ela aparece
              na lista abaixo.
            </p>
            {lojas === null ? (
              <p className={styles.vinculoPolling}>Buscando lojas autorizadas...</p>
            ) : lojas.length === 0 ? (
              <p className={styles.vinculoPolling}>
                Nenhuma loja nova autorizada encontrada. Autorize esta aplicação pra sua loja no Portal do
                Parceiro do iFood e tente de novo.
              </p>
            ) : (
              <Select
                label="Loja no iFood"
                value={lojaEscolhida}
                onChange={e => setLojaEscolhida(e.target.value)}
              >
                <option value="" disabled>Selecione...</option>
                {lojas.map(l => (
                  <option key={l.id} value={l.id}>{l.name}{l.corporateName ? ` — ${l.corporateName}` : ''}</option>
                ))}
              </Select>
            )}
            <div className={styles.actions}>
              <Button loading={vinculando} onClick={handleVincular} disabled={!lojaEscolhida}>
                Conectar esta loja
              </Button>
              <button className={styles.btnCancelar} onClick={cancelarVinculo}>Cancelar</button>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          {!status?.conectado && !escolhendoLoja && (
            <Button onClick={handleAbrirEscolha}>Conectar ao iFood</Button>
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
            O cardápio cadastrado aqui no Oia a Conta envia categorias, produtos e combos daqui pro iFood
            na sincronização. O que for removido ou desativado aqui é pausado automaticamente lá. Roda a
            cada 30 minutos, ou você pode forçar agora.
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
