import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import NameChangeReviewModal from '../components/NameChangeReviewModal'
import RevokeReviewModal from '../components/RevokeReviewModal'

function shortWallet(w) {
  if (!w) return '—'
  return w.slice(0, 6) + '...' + w.slice(-4)
}

export default function Recipients() {
  const { token, userId } = useAuth()
  const [recipients, setRecipients] = useState([])
  const [filter, setFilter]         = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const PAGE_SIZE = 15
  const [loading, setLoading]       = useState(true)
  const [err, setErr]               = useState('')
  const [actionErr, setActionErr]   = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({ full_name: '', recipient_email: '', wallet_address: '' })
  const [formErr, setFormErr]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewing, setReviewing]   = useState(null)

  const [revocationRequests, setRevocationRequests] = useState([])
  const [revokeTarget, setRevokeTarget]       = useState(null)
  const [revokeReason, setRevokeReason]       = useState('')
  const [revokeSubmitting, setRevokeSubmitting] = useState(false)
  const [revokeErr, setRevokeErr]             = useState('')
  const [reviewingRevocation, setReviewingRevocation] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setErr('')
      try {
        const [data, requests] = await Promise.all([
          apiFetch('/recipients', {}, token),
          apiFetch('/recipients/revocation-requests', {}, token),
        ])
        setRecipients(data ?? [])
        setRevocationRequests(requests ?? [])
      } catch (e) { setErr(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [token])

  useEffect(() => { setPage(1) }, [search, filter, verificationFilter])

  function pendingRevocationFor(recipientId) {
    return revocationRequests.find(rr => rr.recipient_id === recipientId)
  }

  async function reinstate(r) {
    setActionErr('')
    try {
      await apiFetch(`/recipients/${r.recipient_id}/reinstate`, { method: 'PATCH' }, token)
      setRecipients(prev => prev.map(x =>
        x.recipient_id === r.recipient_id ? { ...x, is_eligible: true } : x
      ))
    } catch (e) { setActionErr(e.message) }
  }

  async function submitRevokeRequest(e) {
    e.preventDefault()
    setRevokeErr('')
    if (!revokeReason.trim()) {
      setRevokeErr('A reason is required.')
      return
    }
    setRevokeSubmitting(true)
    try {
      const request = await apiFetch(`/recipients/${revokeTarget.recipient_id}/revoke`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: revokeReason.trim() }),
      }, token)
      setRevocationRequests(prev => [...prev, {
        ...request,
        recipient_name: revokeTarget.full_name,
        requested_by_name: 'You',
      }])
      setRevokeTarget(null)
      setRevokeReason('')
    } catch (e) {
      setRevokeErr(e.message)
    } finally {
      setRevokeSubmitting(false)
    }
  }

  async function resolveRevocation(request, action) {
    setActionErr('')
    try {
      await apiFetch(`/recipients/revocation-requests/${request.request_id}/${action}`, { method: 'PATCH' }, token)
      setRevocationRequests(prev => prev.filter(rr => rr.request_id !== request.request_id))
      if (action === 'approve') {
        setRecipients(prev => prev.map(x =>
          x.recipient_id === request.recipient_id ? { ...x, is_eligible: false } : x
        ))
      }
      setReviewingRevocation(null)
    } catch (e) { setActionErr(e.message) }
  }

  async function resolveDuplicate(r, action) {
    setActionErr('')
    try {
      const updated = await apiFetch(`/recipients/${r.recipient_id}/resolve-duplicate`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }, token)
      setRecipients(prev => prev.map(x =>
        x.recipient_id === r.recipient_id ? { ...x, ...updated } : x
      ))
    } catch (e) { setActionErr(e.message) }
  }

  async function resolveNameChange(r, action) {
    setActionErr('')
    try {
      const updated = await apiFetch(`/recipients/${r.recipient_id}/resolve-name-change`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }, token)
      setRecipients(prev => prev.map(x =>
        x.recipient_id === r.recipient_id ? { ...x, ...updated } : x
      ))
      setReviewing(null)
    } catch (e) { setActionErr(e.message) }
  }

  async function enroll(e) {
    e.preventDefault()
    setFormErr('')
    setSubmitting(true)
    try {
      const newRecipient = await apiFetch('/recipients', {
        method: 'POST',
        body: JSON.stringify(form),
      }, token)
      setRecipients(prev => [...prev, newRecipient])
      setShowModal(false)
      setForm({ full_name: '', recipient_email: '', wallet_address: '' })
    } catch (e) { setFormErr(e.message) }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>

  const total      = recipients.length
  const eligible   = recipients.filter(r => r.is_eligible).length
  const ineligible = total - eligible
  const flagged    = recipients.filter(r => r.verification_status === 'flagged_duplicate').length

  const q = search.trim().toLowerCase()
  const filtered = (filter === 'all'     ? recipients
                : filter === 'eligible' ? recipients.filter(r => r.is_eligible)
                :                         recipients.filter(r => !r.is_eligible))
    .filter(r => verificationFilter === 'all' || r.verification_status === verificationFilter)
    .filter(r => !q || r.full_name.toLowerCase().includes(q) || (r.recipient_email ?? '').toLowerCase().includes(q))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Recipients</div>
          <div className="page-subtitle">Manage Citizens Dividend recipients</div>
        </div>
        <button className="btn btn-green" onClick={() => setShowModal(true)}>+ Enroll Recipient</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Total Recipients" value={total} />
        <StatCard label="Eligible"         value={eligible}   color="green" />
        <StatCard label="Ineligible"       value={ineligible} color="yellow" />
        <StatCard label="Flagged"          value={flagged}    color="red" />
      </div>

      {actionErr && (
        <div style={{
          background: 'rgba(255,59,59,0.1)', border: '1px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 20,
          fontSize: 13, color: 'var(--red)',
        }}>
          {actionErr}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Recipients ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200, padding: '5px 10px', fontSize: 13 }}
            />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
            >
              <option value="all">All</option>
              <option value="eligible">Eligible</option>
              <option value="ineligible">Ineligible</option>
            </select>
            <select
              value={verificationFilter}
              onChange={e => setVerificationFilter(e.target.value)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
            >
              <option value="all">All verification</option>
              <option value="pending">Pending</option>
              <option value="in_review">In review</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="flagged_duplicate">Flagged</option>
              <option value="name_change_review">Name change review</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Email</th><th>Wallet</th><th>Status</th><th>Verification</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} className="empty">No recipients match this filter.</td></tr>
              )}
              {visible.map(r => (
                <tr key={r.recipient_id}>
                  <td className="td-muted">{r.recipient_id}</td>
                  <td>{r.full_name}</td>
                  <td className="td-muted">{r.recipient_email ?? '—'}</td>
                  <td><span className="wallet" title={r.wallet_address}>{shortWallet(r.wallet_address)}</span></td>
                  <td><Badge status={r.is_eligible ? 'eligible' : 'ineligible'} /></td>
                  <td><Badge status={r.verification_status} /></td>
                  <td>
                    {r.verification_status === 'flagged_duplicate' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-green" onClick={() => resolveDuplicate(r, 'approve')}>Approve</button>
                        <button className="btn btn-sm btn-red" onClick={() => resolveDuplicate(r, 'reject')}>Reject</button>
                      </div>
                    ) : r.verification_status === 'name_change_review' ? (
                      <button className="btn btn-sm btn-outline" onClick={() => setReviewing(r)}>Review</button>
                    ) : pendingRevocationFor(r.recipient_id) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="badge badge-yellow">Revoke pending</span>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setReviewingRevocation(pendingRevocationFor(r.recipient_id))}
                        >
                          Review
                        </button>
                      </div>
                    ) : r.is_eligible ? (
                      <button className="btn btn-sm btn-red" onClick={() => setRevokeTarget(r)}>Revoke</button>
                    ) : (
                      <button className="btn btn-sm btn-green" onClick={() => reinstate(r)}>Reinstate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 0' }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">Enroll New Recipient</div>
            <form onSubmit={enroll}>
              <div className="form-group">
                <label>Full Name</label>
                <input required placeholder="Jordan Martinez"
                  value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" required placeholder="jordan@example.com"
                  value={form.recipient_email} onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Ethereum Wallet Address</label>
                <input required placeholder="0x..."
                  value={form.wallet_address} onChange={e => setForm(f => ({ ...f, wallet_address: e.target.value }))} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                A temporary password will be generated. The recipient should reset it on first login.
              </p>
              {formErr && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{formErr}</p>}
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-green" disabled={submitting}>
                  {submitting ? 'Enrolling…' : 'Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewing && (
        <NameChangeReviewModal
          recipient={reviewing}
          onResolve={action => resolveNameChange(reviewing, action)}
          onClose={() => setReviewing(null)}
        />
      )}

      {revokeTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRevokeTarget(null)}>
          <div className="modal">
            <div className="modal-title">Request revocation — {revokeTarget.full_name}</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              This won't take effect immediately — another admin has to review and approve it first.
            </p>
            <form onSubmit={submitRevokeRequest}>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  required rows={4}
                  placeholder="Why should this recipient's eligibility be revoked?"
                  value={revokeReason}
                  onChange={e => setRevokeReason(e.target.value)}
                />
              </div>
              {revokeErr && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{revokeErr}</p>}
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setRevokeTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-red" disabled={revokeSubmitting}>
                  {revokeSubmitting ? 'Submitting…' : 'Submit for review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewingRevocation && (
        <RevokeReviewModal
          request={reviewingRevocation}
          canReview={String(reviewingRevocation.requested_by) !== String(userId)}
          onResolve={action => resolveRevocation(reviewingRevocation, action)}
          onClose={() => setReviewingRevocation(null)}
        />
      )}
    </>
  )
}
