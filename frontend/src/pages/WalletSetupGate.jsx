import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { WALLET_CONNECTORS, AUTH_CONNECTION } from '@web3auth/modal'
import { useWeb3AuthConnect } from '@web3auth/modal/react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

const web3AuthConfigured = !!import.meta.env.VITE_WEB3AUTH_CLIENT_ID

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
}

// Only ever rendered when the app is wrapped in Web3AuthProvider/WagmiProvider
// (i.e. web3AuthConfigured is true) — see main.jsx — so these hooks always have
// the context they need.
function EmbeddedWalletCreate({ onCreated }) {
  const { token } = useAuth()
  const { connectTo, error: connectError } = useWeb3AuthConnect()
  const { address, isConnected } = useAccount()
  const [starting, setStarting] = useState(false)
  const [err, setErr] = useState('')
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      onCreated(address, 'embedded').catch(() => {}).finally(() => setStarting(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address])

  // connectTo() can fail without rejecting its promise — the SDK surfaces the
  // failure through this hook's own error state instead, so it must be
  // watched separately or `starting` would be stuck forever on failure.
  useEffect(() => {
    if (connectError) {
      setErr(connectError.message || 'Could not connect. Please try again or use an existing wallet.')
      setStarting(false)
    }
  }, [connectError])

  async function create() {
    setErr('')
    setStarting(true)
    try {
      const { wallet_id_token } = await apiFetch('/auth/recipient/wallet-token', { method: 'POST' }, token)
      const connection = await connectTo(WALLET_CONNECTORS.AUTH, {
        authConnection: AUTH_CONNECTION.CUSTOM,
        authConnectionId: import.meta.env.VITE_WEB3AUTH_AUTH_CONNECTION_ID,
        idToken: wallet_id_token,
        extraLoginOptions: { isUserIdCaseSensitive: true },
      })
      if (!connection) setStarting(false)
    } catch (e) {
      if (e.status === 503) setUnavailable(true)
      else setErr(e.message)
      setStarting(false)
    }
  }

  if (unavailable) return null

  return (
    <>
      <button className="btn btn-green" onClick={create} disabled={starting} style={{ width: '100%', justifyContent: 'center' }}>
        {starting ? 'Creating wallet…' : 'Create my wallet'}
      </button>
      {err && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{err}</p>}
    </>
  )
}

function ExistingWalletConnect({ onCreated }) {
  const [address, setAddress] = useState('')
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletErr, setWalletErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum

  async function connectMetaMask() {
    setWalletErr('')
    if (!window.ethereum) {
      setWalletErr('MetaMask not detected in this browser.')
      return
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAddress(accounts[0])
      setWalletConnected(true)
    } catch (e) {
      setWalletErr(e.message)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setWalletErr('')
    if (!address) {
      setWalletErr('Please connect MetaMask or paste your wallet address.')
      return
    }
    setSubmitting(true)
    try {
      await onCreated(address, 'external')
    } catch (e) {
      setWalletErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <input
            type="checkbox"
            id="wallet-cb"
            readOnly
            checked={!!address}
            style={{ width: 'auto', accentColor: 'var(--green)' }}
          />
          <label htmlFor="wallet-cb" style={{ margin: 0, textTransform: 'none', fontSize: 13, letterSpacing: 0, cursor: 'pointer' }}>
            Ethereum wallet address
          </label>
        </div>

        {walletConnected ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,201,123,0.08)', border: '1px solid var(--green)',
            borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13,
            color: 'var(--green-bright)',
          }}>
            <span style={{ fontSize: 16 }}>✓</span>
            {shortAddr(address)} connected
          </div>
        ) : (
          <input
            placeholder="Paste an address you already control, or connect below…"
            value={address}
            onChange={e => setAddress(e.target.value)}
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

      <button type="submit" className="btn btn-green" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
        {submitting ? 'Saving…' : 'Use this wallet'}
      </button>
    </form>
  )
}

export default function WalletSetupGate() {
  const { token, refreshMe, logout } = useAuth()
  const [showExisting, setShowExisting] = useState(!web3AuthConfigured)
  const [err, setErr] = useState('')

  async function finalize(wallet_address, wallet_type) {
    setErr('')
    try {
      await apiFetch('/auth/recipient/wallet', {
        method: 'POST',
        body: JSON.stringify({ wallet_address, wallet_type }),
      }, token)
      await refreshMe(token)
    } catch (e) {
      setErr(e.message)
      throw e
    }
  }

  return (
    <div className="empty" style={{ paddingTop: 80, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>👛</div>
      <div style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Set up your wallet</div>
      <div style={{ fontSize: 14, marginBottom: 20 }}>
        Your monthly USDC dividend is sent directly to an Ethereum wallet — think of it like an account
        number. You don't need to add any money to it; ChainBase deposits funds automatically once you're
        verified.
      </div>

      {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}

      <div className="card" style={{ padding: 24, textAlign: 'left' }}>
        {!showExisting && (
          <>
            <EmbeddedWalletCreate onCreated={finalize} />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowExisting(true)}
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            >
              I already have a wallet
            </button>
          </>
        )}
        {showExisting && <ExistingWalletConnect onCreated={finalize} />}
        {showExisting && web3AuthConfigured && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowExisting(false)}
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          >
            Back
          </button>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={logout}>Log out</button>
      </div>
    </div>
  )
}
