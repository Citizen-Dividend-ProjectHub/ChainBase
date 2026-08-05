import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

const authStyle = `
  .auth-bg { position: relative; min-height: 100vh; background: var(--bg); overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
`

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const data = await apiFetch('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ administrator_name: name, password }),
      })
      login(data.token, 'admin', data.administrator_id, data.administrator_name)
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
          <div style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Administrator Access</div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Admin Name</label>
              <input
                required
                autoFocus
                placeholder="admin"
                value={name}
                onChange={e => setName(e.target.value)}
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

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13,
            border: '1px solid var(--border)', borderRadius: 20, padding: '6px 16px',
            background: 'var(--cb-fill)',
          }}>
            ← Home
          </Link>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--cb-accent)', textDecoration: 'none', fontSize: 13,
            border: '1px solid var(--cb-border-strong)', borderRadius: 20, padding: '6px 16px',
            background: 'var(--cb-fill)',
          }}>
            Citizens Login →
          </Link>
        </div>
      </div>
    </div>
  )
}
