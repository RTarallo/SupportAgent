import { useState } from 'react'

export default function LoginScreen({ onLogin, onForgotPassword, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    await onLogin(email.trim(), password)
  }

  function handleForgot(e) {
    e.preventDefault()
    if (!email.trim()) {
      onForgotPassword('')
      return
    }
    onForgotPassword(email.trim())
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
          <div className="login-error visible" style={error.includes('enviado') ? { background: 'rgba(54,196,116,0.1)', color: '#03733F' } : {}}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">E-mail</label>
            <input type="email" placeholder="seu@email.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Senha</label>
            <input type="password" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Entrar</button>
        </form>
        <a href="#" className="login-forgot" onClick={handleForgot}>Esqueci minha senha</a>
      </div>
    </div>
  )
}
