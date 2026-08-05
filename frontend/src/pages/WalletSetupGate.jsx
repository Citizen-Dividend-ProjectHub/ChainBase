import { useEffect, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { WALLET_CONNECTORS, AUTH_CONNECTION } from '@web3auth/modal'
import { useWeb3AuthConnect, useWalletUI } from '@web3auth/modal/react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import VirtualCard from '../components/VirtualCard'
import CardAddressForm from '../components/CardAddressForm'

const web3AuthConfigured = !!import.meta.env.VITE_WEB3AUTH_CLIENT_ID

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
}

function WalletIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
      <path d="M3 8v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-4a2 2 0 1 0 0 4" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="12" height="12" rx="1.5" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={copy} title="Copy wallet address" style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: copied ? 'var(--green-bright)' : 'var(--text-muted)',
      fontSize: 13, padding: '0 4px', verticalAlign: 'middle',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {copied ? '✓ Copied' : <><CopyIcon /> Copy</>}
    </button>
  )
}

// Only ever rendered when the app is wrapped in Web3AuthProvider/WagmiProvider
// (i.e. web3AuthConfigured is true) — see main.jsx — so these hooks always have
// the context they need.
function EmbeddedWalletCreate({ onCreated }) {
  const { token } = useAuth()
  const { connectTo, error: connectError } = useWeb3AuthConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [starting, setStarting] = useState(false)
  const [err, setErr] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  // wagmi persists its last connection in localStorage across page loads/accounts —
  // a leftover connection from a different recipient in this same browser must never
  // be silently attributed to whoever is logged in now. If we're already "connected"
  // the moment this mounts, that's stale state, not a result of this session's own
  // connectTo() call — force a clean disconnect and wait for it before trusting anything.
  const [clearingStale, setClearingStale] = useState(isConnected)

  useEffect(() => {
    if (clearingStale) disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (clearingStale && !isConnected) setClearingStale(false)
  }, [clearingStale, isConnected])

  useEffect(() => {
    if (!clearingStale && isConnected && address) {
      onCreated(address, 'embedded').catch(() => {}).finally(() => setStarting(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearingStale, isConnected, address])

  // connectTo() can fail without rejecting its promise — the SDK surfaces the
  // failure through this hook's own error state instead, so it must be
  // watched separately or `starting` would be stuck forever on failure.
  // It can also set this error transiently mid-flow (e.g. an optional endpoint
  // 404ing) even when the connection goes on to succeed a moment later — wait
  // briefly and only show it if we still aren't connected by then, so a real
  // success is never followed by a confusing flash of "could not connect".
  useEffect(() => {
    if (!connectError) return
    const t = setTimeout(() => {
      if (isConnected && address) return
      setErr(connectError.message || 'Could not connect. Please try again or use an existing wallet.')
      setStarting(false)
    }, 1500)
    return () => clearTimeout(t)
  }, [connectError, isConnected, address])

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

// Only ever rendered when web3AuthConfigured is true (same guard as
// EmbeddedWalletCreate), since useWalletUI() needs the Web3AuthProvider context.
function ManageWalletButton() {
  const { showWalletUI } = useWalletUI()
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>
        Want to move funds elsewhere, or need your private key?
      </div>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => showWalletUI()}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Manage your wallet
      </button>
    </div>
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
            background: 'var(--cb-accent-soft)', border: '1px solid var(--cb-accent)',
            borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13,
            color: 'var(--cb-accent)',
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
              background: 'var(--cb-accent)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Connect MetaMask
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
                color: 'var(--cb-accent)', textDecoration: 'none', fontWeight: 500,
              }}
            >
              Install MetaMask →
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
  const { token, userName, refreshMe, logout } = useAuth()
  const [showExisting, setShowExisting] = useState(!web3AuthConfigured)
  const [err, setErr] = useState('')
  const [createdWallet, setCreatedWallet] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const [cardPhase, setCardPhase] = useState('ask') // 'ask' | 'address' | 'revealed'
  const [cardErr, setCardErr] = useState('')
  const [requestingCard, setRequestingCard] = useState(false)

  async function finalize(wallet_address, wallet_type) {
    setErr('')
    try {
      await apiFetch('/auth/recipient/wallet', {
        method: 'POST',
        body: JSON.stringify({ wallet_address, wallet_type }),
      }, token)
      // Don't refreshMe() (which flips routing straight to the dashboard) until the
      // recipient has actually seen and acknowledged the address — otherwise a wallet
      // can be created with no visible confirmation of what just happened or where.
      setCreatedWallet({ address: wallet_address, type: wallet_type })
    } catch (e) {
      setErr(e.message)
      throw e
    }
  }

  async function continueToDashboard() {
    setContinuing(true)
    await refreshMe(token)
  }

  async function requestCard(mailing_address) {
    setCardErr('')
    setRequestingCard(true)
    try {
      await apiFetch('/auth/recipient/card', {
        method: 'POST',
        body: JSON.stringify({ mailing_address }),
      }, token)
      setCardPhase('revealed')
    } catch (e) {
      setCardErr(e.message)
    } finally {
      setRequestingCard(false)
    }
  }

  if (createdWallet && cardPhase === 'revealed') {
    return (
      <div className="empty" style={{ paddingTop: 80, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: 12, color: 'var(--cb-muted)', display: 'flex', justifyContent: 'center' }}><CheckCircleIcon /></div>
        <div style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Your card is ready</div>
        <div style={{ fontSize: 14, marginBottom: 24 }}>
          You can use your digital card right away. We've saved your mailing address for ChainBase's
          physical card program — we'll follow up by email once physical cards are available to ship.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VirtualCard address={createdWallet.address} name={userName} animate />
        </div>
        <button
          className="btn btn-green"
          onClick={continueToDashboard}
          disabled={continuing}
          style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
        >
          {continuing ? 'Loading…' : 'Continue to dashboard'}
        </button>
      </div>
    )
  }

  if (createdWallet && cardPhase === 'address') {
    return (
      <div className="empty" style={{ paddingTop: 80, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: 12, color: 'var(--cb-muted)', display: 'flex', justifyContent: 'center' }}><MailIcon /></div>
        <div style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Where should we send it?</div>
        <div style={{ fontSize: 14, marginBottom: 20 }}>
          We'll save this mailing address for ChainBase's card program, so it's ready when physical
          cards become available.
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'left' }}>
          <CardAddressForm onSubmit={requestCard} submitting={requestingCard} err={cardErr} />
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setCardPhase('ask')}
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
        >
          Back
        </button>
      </div>
    )
  }

  if (createdWallet) {
    return (
      <div className="empty" style={{ paddingTop: 80, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: 12, color: 'var(--cb-muted)', display: 'flex', justifyContent: 'center' }}><CheckCircleIcon /></div>
        <div style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Wallet created</div>
        <div style={{ fontSize: 14, marginBottom: 20 }}>
          {createdWallet.type === 'embedded'
            ? "ChainBase created this wallet for you automatically — you don't need to do anything else with it."
            : 'This wallet is now linked to your account.'} Your monthly USDC dividend will be sent here.
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'left' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Your wallet address
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, wordBreak: 'break-all' }}>
            {createdWallet.address} <CopyButton text={createdWallet.address} />
          </div>
          {web3AuthConfigured && createdWallet.type === 'embedded' && <ManageWalletButton />}
        </div>

        <div style={{ marginTop: 20, textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            Want a ChainBase card to spend your USDC?
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Your digital card is linked to the wallet address above automatically.
          </div>
          <button
            className="btn btn-green"
            onClick={() => setCardPhase('address')}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Get my ChainBase card
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={continueToDashboard}
            disabled={continuing}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {continuing ? 'Loading…' : 'Skip for now'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="empty" style={{ paddingTop: 80, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: 12, color: 'var(--cb-muted)', display: 'flex', justifyContent: 'center' }}><WalletIcon /></div>
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
