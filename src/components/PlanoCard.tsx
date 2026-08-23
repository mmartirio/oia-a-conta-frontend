import type { ReactNode } from 'react'
import type { Plano } from '../api/billingApi'
import styles from './PlanoCard.module.css'

function parseFuncionalidades(f: string): string[] {
  return f ? f.split(',').map(s => s.trim()).filter(Boolean) : []
}

interface PlanoCardProps {
  plano: Plano
  children: ReactNode
}

export function PlanoCard({ plano, children }: PlanoCardProps) {
  const funcs = parseFuncionalidades(plano.funcionalidades)
  return (
    <div className={`${styles.card} ${plano.destaque ? styles.destaque : ''}`}>
      {plano.destaque && <span className={styles.badge}>Mais popular</span>}
      <h3 className={styles.nome}>{plano.nome}</h3>
      <p className={styles.desc}>{plano.descricao}</p>
      <div className={styles.preco}>
        <span className={styles.precoValor}>
          {plano.precoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <span className={styles.precoLabel}>/mês</span>
      </div>
      <ul className={styles.funcList}>
        {plano.periodoTeste && plano.diasTeste > 0 && (
          <li><strong>{plano.diasTeste} dias grátis</strong></li>
        )}
        <li>Até {plano.limiteUsuarios} usuários</li>
        <li>Até {plano.limiteMesas} mesas</li>
        {funcs.map(f => <li key={f}>{f}</li>)}
      </ul>
      {children}
    </div>
  )
}
