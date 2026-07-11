import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
}

export default function Register() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form, setForm] = useState({ full_name: '', recipient_email: '', password: '', wallet_address: '' })
  const [walletConnected, setWalletConnected] = useState(false)
  const [err, setErr]       = useState('')
  const [walletErr, setWalletErr] = useState('')
  const [loading, setLoading]   = useState(false)

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function connectMetaMask() {
    setWalletErr('')
    if (!window.ethereum) {
      setWalletErr('MetaMask not detected. Paste your wallet address below.')
      return
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setForm(f => ({ ...f, wallet_address: accounts[0] }))
      setWalletConnected(true)
    } catch (e) {
      setWalletErr(e.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.wallet_address) { setErr('Please connect MetaMask or paste your wallet address.'); return }
    setLoading(true)
    try {
      const data = await apiFetch('/auth/recipient/register', {
        method: 'POST',
        body: JSON.stringify(form),
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>
            Chain<span style={{ color: 'var(--green-bright)' }}>Base</span>
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            Citizens Dividend Program
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full name</label>
              <input required placeholder="Jordan Martinez" value={form.full_name} onChange={set('full_name')} />
            </div>

            <div className="form-group">
              <label>Email address</label>
              <input type="email" required placeholder="jordan@example.com" value={form.recipient_email} onChange={set('recipient_email')} />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" required placeholder="••••••••••" value={form.password} onChange={set('password')} />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  id="wallet-cb"
                  readOnly
                  checked={!!form.wallet_address}
                  style={{ width: 'auto', accentColor: 'var(--green)' }}
                />
                <label htmlFor="wallet-cb" style={{ margin: 0, textTransform: 'none', fontSize: 13, letterSpacing: 0, cursor: 'pointer' }}>
                  Ethereum wallet address
                </label>
              </div>

              {walletConnected ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(63,185,80,0.1)', border: '1px solid var(--green)',
                  borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13,
                  color: 'var(--green-bright)',
                }}>
                  <span style={{ fontSize: 16 }}>✓</span>
                  {shortAddr(form.wallet_address)} connected
                </div>
              ) : (
                <input
                  placeholder="Connect via MetaMask or paste address…"
                  value={form.wallet_address}
                  onChange={set('wallet_address')}
                />
              )}

              <button
                type="button"
                onClick={connectMetaMask}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '9px 14px',
                  background: '#1a73e8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>🦊</span> Connect MetaMask
                <span style={{
                  marginLeft: 8, fontSize: 11, background: 'rgba(255,255,255,0.2)',
                  padding: '2px 6px', borderRadius: 4,
                }}>Recommended</span>
              </button>

              {walletErr && (
                <p style={{ color: 'var(--yellow)', fontSize: 12, marginTop: 8 }}>{walletErr}</p>
              )}
            </div>

            <div style={{
              background: 'rgba(210,153,34,0.1)', border: '1px solid var(--yellow)',
              borderRadius: 'var(--radius)', padding: '10px 12px',
              fontSize: 12, color: 'var(--yellow)', marginBottom: 16, display: 'flex', gap: 8,
            }}>
              <span>⚠</span>
              Your application requires admin approval before disbursements begin.
            </div>

            {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '10px', background: 'var(--bg-card)',
                color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Creating account…' : 'Create account'}
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
