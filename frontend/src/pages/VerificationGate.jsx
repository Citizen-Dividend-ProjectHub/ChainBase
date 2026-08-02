import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import VerificationModal from '../components/VerificationModal'

const FINALIZING_COPY = {
  title: 'Finalizing your verification…',
  body: 'We\'re confirming your results with our verification provider. This page will update automatically — it usually only takes a few seconds.',
}

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
  name_change_review: {
    title: 'Reviewing your updated documents',
    body: 'We noticed your new documents don\'t fully match what we have on file. Our team is reviewing the change manually — we\'ll follow up by email once it\'s resolved.',
  },
}

export default function VerificationGate({ status }) {
  const { token, refreshMe, logout, pendingVerificationUrl, setPendingVerificationUrl } = useAuth()
  const [verificationUrl, setVerificationUrl] = useState(null)
  const [err, setErr] = useState('')
  const [starting, setStarting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    pollRef.current = setInterval(() => {
      refreshMe(token).catch(() => {})
    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [token, refreshMe])

  // Didit's own iframe shows its "you're verified" screen the instant document/liveness
  // capture succeeds, well before our webhook (and possibly a duplicate-identity check)
  // gives us the real decision — without this, closing the modal at that point briefly
  // shows "Start verification" again, since our status is still just 'pending'.
  useEffect(() => {
    if (status !== 'pending' && finalizing) setFinalizing(false)
  }, [status, finalizing])

  useEffect(() => {
    if (!finalizing) return
    const t = setTimeout(() => setFinalizing(false), 90000)
    return () => clearTimeout(t)
  }, [finalizing])

  useEffect(() => {
    if (pendingVerificationUrl) {
      setVerificationUrl(pendingVerificationUrl)
      setPendingVerificationUrl(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  async function deleteAccount() {
    setErr('')
    setDeleting(true)
    try {
      await apiFetch('/auth/recipient/account', { method: 'DELETE' }, token)
      logout()
    } catch (e) {
      setErr(e.message)
      setDeleting(false)
    }
  }

  const copy = finalizing ? FINALIZING_COPY : (COPY[status] ?? COPY.pending)
  const canRetry = !finalizing && (status === 'pending' || status === 'in_review')
  const canDelete = status !== 'approved' && status !== 'name_change_review'

  function handleModalClose() {
    setVerificationUrl(null)
    if (status === 'pending') setFinalizing(true)
  }

  return (
    <div className="empty" style={{ paddingTop: 80, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{finalizing ? '⏳' : '🪪'}</div>
      <div style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>{copy.title}</div>
      <div style={{ fontSize: 14, marginBottom: 20 }}>{copy.body}</div>
      {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</p>}
      {canRetry && (
        <button className="btn btn-green" onClick={startVerification} disabled={starting}>
          {starting ? 'Starting…' : 'Start verification'}
        </button>
      )}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-outline btn-sm" onClick={logout}>Log out</button>
        {canDelete && !confirmingDelete && (
          <button
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete account
          </button>
        )}
      </div>

      {canDelete && confirmingDelete && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          This permanently deletes your account. This can't be undone.
          <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              Cancel
            </button>
            <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff' }} onClick={deleteAccount} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
          </div>
        </div>
      )}

      {verificationUrl && (
        <VerificationModal verificationUrl={verificationUrl} onClose={handleModalClose} />
      )}
    </div>
  )
}
