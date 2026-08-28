import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ToastProvider } from './contexts/ToastContext'
import { PrivateRoute } from './components/PrivateRoute'
import { RequirePermission } from './components/RequirePermission'
import { primeiraRotaPermitida } from './constants/permissoes'
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
  if (user) {
    // ADMIN com grupo restrito pode não ter acesso ao Dashboard (rota padrão)
    // — manda pra primeira rota do sidebar que o grupo permite. SUPER_ADMIN
    // não usa esse sidebar (vai pro console /gestor), fica de fora.
    const destino = user.role === 'ADMIN'
      ? primeiraRotaPermitida(user.permissoes)
      : (ROLE_HOME[user.role] ?? '/login')
    return <Navigate to={destino} replace />
  }
  return <LandingPage />
}

// Layouts
import { AdminLayout } from './components/layouts/AdminLayout'
import { GarconLayout } from './components/layouts/GarconLayout'
import { CozinhaLayout } from './components/layouts/CozinhaLayout'
import { GestorLayout } from './components/layouts/GestorLayout'

// Páginas públicas
import { Login } from './pages/Login'
import { Registro } from './pages/Registro'
import { CardapioPublico } from './pages/public/CardapioPublico'
import { LandingPage } from './pages/public/LandingPage'

// Admin
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminMesas } from './pages/admin/AdminMesas'
import { AdminCardapio } from './pages/admin/AdminCardapio'
import { AdminUsuarios } from './pages/admin/AdminUsuarios'
import { AdminClientes } from './pages/admin/AdminClientes'
import { AdminEstoque } from './pages/admin/AdminEstoque'
import { AdminMarketing } from './pages/admin/AdminMarketing'
import { AdminFinanceiro } from './pages/admin/AdminFinanceiro'
import { AdminAssinatura } from './pages/admin/AdminAssinatura'
import { AdminConfiguracoes } from './pages/admin/AdminConfiguracoes'
import { AdminSuporte } from './pages/admin/AdminSuporte'
import { AdminWhatsapp } from './pages/admin/AdminWhatsapp'
import { AdminIfood } from './pages/admin/AdminIfood'

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

// Entregador
import { EntregadorPainel } from './pages/entregador/EntregadorPainel'

