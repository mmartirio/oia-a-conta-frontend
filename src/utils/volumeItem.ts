import type { UnidadeVolume } from '../types'

// 1L = 1000ml — tudo é normalizado pra mililitros antes de mandar pro
// backend (ver ItemPedido.volumeMililitros/ItemEntrega.volumeMililitros),
// que por sua vez espera sempre mililitros independente da unidade
// escolhida aqui na hora de digitar.
const MILILITROS_POR_UNIDADE: Record<UnidadeVolume, number> = {
  ML: 1,
  L: 1000,
}

export function paraMililitros(valor: number, unidade: UnidadeVolume): number {
  return valor * MILILITROS_POR_UNIDADE[unidade]
}

export function deMililitros(mililitros: number, unidade: UnidadeVolume): number {
  return mililitros / MILILITROS_POR_UNIDADE[unidade]
}

export function formatarVolume(mililitros?: number | null): string {
  if (mililitros == null) return ''
  if (mililitros >= 1000) {
    return `${(mililitros / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L`
  }
  return `${mililitros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ml`
}
