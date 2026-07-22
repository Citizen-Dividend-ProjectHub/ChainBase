import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Payments from './pages/Payments'
import Recipients from './pages/Recipients'
import Cycles from './pages/Cycles'
import CycleDetail from './pages/CycleDetail'
import Bonuses from './pages/Bonuses'
import Wallet from './pages/Wallet'

function PublicRoute({ children }) {
  const { token } = useAuth()
  return token ? <Navigate to="/" replace /> : children
}

function AdminRoute({ children }) {
  const { token, role } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/" replace />
  return children
}

function ComingSoon({ title }) {
  return (
    <div className="empty" style={{ paddingTop: 80 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
      <div style={{ fontSize: 16, color: 'var(--text)' }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 13 }}>Coming soon</div>
    </div>
  )
}

function ProtectedLayout() {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) {
    if (location.pathname === '/') return <Landing />
    return <Navigate to="/login" replace />
  }
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/payments"   element={<Payments />} />
          <Route path="/wallet"     element={<Wallet />} />
          <Route path="/alerts"     element={<ComingSoon title="Alerts" />} />
          <Route path="/recipients" element={<AdminRoute><Recipients /></AdminRoute>} />
          <Route path="/cycles"     element={<AdminRoute><Cycles /></AdminRoute>} />
          <Route path="/cycles/:id" element={<AdminRoute><CycleDetail /></AdminRoute>} />
          <Route path="/bonuses"    element={<AdminRoute><Bonuses /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/admin"    element={<PublicRoute><AdminLogin /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/*"        element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  )
}
