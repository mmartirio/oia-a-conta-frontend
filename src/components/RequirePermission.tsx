import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface RequirePermissionProps {
  // Uma permissão exige exatamente essa chave; várias, o usuário precisa
  // de QUALQUER uma delas (usado pra WhatsApp/Configurações, que têm
  // sub-permissões por tab/item).
  permission: string | string[]
  // Só usado em rotas de mesas/comandas/garçom ou delivery/entregador —
  // some quando o plano restringe modalidade (ex: Startup) e a modalidade
  // ativa do contrato é a outra. O bloqueio real é sempre no backend; isso
  // só evita a rota ficar acessível/renderizando erro no admin.
  modalidade?: 'MESAS' | 'DELIVERY'
}

export function RequirePermission({ permission, modalidade }: RequirePermissionProps) {
  const { user, restringeModalidade, modalidadeOperacao } = useAuth()

  if (modalidade && restringeModalidade && modalidadeOperacao !== modalidade) {
    return <Navigate to="/sem-acesso" replace />
  }

  // Sem grupo atribuído — sem restrição por permissão, só pelo role
  // (comportamento de hoje, já garantido pelo PrivateRoute).
  if (!user?.permissoes) return <Outlet />

  const exigidas = Array.isArray(permission) ? permission : [permission]
  const temAcesso = exigidas.some(p => user.permissoes!.includes(p))

  // Não redireciona pra /admin — o Dashboard também é gateado por permissão
  // (DASHBOARD), então um grupo sem essa permissão criaria um loop. /sem-acesso
  // nunca exige permissão, então é sempre um destino seguro.
  if (!temAcesso) return <Navigate to="/sem-acesso" replace />

  return <Outlet />
}
