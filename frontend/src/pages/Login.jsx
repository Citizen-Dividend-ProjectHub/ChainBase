import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

const blobStyle = `
  .auth-bg { position: relative; min-height: 100vh; background: var(--bg); overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
  .auth-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.3; pointer-events: none; }
  .auth-blob-a { width: 420px; height: 420px; background: var(--green-bright); top: -140px; left: -110px; animation: landing-float 11s ease-in-out infinite; }
  .auth-blob-b { width: 340px; height: 340px; background: var(--green); top: 60px; right: -120px; animation: landing-float 13s ease-in-out infinite reverse; }
  .auth-blob-c { width: 280px; height: 280px; background: var(--yellow); bottom: -120px; left: 40%; opacity: 0.18; animation: landing-float 15s ease-in-out infinite; animation-delay: -4s; }
  @keyframes landing-float { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(24px,-32px) scale(1.06)} }
`

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const data = await apiFetch('/auth/recipient/login', {
        method: 'POST',
        body: JSON.stringify({ recipient_email: email, password }),
      })
      login(data.token, 'recipient', data.recipient_id, data.full_name)
      navigate('/')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <style>{blobStyle}</style>
      <div className="auth-blob auth-blob-a" />
      <div className="auth-blob auth-blob-b" />
      <div className="auth-blob auth-blob-c" />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green-bright)', letterSpacing: '-0.3px' }}>
            Chain<span style={{ opacity: 0.5, fontWeight: 400 }}>Base</span>
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Citizens Dividend Portal</div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                autoFocus
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}

            <button
              type="submit"
              className="btn btn-green"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          Not enrolled?{' '}
          <Link to="/register" style={{ color: 'var(--green-bright)', textDecoration: 'none' }}>
            Create account
          </Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Program administrator?{' '}
          <Link to="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
            Staff access
          </Link>
        </p>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--green-bright)', textDecoration: 'none',
            fontSize: 13, border: '1px solid var(--green)',
            borderRadius: 20, padding: '6px 16px',
            background: 'rgba(63,185,80,0.06)',
          }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
