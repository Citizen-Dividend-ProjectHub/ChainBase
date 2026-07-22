import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import VerificationModal from '../components/VerificationModal'

const COPY = {
  pending: {
    title: 'Verify your identity',
    body: 'ChainBase requires a one-time identity check before you can access your dashboard. This confirms you\'re a real, unique person so disbursements stay fraud-free.',
  },
  in_review: {
    title: 'Your verification is being reviewed',
    body: 'We\'ve received your documents and they\'re being reviewed. This page will unlock automatically the moment a decision comes back — no need to refresh.',
  },
  declined: {
    title: 'Verification declined',
    body: 'Your identity verification was declined. If you believe this is a mistake, please contact support for help.',
  },
  flagged_duplicate: {
    title: 'Under review',
    body: 'Your account is under review by our team. We\'ll follow up by email once it\'s resolved.',
  },
}

export default function VerificationGate({ status }) {
  const { token, refreshMe, logout } = useAuth()
  const [verificationUrl, setVerificationUrl] = useState(null)
  const [err, setErr] = useState('')
  const [starting, setStarting] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    pollRef.current = setInterval(() => {
      refreshMe(token).catch(() => {})
    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [token, refreshMe])

  async function startVerification() {
    setErr('')
    setStarting(true)
    try {
      const data = await apiFetch('/auth/recipient/verification', { method: 'POST' }, token)
      setVerificationUrl(data.verification_url)
    } catch (e) {
      setErr(e.message)
    } finally {
      setStarting(false)
    }
  }

  const copy = COPY[status] ?? COPY.pending
  const canRetry = status === 'pending' || status === 'in_review'

  return (
    <div className="empty" style={{ paddingTop: 80, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🪪</div>
      <div style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>{copy.title}</div>
      <div style={{ fontSize: 14, marginBottom: 20 }}>{copy.body}</div>
      {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}
      {canRetry && (
        <button className="btn btn-green" onClick={startVerification} disabled={starting}>
          {starting ? 'Starting…' : 'Start verification'}
        </button>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={logout}>Log out</button>
      </div>

      {verificationUrl && (
        <VerificationModal verificationUrl={verificationUrl} onClose={() => setVerificationUrl(null)} />
      )}
    </div>
  )
}
