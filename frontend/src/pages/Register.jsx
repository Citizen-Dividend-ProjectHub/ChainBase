import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
}

const STEPS = [
  { n: 1, label: 'Account' },
  { n: 2, label: 'Wallet' },
  { n: 3, label: 'Verify' },
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
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ full_name: '', recipient_email: '', password: '', wallet_address: '' })
  const [walletConnected, setWalletConnected] = useState(false)
  const [err, setErr]       = useState('')
  const [walletErr, setWalletErr] = useState('')
  const [loading, setLoading]   = useState(false)

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function continueToWallet(e) {
    e.preventDefault()
    setErr('')
    if (!form.full_name || !form.recipient_email || !form.password) {
      setErr('Please fill in all fields.')
      return
    }
    setStep(2)
  }

  async function connectMetaMask() {
    setWalletErr('')
    if (!window.ethereum) {
      setWalletErr('MetaMask not detected in this browser.')
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

  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum

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
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>
            Chain<span style={{ color: 'var(--green-bright)' }}>Base</span>
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            Citizens Dividend Program
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <StepIndicator step={step} />

          {step === 1 && (
            <form onSubmit={continueToWallet}>
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

              {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}

              <button type="submit" className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }}>
                Continue
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Your monthly USDC dividend is sent directly to an Ethereum wallet address — think of it like an
                account number. You don't need to add any money to it; ChainBase deposits funds automatically
                once you're verified.
              </p>

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
                    background: 'rgba(63,185,80,0.08)', border: '1px solid var(--green)',
                    borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13,
                    color: 'var(--green-bright)',
                  }}>
                    <span style={{ fontSize: 16 }}>✓</span>
                    {shortAddr(form.wallet_address)} connected
                  </div>
                ) : (
                  <input
                    placeholder="Paste an address you already control, or connect below…"
                    value={form.wallet_address}
                    onChange={e => setForm(f => ({ ...f, wallet_address: e.target.value }))}
                  />
                )}

                {hasMetaMask ? (
                  <button
                    type="button"
                    onClick={connectMetaMask}
                    style={{
                      marginTop: 10, width: '100%', padding: '9px 14px',
                      background: 'var(--green)', color: '#fff', border: 'none',
                      borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <span>🦊</span> Connect MetaMask
                    <span style={{
                      marginLeft: 8, fontSize: 11, background: 'rgba(255,255,255,0.2)',
                      padding: '2px 6px', borderRadius: 4,
                    }}>Recommended</span>
                  </button>
                ) : (
                  <div style={{
                    marginTop: 10, background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '12px',
                  }}>
                    <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
                      Don't have a wallet yet? MetaMask is a free, widely-used wallet app that gives you an
                      Ethereum address in a couple of minutes.
                    </p>
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
                        color: 'var(--green-bright)', textDecoration: 'none', fontWeight: 500,
                      }}
                    >
                      🦊 Install MetaMask →
                    </a>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      After installing, come back to this page and refresh to connect — or paste an address above
                      if you already have one from another wallet or exchange.
                    </p>
                  </div>
                )}

                {walletErr && (
                  <p style={{ color: 'var(--yellow)', fontSize: 12, marginTop: 8 }}>{walletErr}</p>
                )}
              </div>

              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '12px', marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Common questions</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <strong style={{ color: 'var(--text)' }}>Is this safe?</strong> We only ever ask for your public
                  address — never your seed phrase or private key. Nobody at ChainBase can access your wallet.
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text)' }}>Do I need money in it first?</strong> No — your wallet
                  just needs to exist. Disbursements are deposited automatically each month.
                </p>
              </div>

              {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button type="submit" className="btn btn-green" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </div>
            </form>
          )}
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
