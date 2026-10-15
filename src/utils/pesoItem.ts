import type { UnidadeMedida } from '../types'

// 1kg = 1000g = 1.000.000mg — tudo é normalizado pra gramas antes de
// mandar pro backend (ver ItemPedido.pesoGramas/ItemEntrega.pesoGramas),
// que por sua vez espera sempre gramas independente da unidade escolhida
// aqui na hora de digitar.
const GRAMAS_POR_UNIDADE: Record<UnidadeMedida, number> = {
  MG: 0.001,
  G: 1,
  KG: 1000,
}

export function paraGramas(valor: number, unidade: UnidadeMedida): number {
  return valor * GRAMAS_POR_UNIDADE[unidade]
}

export function deGramas(gramas: number, unidade: UnidadeMedida): number {
  return gramas / GRAMAS_POR_UNIDADE[unidade]
}

export function formatarPeso(gramas?: number | null): string {
  if (gramas == null) return ''
  if (gramas >= 1000) {
    return `${(gramas / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`
  }
  return `${gramas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g`
}

// Espelha ItemPrecoUtil.subtotal (order-service) — produto por peso/volume
// tem precoUnitario "por kg"/"por litro", produto por unidade usa a
// contagem normal. Um item nunca tem pesoGramas e volumeMililitros juntos.
export function subtotalItem(
  precoUnitario: number,
  quantidade: number,
  pesoGramas?: number | null,
  volumeMililitros?: number | null
): number {
  const fracao = pesoGramas ?? volumeMililitros
  const multiplicador = fracao != null ? fracao / 1000 : quantidade
  return precoUnitario * multiplicador
}
