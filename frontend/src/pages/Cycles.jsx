import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'

export default function Cycles() {
  const { token } = useAuth()
  const [cycles, setCycles]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ amount_per_recipient: '', scheduled_date: '' })
  const [formErr, setFormErr]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErr('')
      try {
        const data = await apiFetch('/cycles', {}, token)
        setCycles(data ?? [])
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function createCycle(e) {
    e.preventDefault()
    setFormErr('')
    setSubmitting(true)
    try {
      const created = await apiFetch('/cycles', {
        method: 'POST',
        body: JSON.stringify({
          amount_per_recipient: Number(form.amount_per_recipient),
          scheduled_date: form.scheduled_date,
        }),
      }, token)
      setCycles(prev => [...prev, created])
      setShowModal(false)
      setForm({ amount_per_recipient: '', scheduled_date: '' })
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>

  const completed = cycles.filter(c => c.status === 'completed').length
  const pending   = cycles.filter(c => c.status === 'pending').length
  const totalPaid = cycles
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + Number(c.amount_per_recipient) * (c.total_recipients ?? 0), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Citizens Dividend</div>
          <div className="page-subtitle">Disbursement cycles</div>
        </div>
        <button className="btn btn-green" onClick={() => setShowModal(true)}>+ New Citizens Dividend</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Total Cycles"    value={cycles.length} />
        <StatCard label="Completed"       value={completed} color="green" />
        <StatCard label="Total Disbursed" value={`$${totalPaid.toLocaleString()}`} color="green" />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Cycles ({cycles.length})</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount / Recipient</th>
                <th>Recipients</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cycles.length === 0 && (
                <tr><td colSpan={6} className="empty">No cycles yet. Create one above.</td></tr>
              )}
              {cycles.map(c => (
                <tr key={c.cycle_id}>
                  <td className="td-muted">#{c.cycle_id}</td>
                  <td>${Number(c.amount_per_recipient).toFixed(2)}</td>
                  <td className="td-muted">{c.total_recipients ?? 0}</td>
                  <td>{c.scheduled_date?.slice(0, 10) ?? '—'}</td>
                  <td><Badge status={c.status} /></td>
                  <td>
                    <Link to={`/cycles/${c.cycle_id}`} className="btn btn-outline btn-sm">View</Link>
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
            <div className="modal-title">New Citizens Dividend</div>
            <div className="form-group">
              <label>Amount per Recipient ($)</label>
              <input
                type="number"
                min="1"
                autoFocus
                value={form.amount_per_recipient}
                onChange={e => setForm(f => ({ ...f, amount_per_recipient: e.target.value }))}
                placeholder="1,000"
              />
            </div>
            <div className="form-group">
              <label>Scheduled Date</label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
              />
            </div>
            {formErr && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{formErr}</p>}
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-green" disabled={submitting} onClick={createCycle}>
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
