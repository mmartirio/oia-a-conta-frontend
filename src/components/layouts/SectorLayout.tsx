import type { ComponentType } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { AdminLayout } from './AdminLayout'

interface Props {
  FallbackLayout: ComponentType
}

export function SectorLayout({ FallbackLayout }: Props) {
  const { user } = useAuth()
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    return <AdminLayout />
  }
  return <FallbackLayout />
}
