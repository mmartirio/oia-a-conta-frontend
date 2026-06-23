import { useEffect, useState } from 'react'
import { configuracaoApi } from '../../api/configuracaoApi'
import styles from './AdminConfiguracoes.module.css'

export function AdminConfiguracoes() {
  const [pixChave, setPixChave] = useState('')
  const [comissaoGarcon, setComissaoGarcon] = useState('')
  const [comissaoEntregador, setComissaoEntregador] = useState('')
  const [comissaoCozinheiro, setComissaoCozinheiro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    configuracaoApi.get()
      .then(r => {
        setPixChave(r.data.pixChave ?? '')
        setComissaoGarcon(String(r.data.comissaoGarcon ?? 0))
        setComissaoEntregador(String(r.data.comissaoEntregador ?? 0))
        setComissaoCozinheiro(String(r.data.comissaoCozinheiro ?? 0))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSalvar = async () => {
    setSalvando(true)
    setSalvo(false)
    try {
      await configuracaoApi.salvar({
        pixChave: pixChave || undefined,
        comissaoGarcon: Number(comissaoGarcon),
        comissaoEntregador: Number(comissaoEntregador),
        comissaoCozinheiro: Number(comissaoCozinheiro),
      })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch {
      alert('Erro ao salvar configurações')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--color-text-secondary)' }}>Carregando...</p>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configurações</h1>

      <div className={styles.form}>
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
        </div>

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
        </div>

        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          {salvo && <span className={styles.success}>Salvo com sucesso!</span>}
        </div>
      </div>
    </div>
  )
}
