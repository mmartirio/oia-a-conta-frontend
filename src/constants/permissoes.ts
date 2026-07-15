// Catálogo de permissões concedíveis a um Grupo — espelha
// backend/auth-service/.../service/Permissao.java. Um container por item do
// sidebar; WhatsApp e Configurações têm sub-permissões (tab/item).

export interface PermissaoContainer {
  chave: string
  label: string
  filhos?: { chave: string; label: string }[]
}

export const PERMISSAO_CONTAINERS: PermissaoContainer[] = [
  { chave: 'DASHBOARD', label: 'Dashboard' },
  { chave: 'CAIXA_PDV', label: 'Caixa (PDV)' },
  { chave: 'CARDAPIO', label: 'Cardápio' },
  { chave: 'MESAS', label: 'Mesas' },
  { chave: 'COZINHA', label: 'Cozinha' },
  { chave: 'COMANDA', label: 'Comanda' },
  { chave: 'GARCOM', label: 'Garçom' },
  { chave: 'DELIVERY', label: 'Delivery' },
  { chave: 'ENTREGADOR', label: 'Entregador' },
  { chave: 'USUARIOS', label: 'Usuários' },
  { chave: 'FINANCEIRO', label: 'Financeiro' },
  {
    chave: 'WHATSAPP', label: 'WhatsApp',
    filhos: [
      { chave: 'WHATSAPP_CONEXAO', label: 'Conexão' },
      { chave: 'WHATSAPP_MENSAGENS', label: 'Mensagens' },
      { chave: 'WHATSAPP_CONVERSAS', label: 'Conversas' },
    ],
  },
  { chave: 'SUPORTE', label: 'Suporte' },
  {
    chave: 'CONFIGURACOES', label: 'Configurações',
    filhos: [
      { chave: 'CONFIG_STATUS_LOJA', label: 'Status da Loja' },
      { chave: 'CONFIG_ALERTA_PEDIDO', label: 'Alerta de Novo Pedido' },
      { chave: 'CONFIG_DADOS_EMPRESA', label: 'Dados da Empresa' },
      { chave: 'CONFIG_PIX', label: 'Chave PIX' },
      { chave: 'CONFIG_COMISSOES', label: 'Comissões' },
      { chave: 'CONFIG_LOGO', label: 'Logo do Restaurante' },
      { chave: 'CONFIG_CORES', label: 'Cores do Cardápio' },
      { chave: 'CONFIG_BACKGROUND', label: 'Imagem de Fundo' },
      { chave: 'CONFIG_HORARIOS', label: 'Horário de Funcionamento' },
      { chave: 'CONFIG_PAUSAS', label: 'Pausas de Funcionamento' },
      { chave: 'CONFIG_TAXAS_MAQUININHA', label: 'Taxas da Maquininha' },
    ],
  },
]

// Todas as chaves de permissão "reais" (folhas) — os containers-pai
// (WHATSAPP/CONFIGURACOES) não são permissões em si, só agrupam a UI.
export const TODAS_PERMISSOES: string[] = PERMISSAO_CONTAINERS.flatMap(c =>
  c.filhos ? c.filhos.map(f => f.chave) : [c.chave]
)

// true se o usuário não tem grupo (permissoes null/undefined) — nesse caso
// o acesso não é restrito por permissão, só pelo role (comportamento de hoje).
export function temAcesso(permissoes: string[] | null | undefined, chave: string): boolean {
  if (!permissoes) return true
  return permissoes.includes(chave)
}

// Mesma ordem do sidebar (AdminLayout) — usado pra saber pra onde mandar um
// usuário logado quando a rota padrão (/admin, Dashboard) não está no grupo dele.
export const NAV_ROUTES: { path: string; permission: string | string[] }[] = [
  { path: '/admin', permission: 'DASHBOARD' },
  { path: '/pdv', permission: 'CAIXA_PDV' },
  { path: '/admin/cardapio', permission: 'CARDAPIO' },
  { path: '/admin/mesas', permission: 'MESAS' },
  { path: '/cozinha', permission: 'COZINHA' },
  { path: '/garcon/comandas', permission: 'COMANDA' },
  { path: '/garcon', permission: 'GARCOM' },
  { path: '/delivery', permission: 'DELIVERY' },
  { path: '/entregador', permission: 'ENTREGADOR' },
  { path: '/admin/usuarios', permission: 'USUARIOS' },
  { path: '/admin/financeiro', permission: 'FINANCEIRO' },
  { path: '/admin/whatsapp', permission: ['WHATSAPP_CONEXAO', 'WHATSAPP_MENSAGENS', 'WHATSAPP_CONVERSAS'] },
  { path: '/admin/suporte', permission: 'SUPORTE' },
  { path: '/admin/configuracoes', permission: ['CONFIG_STATUS_LOJA', 'CONFIG_ALERTA_PEDIDO', 'CONFIG_DADOS_EMPRESA', 'CONFIG_PIX', 'CONFIG_COMISSOES', 'CONFIG_LOGO', 'CONFIG_CORES', 'CONFIG_BACKGROUND', 'CONFIG_HORARIOS', 'CONFIG_PAUSAS', 'CONFIG_TAXAS_MAQUININHA'] },
]

// Primeira rota do sidebar que o usuário tem permissão de acessar — usada
// pro redirect pós-login, já que /admin (Dashboard) pode não estar no grupo.
export function primeiraRotaPermitida(permissoes: string[] | null | undefined): string {
  if (!permissoes) return '/admin'
  const rota = NAV_ROUTES.find(r => {
    const chaves = Array.isArray(r.permission) ? r.permission : [r.permission]
    return chaves.some(c => permissoes.includes(c))
  })
  return rota?.path ?? '/sem-acesso'
}
