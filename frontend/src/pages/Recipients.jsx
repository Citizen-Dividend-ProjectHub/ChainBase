import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'

function shortWallet(w) {
  if (!w) return '—'
  return w.slice(0, 6) + '...' + w.slice(-4)
}

export default function Recipients() {
  const { token } = useAuth()
  const [recipients, setRecipients] = useState([])
  const [filter, setFilter]         = useState('all')
  const [loading, setLoading]       = useState(true)
  const [err, setErr]               = useState('')
  const [actionErr, setActionErr]   = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({ full_name: '', recipient_email: '', wallet_address: '' })
  const [formErr, setFormErr]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true); setErr('')
      try {
        const data = await apiFetch('/recipients', {}, token)
        setRecipients(data ?? [])
      } catch (e) { setErr(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [token])

  async function toggleEligibility(r) {
    setActionErr('')
    const path = r.is_eligible
      ? `/recipients/${r.recipient_id}/revoke`
      : `/recipients/${r.recipient_id}/reinstate`
    try {
      await apiFetch(path, { method: 'PATCH' }, token)
      setRecipients(prev => prev.map(x =>
        x.recipient_id === r.recipient_id ? { ...x, is_eligible: !x.is_eligible } : x
      ))
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

  const visible = filter === 'all'     ? recipients
               : filter === 'eligible' ? recipients.filter(r => r.is_eligible)
               :                         recipients.filter(r => !r.is_eligible)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Recipients</div>
          <div className="page-subtitle">Manage Citizens Dividend recipients</div>
        </div>
        <button className="btn btn-green" onClick={() => setShowModal(true)}>+ Enroll Recipient</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Total Recipients" value={total} />
        <StatCard label="Eligible"         value={eligible}   color="green" />
        <StatCard label="Ineligible"       value={ineligible} color="yellow" />
      </div>

      {actionErr && (
        <div style={{
          background: 'rgba(248,81,73,0.1)', border: '1px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 20,
          fontSize: 13, color: 'var(--red)',
        }}>
          {actionErr}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Recipients ({visible.length})</span>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
          >
            <option value="all">All</option>
            <option value="eligible">Eligible</option>
            <option value="ineligible">Ineligible</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Email</th><th>Wallet</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={6} className="empty">No recipients match this filter.</td></tr>
              )}
              {visible.map(r => (
                <tr key={r.recipient_id}>
                  <td className="td-muted">{r.recipient_id}</td>
                  <td>{r.full_name}</td>
                  <td className="td-muted">{r.recipient_email ?? '—'}</td>
                  <td><span className="wallet" title={r.wallet_address}>{shortWallet(r.wallet_address)}</span></td>
                  <td><Badge status={r.is_eligible ? 'eligible' : 'ineligible'} /></td>
                  <td>
                    <button
                      className={`btn btn-sm ${r.is_eligible ? 'btn-red' : 'btn-green'}`}
                      onClick={() => toggleEligibility(r)}
                    >
                      {r.is_eligible ? 'Revoke' : 'Reinstate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </>
  )
}
