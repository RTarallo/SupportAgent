import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { user, login, resetPassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/home', { replace: true })
  }, [user, navigate])
  if (user) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const err = await login(email.trim(), password)
    if (err) {
      setError(err)
      return
    }
    navigate('/home', { replace: true })
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Informe seu e-mail para redefinir a senha.')
      return
    }
    setError('')
    const err = await resetPassword(email.trim())
    if (err) {
      setError(err)
      return
    }
    setError('E-mail enviado. Verifique sua caixa de entrada.')
  }

  return (
    <div className="login-screen">
      <div className="login-logo logo">
        <div className="logo-mark">D</div>
        <span className="logo-text">Divi</span>
      </div>
      <div className="login-card">
        <h1>Entrar</h1>
        {error && (
          <div
            className="login-error visible"
            style={error.includes('enviado') ? { background: 'rgba(54,196,116,0.1)', color: '#03733F' } : {}}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Entrar
          </button>
        </form>
        <a href="#" className="login-forgot" onClick={handleForgot}>
          Esqueci minha senha
        </a>
      </div>
    </div>
  )
}
