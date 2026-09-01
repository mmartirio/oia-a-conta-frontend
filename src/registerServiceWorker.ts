import { registerSW } from 'virtual:pwa-register'

// Painel admin fica com a aba aberta o dia inteiro — sem isso, o service
// worker (ver vite.config.ts) só detectava uma versão nova em background e
// exigia um F5 manual do usuário pra ativar, mesmo já com o deploy novo no
// ar (foi exatamente o que aconteceu: um deploy corrigiu um bug mas quem
// estava com a tela aberta continuou vendo o comportamento antigo até
// recarregar na mão). Aqui, assim que detecta uma versão nova, ativa e
// recarrega sozinho — ferramenta interna, não valeria a pena interromper
// com um prompt "atualizar agora?" que ninguém ia notar.
export function setupAutoUpdate() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    },
    onRegisteredSW(_url, registration) {
      // O browser só rechecar o service worker sozinho em navegações novas
      // — com a aba ficando aberta o dia todo, isso podia demorar horas.
      if (registration) {
        setInterval(() => registration.update(), 5 * 60 * 1000)
      }
    }
  })
}
