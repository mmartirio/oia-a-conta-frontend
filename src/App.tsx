import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { PrivateRoute } from './components/PrivateRoute'
import type { Role } from './types'

const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/gestor',
  ADMIN: '/admin',
  GARCON: '/garcon',
  COZINHA: '/cozinha',
}

function SmartRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={ROLE_HOME[user.role] ?? '/login'} replace />
  return <Navigate to="/login" replace />
}

// Layouts
import { AdminLayout } from './components/layouts/AdminLayout'
import { GarconLayout } from './components/layouts/GarconLayout'
import { CozinhaLayout } from './components/layouts/CozinhaLayout'
import { GestorLayout } from './components/layouts/GestorLayout'
import { SuperAdminLayout } from './components/layouts/SuperAdminLayout'
import { PdvLayout } from './components/layouts/PdvLayout'
import { EntregadorLayout } from './components/layouts/EntregadorLayout'

// Páginas públicas
import { Login } from './pages/Login'
import { Registro } from './pages/Registro'
import { CardapioPublico } from './pages/public/CardapioPublico'

// Admin
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminMesas } from './pages/admin/AdminMesas'
import { AdminCardapio } from './pages/admin/AdminCardapio'
import { AdminUsuarios } from './pages/admin/AdminUsuarios'
import { AdminFinanceiro } from './pages/admin/AdminFinanceiro'
import { AdminAssinatura } from './pages/admin/AdminAssinatura'
import { AdminConfiguracoes } from './pages/admin/AdminConfiguracoes'
import { AdminSuporte } from './pages/admin/AdminSuporte'
import { AdminWhatsapp } from './pages/admin/AdminWhatsapp'

// Garçom
import { GarconMesas } from './pages/garcon/GarconMesas'
import { GarconComandas } from './pages/garcon/GarconComandas'
import { GarconComanda } from './pages/garcon/GarconComanda'
import { GarconNovoPedido } from './pages/garcon/GarconNovoPedido'
import { GarconDelivery } from './pages/garcon/GarconDelivery'
import { GarconDeliveryLista } from './pages/garcon/GarconDeliveryLista'

// Cozinha
import { CozinhaPedidos } from './pages/cozinha/CozinhaPedidos'

// PDV
import { PdvSalao } from './pages/pdv/PdvSalao'
import { PdvDelivery } from './pages/pdv/PdvDelivery'

// Entregador
import { EntregadorPainel } from './pages/entregador/EntregadorPainel'

// Gestor (plataforma)
import { GestorDashboard } from './pages/gestor/GestorDashboard'
import { GestorPlanos } from './pages/gestor/GestorPlanos'
import { GestorEmpresas } from './pages/gestor/GestorEmpresas'
import { GestorCobrancas } from './pages/gestor/GestorCobrancas'
import { GestorRelatorios } from './pages/gestor/GestorRelatorios'

// Super Admin
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard'
import { SuperAdminPlanos } from './pages/super-admin/SuperAdminPlanos'
import { SuperAdminEmpresas } from './pages/super-admin/SuperAdminEmpresas'
import { SuperAdminEmpresaDetalhe } from './pages/super-admin/SuperAdminEmpresaDetalhe'
import { SuperAdminPagamentos } from './pages/super-admin/SuperAdminPagamentos'
import { SuperAdminTickets } from './pages/super-admin/SuperAdminTickets'
import { SuperAdminTicketDetalhe } from './pages/super-admin/SuperAdminTicketDetalhe'
import { SuperAdminFinanceiro } from './pages/super-admin/SuperAdminFinanceiro'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* Públicas */}
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/cardapio/:slug" element={<CardapioPublico />} />
                <Route path="/" element={<SmartRedirect />} />

                {/* Gestor da plataforma (SUPER_ADMIN) */}
                <Route element={<PrivateRoute allowedRoles={['SUPER_ADMIN']} />}>
                  <Route element={<GestorLayout />}>
                    <Route path="/gestor" element={<GestorDashboard />} />
                    <Route path="/gestor/planos" element={<GestorPlanos />} />
                    <Route path="/gestor/empresas" element={<GestorEmpresas />} />
                    <Route path="/gestor/cobrancas" element={<GestorCobrancas />} />
                    <Route path="/gestor/relatorios" element={<GestorRelatorios />} />
                  </Route>
                  <Route element={<SuperAdminLayout />}>
                    <Route path="/super-admin" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/planos" element={<SuperAdminPlanos />} />
                    <Route path="/super-admin/empresas" element={<SuperAdminEmpresas />} />
                    <Route path="/super-admin/empresas/:id" element={<SuperAdminEmpresaDetalhe />} />
                    <Route path="/super-admin/pagamentos" element={<SuperAdminPagamentos />} />
                    <Route path="/super-admin/tickets" element={<SuperAdminTickets />} />
                    <Route path="/super-admin/tickets/:id" element={<SuperAdminTicketDetalhe />} />
                    <Route path="/super-admin/financeiro" element={<SuperAdminFinanceiro />} />
                  </Route>
                </Route>

                {/* Admin do restaurante — sidebar sempre visível (modo solo incluso) */}
                <Route element={<PrivateRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/mesas" element={<AdminMesas />} />
                    <Route path="/admin/cardapio" element={<AdminCardapio />} />
                    <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                    <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
                    <Route path="/admin/assinatura" element={<AdminAssinatura />} />
                    <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
                    <Route path="/admin/suporte" element={<AdminSuporte />} />
                    <Route path="/admin/whatsapp" element={<AdminWhatsapp />} />
                    {/* Modo solo: admin acessa todos os painéis com sidebar */}
                    <Route path="/cozinha" element={<CozinhaPedidos />} />
                    <Route path="/garcon" element={<GarconMesas />} />
                    <Route path="/garcon/comandas" element={<GarconComandas />} />
                    <Route path="/garcon/comanda/:id" element={<GarconComanda />} />
                    <Route path="/garcon/comanda/:id/novo-pedido" element={<GarconNovoPedido />} />
                    <Route path="/delivery" element={<GarconDeliveryLista />} />
                    <Route path="/delivery/novo" element={<GarconDelivery />} />
                    <Route path="/pdv" element={<PdvSalao />} />
                    <Route path="/pdv/delivery" element={<PdvDelivery />} />
                    <Route path="/entregador" element={<EntregadorPainel />} />
                  </Route>
                </Route>

                {/* Garçom (role específico) */}
                <Route element={<PrivateRoute allowedRoles={['GARCON']} />}>
                  <Route element={<GarconLayout />}>
                    <Route path="/garcon" element={<GarconMesas />} />
                    <Route path="/garcon/comandas" element={<GarconComandas />} />
                    <Route path="/garcon/comanda/:id" element={<GarconComanda />} />
                    <Route path="/garcon/comanda/:id/novo-pedido" element={<GarconNovoPedido />} />
                  </Route>
                </Route>

                {/* Cozinha (role específico) */}
                <Route element={<PrivateRoute allowedRoles={['COZINHA']} />}>
                  <Route element={<CozinhaLayout />}>
                    <Route path="/cozinha" element={<CozinhaPedidos />} />
                  </Route>
                </Route>

                {/* PDV (role específico — ADMIN já tem no bloco acima) */}
                <Route element={<PrivateRoute allowedRoles={['GARCON']} />}>
                  <Route element={<EntregadorLayout />}>
                    <Route path="/entregador" element={<EntregadorPainel />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="/sem-acesso" element={
                  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                    <h1>Acesso Negado</h1>
                    <a href="/login">Voltar ao login</a>
                  </div>
                } />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
