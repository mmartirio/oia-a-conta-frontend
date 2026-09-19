import { useState, type ReactNode } from 'react'
import type { Plano } from '../api/billingApi'
import styles from './PlanoCard.module.css'

function parseFuncionalidades(f: string | null): string[] {
  return f ? f.split(',').map(s => s.trim()).filter(Boolean) : []
}

type Modalidade = 'MESAS' | 'DELIVERY'

interface PlanoCardProps {
  plano: Plano
  children: ReactNode | ((modalidade: Modalidade) => ReactNode)
}

export function PlanoCard({ plano, children }: PlanoCardProps) {
  // Só planos que exigem modalidade (ex: Start UP) têm recursos diferentes
  // por presencial/delivery — os demais mostram uma lista só, como sempre.
  const [modalidade, setModalidade] = useState<Modalidade>('MESAS')

  const funcs = plano.exigeModalidadeOperacao
    ? parseFuncionalidades(modalidade === 'MESAS' ? plano.funcionalidadesMesas : plano.funcionalidadesDelivery)
    : parseFuncionalidades(plano.funcionalidades)

  return (
    <div className={`${styles.card} ${plano.destaque ? styles.destaque : ''} ${plano.exigeModalidadeOperacao ? styles.startup : ''}`}>
      {plano.destaque && <span className={styles.badge}>Mais popular</span>}
      <h3 className={styles.nome}>{plano.nome}</h3>
      <p className={styles.desc}>{plano.descricao}</p>
      <div className={styles.preco}>
        <span className={styles.precoValor}>
          {plano.precoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <span className={styles.precoLabel}>/mês</span>
      </div>

      {plano.exigeModalidadeOperacao && (
        <div className={styles.seletorModalidade}>
          <span className={modalidade === 'MESAS' ? styles.seletorLabelAtivo : styles.seletorLabel}>
            Presencial
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={modalidade === 'DELIVERY'}
            aria-label="Alternar entre presencial e delivery"
            className={`${styles.iosSwitch} ${modalidade === 'DELIVERY' ? styles.iosSwitchOn : ''}`}
            onClick={() => setModalidade(modalidade === 'MESAS' ? 'DELIVERY' : 'MESAS')}
          >
            <span className={styles.iosSwitchThumb} />
          </button>
          <span className={modalidade === 'DELIVERY' ? styles.seletorLabelAtivo : styles.seletorLabel}>
            Delivery
          </span>
        </div>
      )}

      <ul className={styles.funcList}>
        {plano.periodoTeste && plano.diasTeste > 0 && (
          <li><strong>{plano.diasTeste} dias grátis</strong></li>
        )}
        <li>{plano.limiteUsuarios ? `Até ${plano.limiteUsuarios} usuários` : 'Usuários ilimitados'}</li>
        {(!plano.exigeModalidadeOperacao || modalidade === 'MESAS') && (
          <li>{plano.limiteMesas ? `Até ${plano.limiteMesas} mesas` : 'Mesas ilimitadas'}</li>
        )}
        {funcs.map(f => <li key={f}>{f}</li>)}
      </ul>
      {typeof children === 'function' ? children(modalidade) : children}
    </div>
  )
}
