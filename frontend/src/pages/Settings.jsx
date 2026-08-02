import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import Toggle from '../components/Toggle'

function ProfileCard({ token, me, onSaved }) {
  const [fullName, setFullName] = useState(me.full_name)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr(''); setSaved(false); setSubmitting(true)
    try {
      const updated = await apiFetch('/auth/recipient/profile', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName }),
      }, token)
      onSaved(updated.full_name)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><span className="card-title">Profile</span></div>
      <div style={{ padding: '20px 24px' }}>
        <div className="form-group">
          <label>Email</label>
          <input value={me.recipient_email} disabled />
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Full name</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{err}</p>}
          <button type="submit" className="btn btn-green" disabled={submitting}>
            {submitting ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

function PasswordCard({ token }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr(''); setSaved(false)
    if (newPassword !== confirmPassword) {
      setErr("New passwords don't match.")
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/auth/recipient/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }, token)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><span className="card-title">Password</span></div>
      <div style={{ padding: '20px 24px' }}>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Current password</label>
            <input required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label>New password</label>
            <input required type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Confirm new password</label>
            <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{err}</p>}
          <button type="submit" className="btn btn-green" disabled={submitting}>
            {submitting ? 'Updating…' : saved ? '✓ Updated' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

function NotificationsCard({ token, me }) {
  const [disbursements, setDisbursements] = useState(me.notify_email_disbursements)
  const [verification, setVerification] = useState(me.notify_email_verification)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  async function save(next) {
    setErr(''); setSubmitting(true)
    try {
      await apiFetch('/auth/recipient/notifications', { method: 'PUT', body: JSON.stringify(next) }, token)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Notifications</span></div>
      <div style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
          Email delivery isn't set up yet — these preferences are saved now so they're ready once it is.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text)' }}>Disbursement emails</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>When your monthly dividend is sent.</div>
          </div>
          <Toggle
            checked={disbursements}
            disabled={submitting}
            onChange={v => {
              setDisbursements(v)
              save({ notify_email_disbursements: v, notify_email_verification: verification })
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text)' }}>Verification &amp; account updates</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>When your identity verification status changes.</div>
          </div>
          <Toggle
            checked={verification}
            disabled={submitting}
            onChange={v => {
              setVerification(v)
              save({ notify_email_disbursements: disbursements, notify_email_verification: v })
            }}
          />
        </div>

        {err && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  )
}

export default function Settings() {
  const { token, refreshMe } = useAuth()
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    apiFetch('/auth/me', {}, token)
      .then(setMe)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage your profile, password, and notification preferences</div>
        </div>
      </div>
      <ProfileCard
        token={token}
        me={me}
        onSaved={full_name => { setMe(m => ({ ...m, full_name })); refreshMe(token) }}
      />
      <PasswordCard token={token} />
      <NotificationsCard token={token} me={me} />
    </>
  )
}
