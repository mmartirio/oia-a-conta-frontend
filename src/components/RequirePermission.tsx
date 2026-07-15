import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface RequirePermissionProps {
  // Uma permissão exige exatamente essa chave; várias, o usuário precisa
  // de QUALQUER uma delas (usado pra WhatsApp/Configurações, que têm
  // sub-permissões por tab/item).
  permission: string | string[]
}

export function RequirePermission({ permission }: RequirePermissionProps) {
  const { user } = useAuth()

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
