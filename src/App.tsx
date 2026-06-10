import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { PrivateRoute } from './components/PrivateRoute'
import { AdminLayout } from './components/layouts/AdminLayout'
import { GarconLayout } from './components/layouts/GarconLayout'
import { CozinhaLayout } from './components/layouts/CozinhaLayout'
import { Login } from './pages/Login'
import { Registro } from './pages/Registro'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminMesas } from './pages/admin/AdminMesas'
import { AdminCardapio } from './pages/admin/AdminCardapio'
import { AdminUsuarios } from './pages/admin/AdminUsuarios'
import { GarconMesas } from './pages/garcon/GarconMesas'
import { GarconComandas } from './pages/garcon/GarconComandas'
import { GarconComanda } from './pages/garcon/GarconComanda'
import { GarconNovoPedido } from './pages/garcon/GarconNovoPedido'
import { CozinhaPedidos } from './pages/cozinha/CozinhaPedidos'

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
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Admin */}
                <Route element={<PrivateRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/mesas" element={<AdminMesas />} />
                    <Route path="/admin/cardapio" element={<AdminCardapio />} />
                    <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                  </Route>
                </Route>

                {/* Garçom */}
                <Route element={<PrivateRoute allowedRoles={['GARCON', 'ADMIN']} />}>
                  <Route element={<GarconLayout />}>
                    <Route path="/garcon" element={<GarconMesas />} />
                    <Route path="/garcon/comandas" element={<GarconComandas />} />
                    <Route path="/garcon/comanda/:id" element={<GarconComanda />} />
                    <Route path="/garcon/comanda/:id/novo-pedido" element={<GarconNovoPedido />} />
                  </Route>
                </Route>

                {/* Cozinha */}
                <Route element={<PrivateRoute allowedRoles={['COZINHA', 'ADMIN']} />}>
                  <Route element={<CozinhaLayout />}>
                    <Route path="/cozinha" element={<CozinhaPedidos />} />
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
