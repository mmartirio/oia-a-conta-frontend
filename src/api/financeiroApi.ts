import api from './axios'
import type { ComissaoInfo, ComparativoFinanceiro, EvolucaoDiaria, ResumoFinanceiro } from '../types'
import type { Venda } from './caixaApi'

export const financeiroApi = {
  getResumo: (dataInicio: string, dataFim: string) =>
    api.get<ResumoFinanceiro>('/api/financeiro/resumo', { params: { dataInicio, dataFim } }),

  getComissoes: (dataInicio: string, dataFim: string) =>
    api.get<ComissaoInfo[]>('/api/financeiro/comissoes', { params: { dataInicio, dataFim } }),

  getEvolucao: (dataInicio: string, dataFim: string) =>
    api.get<EvolucaoDiaria[]>('/api/financeiro/evolucao', { params: { dataInicio, dataFim } }),

  getComparativo: (dataInicio: string, dataFim: string) =>
    api.get<ComparativoFinanceiro>('/api/financeiro/comparativo', { params: { dataInicio, dataFim } }),

  // Vendas individuais do período (mesma regra do resumo).
  getVendas: (dataInicio: string, dataFim: string) =>
    api.get<Venda[]>('/api/financeiro/vendas', { params: { dataInicio, dataFim } }),

  // Metas do mês ("2026-10") — campos null = sem meta.
  getMetas: (mes: string) =>
    api.get<MetasMes>('/api/financeiro/metas', { params: { mes } }),
  salvarMetas: (metas: MetasMes) =>
    api.put<MetasMes>('/api/financeiro/metas', metas),

  // Compras de insumos (entradas de estoque com custo) e valor do estoque.
  getInsumos: (dataInicio: string, dataFim: string) =>
    api.get<ResumoInsumos>('/api/estoque/financeiro', { params: { dataInicio, dataFim } }),
}

export interface MetasMes {
  mes: string
  metaFaturamento: number | null
  metaLucro: number | null
  limiteDespesas: number | null
}

export interface EntradaInsumo {
  id: number
  produtoId: number
  produtoNome: string
  quantidade: number
  custoUnitario: number | null
  valorTotal: number | null
  motivo: string | null
  criadoPorNome: string | null
  criadoEm: string
}

export interface ResumoInsumos {
  totalEntradas: number
  qtdEntradas: number
  entradasSemCusto: number
  valorEmEstoque: number
  entradas: EntradaInsumo[]
  itensEstoque: { produtoId: number; produtoNome: string; quantidade: number; custoMedio: number; valor: number }[]
}
