import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ChamadoPage from './pages/ChamadoPage'

function RedirectFromRoot() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? '/home' : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/chamado/:id" element={<ProtectedRoute><ChamadoPage /></ProtectedRoute>} />
          <Route path="/" element={<RedirectFromRoot />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
