import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  { n: 1, label: 'Account' },
  { n: 2, label: 'Verify' },
  { n: 3, label: 'Wallet' },
]

function StepIndicator({ step }) {
  return (
    <div className="onboarding-steps">
      {STEPS.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
          <div className={`onboarding-step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
            <span className="onboarding-step-dot">{step > s.n ? '✓' : s.n}</span>
            <span className="onboarding-step-label">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`onboarding-step-line ${step > s.n ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  )
}

export default function Register() {
  const { login, setPendingVerificationUrl } = useAuth()
  const [form, setForm] = useState({ first_name: '', last_name: '', recipient_email: '', password: '' })
  const [err, setErr]       = useState('')
  const [loading, setLoading]   = useState(false)

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { first_name, last_name, ...rest } = form
      const data = await apiFetch('/auth/recipient/register', {
        method: 'POST',
        body: JSON.stringify({ ...rest, full_name: `${first_name} ${last_name}`.trim() }),
      })
      // Stash the verification_url in AuthContext (not local state) — login()
      // below sets a token, which makes PublicRoute redirect away from /register
      // immediately, unmounting this component before any local state could
      // render. VerificationGate picks this up on mount and auto-opens it.
      if (data.verification_url) {
        setPendingVerificationUrl(data.verification_url)
      }
      login(data.token, 'recipient', data.recipient_id, data.full_name)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
          <div style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            Citizens Dividend Program
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <StepIndicator step={1} />

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First name</label>
                <input required placeholder="Jordan" value={form.first_name} onChange={set('first_name')} />
              </div>
              <div className="form-group">
                <label>Last name</label>
                <input required placeholder="Martinez" value={form.last_name} onChange={set('last_name')} />
              </div>
            </div>

            <div className="form-group">
              <label>Email address</label>
              <input type="email" required placeholder="jordan@example.com" value={form.recipient_email} onChange={set('recipient_email')} />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" required placeholder="••••••••••" value={form.password} onChange={set('password')} />
            </div>

            {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}

            <button type="submit" className="btn btn-green" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Creating account…' : 'Continue'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          Already enrolled?{' '}
          <Link to="/login" style={{ color: 'var(--green-bright)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
