export const PUBLIC_MENU_DOMAIN = 'oiaaconta.com.br'

export function publicMenuUrl(slug: string): string {
  return `https://${slug}.${PUBLIC_MENU_DOMAIN}`
}

// Se o hostname atual for "<slug>.oiaaconta.com.br", devolve o slug — usado
// pra rotear o app pra tela do cardápio público sem passar pelo path
// /cardapio/:slug. Em dev (localhost etc.) ou em www./domínio raiz, retorna
// null e o app segue o roteamento normal.
export function slugFromSubdominio(hostname: string = window.location.hostname): string | null {
  const sufixo = `.${PUBLIC_MENU_DOMAIN}`
  if (!hostname.endsWith(sufixo)) return null
  const sub = hostname.slice(0, -sufixo.length)
  if (!sub || sub === 'www' || sub.includes('.')) return null
  return sub
}