// Gestor (plataforma)
import { GestorDashboard } from './pages/gestor/GestorDashboard'
import { GestorPlanos } from './pages/gestor/GestorPlanos'
import { GestorEmpresas } from './pages/gestor/GestorEmpresas'
import { GestorEmpresaDetalhe } from './pages/gestor/GestorEmpresaDetalhe'
import { GestorCobrancas } from './pages/gestor/GestorCobrancas'
import { GestorRelatorios } from './pages/gestor/GestorRelatorios'
import { GestorPagamentos } from './pages/gestor/GestorPagamentos'
import { GestorTickets } from './pages/gestor/GestorTickets'
import { GestorTicketDetalhe } from './pages/gestor/GestorTicketDetalhe'
import { GestorFinanceiro } from './pages/gestor/GestorFinanceiro'
import { GestorLogs } from './pages/gestor/GestorLogs'
import { GestorSocial } from './pages/gestor/GestorSocial'
import { GestorAdmins } from './pages/gestor/GestorAdmins'
import { GestorWhatsapp } from './pages/gestor/GestorWhatsapp'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <ToastProvider>
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
                    <Route path="/gestor/empresas/:id" element={<GestorEmpresaDetalhe />} />
                    <Route path="/gestor/cobrancas" element={<GestorCobrancas />} />
                    <Route path="/gestor/pagamentos" element={<GestorPagamentos />} />
                    <Route path="/gestor/tickets" element={<GestorTickets />} />
                    <Route path="/gestor/tickets/:id" element={<GestorTicketDetalhe />} />
                    <Route path="/gestor/financeiro" element={<GestorFinanceiro />} />
                    <Route path="/gestor/logs" element={<GestorLogs />} />
                    <Route path="/gestor/relatorios" element={<GestorRelatorios />} />
                    <Route path="/gestor/social" element={<GestorSocial />} />
                    <Route path="/gestor/admins" element={<GestorAdmins />} />
                    <Route path="/gestor/whatsapp" element={<GestorWhatsapp />} />
                  </Route>
                </Route>

                {/* Admin do restaurante — sidebar sempre visível (modo solo incluso) */}
                <Route element={<PrivateRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
                  <Route element={<AdminLayout />}>
                    <Route element={<RequirePermission permission="DASHBOARD" />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                    </Route>
                    <Route element={<RequirePermission permission="MESAS" />}>
                      <Route path="/admin/mesas" element={<AdminMesas />} />
                    </Route>
                    <Route element={<RequirePermission permission="CARDAPIO" />}>
                      <Route path="/admin/cardapio" element={<AdminCardapio />} />
                    </Route>
                    <Route element={<RequirePermission permission="USUARIOS" />}>
                      <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                    </Route>
                    <Route element={<RequirePermission permission="CLIENTES" />}>
                      <Route path="/admin/clientes" element={<AdminClientes />} />
                    </Route>
                    <Route element={<RequirePermission permission="ESTOQUE" />}>
                      <Route path="/admin/estoque" element={<AdminEstoque />} />
                    </Route>
                    <Route element={<RequirePermission permission="MARKETING" />}>
                      <Route path="/admin/marketing" element={<AdminMarketing />} />
                    </Route>
                    <Route element={<RequirePermission permission="FINANCEIRO" />}>
                      <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
                    </Route>
                    <Route path="/admin/assinatura" element={<AdminAssinatura />} />
                    <Route element={<RequirePermission permission={['CONFIG_STATUS_LOJA', 'CONFIG_ALERTA_PEDIDO', 'CONFIG_DADOS_EMPRESA', 'CONFIG_PIX', 'CONFIG_COMISSOES', 'CONFIG_LOGO', 'CONFIG_CORES', 'CONFIG_BACKGROUND', 'CONFIG_HORARIOS', 'CONFIG_PAUSAS', 'CONFIG_FRETE']} />}>
                      <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
                    </Route>
                    <Route element={<RequirePermission permission="SUPORTE" />}>
                      <Route path="/admin/suporte" element={<AdminSuporte />} />
                    </Route>
                    <Route element={<RequirePermission permission={['WHATSAPP_CONEXAO', 'WHATSAPP_MENSAGENS', 'WHATSAPP_CONVERSAS']} />}>
                      <Route path="/admin/whatsapp" element={<AdminWhatsapp />} />
                    </Route>
                    <Route element={<RequirePermission permission="IFOOD_CONEXAO" />}>
                      <Route path="/admin/ifood" element={<AdminIfood />} />
                    </Route>
                    {/* Modo solo: admin acessa todos os painéis com sidebar */}
                    <Route element={<RequirePermission permission="COZINHA" />}>
                      <Route path="/cozinha" element={<CozinhaPedidos />} />
                    </Route>
                    <Route element={<RequirePermission permission="GARCOM" />}>
                      <Route path="/garcon" element={<GarconMesas />} />
                    </Route>
                    <Route element={<RequirePermission permission="COMANDA" />}>
                      <Route path="/garcon/comandas" element={<GarconComandas />} />
                      <Route path="/garcon/comanda/:id" element={<GarconComanda />} />
                      <Route path="/garcon/comanda/:id/novo-pedido" element={<GarconNovoPedido />} />
                    </Route>
                    <Route element={<RequirePermission permission="DELIVERY" />}>
                      <Route path="/delivery" element={<GarconDeliveryLista />} />
                      <Route path="/delivery/novo" element={<GarconDelivery />} />
                    </Route>
                    <Route element={<RequirePermission permission="CAIXA_PDV" />}>
                      {/* Todo o PDV é uma única tela (PdvSalao): fila de pagamento
                          (mesas + delivery) e nova venda (balcão/delivery) alternam
                          por aba, sem navegar entre páginas — ver PdvSalao.tsx. */}
                      <Route path="/pdv" element={<PdvSalao />} />
                      <Route path="/pdv/nova-venda" element={<Navigate to="/pdv" replace />} />
                      <Route path="/pdv/delivery" element={<Navigate to="/pdv" replace />} />
                      <Route path="/pdv/delivery/novo" element={<Navigate to="/pdv" replace />} />
                    </Route>
                    <Route element={<RequirePermission permission="ENTREGADOR" />}>
                      <Route path="/entregador" element={<EntregadorPainel />} />
                    </Route>
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
            </ToastProvider>
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
