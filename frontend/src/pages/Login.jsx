import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

const authStyle = `
  .auth-bg { position: relative; min-height: 100vh; background: var(--bg); overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
`

export default function Login() {
  const { login, refreshMe } = useAuth()
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
      await refreshMe(data.token)
      navigate('/')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <style>{authStyle}</style>

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div className="cb-logo" style={{ width: 32, height: 32 }}>
              <div className="cb-logo-glow" />
              <div className="cb-logo-body">
                <div className="cb-logo-conic" />
                <div className="cb-logo-sheen" />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Chain<span style={{ opacity: 0.55, fontWeight: 500 }}>Base</span>
            </div>
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
          <Link to="/register" style={{ color: 'var(--cb-accent)', textDecoration: 'none' }}>
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
            color: 'var(--cb-accent)', textDecoration: 'none',
            fontSize: 13, border: '1px solid var(--cb-border-strong)',
            borderRadius: 20, padding: '6px 16px',
            background: 'var(--cb-fill)',
          }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
