import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import VerificationModal from '../components/VerificationModal'

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
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
      fontSize: 12, padding: '0 4px', verticalAlign: 'middle',
    }}>
      {copied ? '✓' : '⧉'}
    </button>
  )
}

function WalletCard({ token, userId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [form, setForm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verificationUrl, setVerificationUrl] = useState(null)
  const [resultMsg, setResultMsg] = useState('')
  const pollRef = useRef(null)

  async function load() {
    try {
      const data = await apiFetch(`/recipients/${userId}`, {}, token)
      setProfile(data)
      return data
    } catch (e) {
      setErr(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token, userId])

  useEffect(() => {
    if (!profile?.pending_wallet_address) return
    const pendingAddr = profile.pending_wallet_address
    pollRef.current = setInterval(async () => {
      const updated = await load()
      if (updated && !updated.pending_wallet_address) {
        clearInterval(pollRef.current)
        setVerificationUrl(null)
        setResultMsg(
          updated.wallet_address === pendingAddr
            ? 'Your wallet address was updated successfully.'
            : 'The wallet change was not approved. Your previous address is still active.'
        )
      }
    }, 4000)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.pending_wallet_address])

  async function submitRotation(e) {
    e.preventDefault()
    setErr('')
    setResultMsg('')
    setSubmitting(true)
    try {
      const data = await apiFetch('/auth/recipient/wallet-rotation', {
        method: 'POST',
        body: JSON.stringify({ new_wallet_address: form }),
      }, token)
      setVerificationUrl(data.verification_url)
      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="card"><div className="empty">Loading…</div></div>

  const pending = profile?.pending_wallet_address

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <span className="card-title">Wallet address</span>
      </div>

      {resultMsg && (
        <p style={{ fontSize: 13, color: 'var(--green-bright)', marginBottom: 12 }}>{resultMsg}</p>
      )}

      {pending ? (
        <div style={{
          background: 'rgba(255,196,0,0.1)', border: '1px solid var(--yellow)',
          borderRadius: 'var(--radius)', padding: '10px 12px', fontSize: 13,
          color: 'var(--yellow)', marginBottom: 16,
        }}>
          Wallet rotation to <span className="td-mono">{shortAddr(pending)}</span> is awaiting identity reverification.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span className="wallet" title={profile?.wallet_address}>{shortAddr(profile?.wallet_address)}</span>
            <CopyButton text={profile?.wallet_address} />
          </div>
          <form onSubmit={submitRotation}>
            <div className="form-group">
              <label>New wallet address</label>
              <input required placeholder="0x..." value={form} onChange={e => setForm(e.target.value)} />
            </div>
            {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{err}</p>}
            <button type="submit" className="btn btn-green" disabled={submitting}>
              {submitting ? 'Starting…' : 'Request wallet change'}
            </button>
          </form>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            Changing your wallet requires a quick selfie reverification to confirm it's really you.
          </p>
        </>
      )}

      {verificationUrl && (
        <VerificationModal verificationUrl={verificationUrl} onClose={() => setVerificationUrl(null)} />
      )}
    </div>
  )
}

function ReverifyCard({ token }) {
  const { refreshMe } = useAuth()
  const [verificationUrl, setVerificationUrl] = useState(null)
  const [err, setErr] = useState('')
  const [starting, setStarting] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    if (!verificationUrl) return
    pollRef.current = setInterval(() => {
      refreshMe(token).catch(() => {})
    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [verificationUrl, token, refreshMe])

  async function startReverify() {
    setErr('')
    setStarting(true)
    try {
      const data = await apiFetch('/auth/recipient/reverify', { method: 'POST' }, token)
      setVerificationUrl(data.verification_url)
    } catch (e) {
      setErr(e.message)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Re-verify identity</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Legally changed your name (marriage, court order) or need to resubmit updated ID documents?
        Start a new verification session below.
      </p>
      {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <button className="btn btn-outline" onClick={startReverify} disabled={starting}>
        {starting ? 'Starting…' : 'Update legal documents'}
      </button>

      {verificationUrl && (
        <VerificationModal verificationUrl={verificationUrl} onClose={() => setVerificationUrl(null)} />
      )}
    </div>
  )
}

export default function Wallet() {
  const { token, userId } = useAuth()

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Wallet</div>
          <div className="page-subtitle">Manage your wallet address and identity verification</div>
        </div>
      </div>
      <WalletCard token={token} userId={userId} />
      <ReverifyCard token={token} />
    </>
  )
}
