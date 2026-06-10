import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Role } from '../types'

interface PrivateRouteProps {
  allowedRoles?: Role[]
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <span>Carregando...</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/sem-acesso" replace />
  }

  return <Outlet />
}
