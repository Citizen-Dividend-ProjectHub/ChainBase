import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'

export default function CycleDetail() {
  const { id } = useParams()
  const { token } = useAuth()
  const [cycle, setCycle]               = useState(null)
  const [disbursements, setDisbursements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [err, setErr]                   = useState('')
  const [triggering, setTriggering]     = useState(false)
  const [triggerMsg, setTriggerMsg]     = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErr('')
      try {
        const [cycleData, disbData] = await Promise.all([
          apiFetch(`/cycles/${id}`,               {}, token),
          apiFetch(`/cycles/${id}/disbursements`, {}, token),
        ])
        setCycle(cycleData)
        setDisbursements(disbData ?? [])
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, token])

  async function triggerCycle() {
    setTriggering(true)
    setTriggerMsg('')
    try {
      await apiFetch(`/cycles/${id}/trigger`, { method: 'POST' }, token)
      setTriggerMsg('Cycle triggered — disbursements queued.')
      setCycle(c => ({ ...c, status: 'processing' }))
      const disbData = await apiFetch(`/cycles/${id}/disbursements`, {}, token)
      setDisbursements(disbData ?? [])
    } catch (e) {
      setTriggerMsg(e.message)
    } finally {
      setTriggering(false)
    }
  }

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>
  if (!cycle)  return <div className="empty">Cycle not found.</div>

  const confirmed = disbursements.filter(d => d.status === 'confirmed').length
  const pending   = disbursements.filter(d => d.status === 'pending').length
  const total     = disbursements.length * Number(cycle.amount_per_recipient)
  const isSuccess = triggerMsg && !triggerMsg.toLowerCase().includes('error') && !triggerMsg.toLowerCase().includes('fail')

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/cycles" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
            ← Citizens Dividend
          </Link>
          <div className="page-title" style={{ marginTop: 4 }}>Cycle #{id}</div>
        </div>
        <button className="btn btn-green" onClick={triggerCycle} disabled={triggering}>
          {triggering ? 'Triggering…' : 'Trigger Disbursement'}
        </button>
      </div>

      {triggerMsg && (
        <div style={{
          background: isSuccess ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
          border: `1px solid ${isSuccess ? 'var(--green)' : 'var(--red)'}`,
          borderRadius: 'var(--radius)',
          padding: '10px 16px', marginBottom: 20,
          fontSize: 13,
          color: isSuccess ? 'var(--green-bright)' : 'var(--red)',
        }}>
          {triggerMsg}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="cycle-meta">
          <div className="meta-item">
            <div className="meta-key">Amount / Recipient</div>
            <div className="meta-val green">${Number(cycle.amount_per_recipient).toFixed(2)}</div>
          </div>
          <div className="meta-item">
            <div className="meta-key">Total Payout</div>
            <div className="meta-val">${total.toFixed(2)}</div>
          </div>
          <div className="meta-item">
            <div className="meta-key">Scheduled Date</div>
            <div className="meta-val" style={{ fontSize: 14, fontWeight: 600 }}>
              {cycle.scheduled_date?.slice(0, 10) ?? '—'}
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-key">Status</div>
            <div className="meta-val" style={{ fontSize: 14 }}>
              <Badge status={cycle.status} />
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-key">Confirmed</div>
            <div className="meta-val green">{confirmed}</div>
          </div>
          <div className="meta-item">
            <div className="meta-key">Pending</div>
            <div className="meta-val" style={{ color: 'var(--yellow)', fontSize: 20, fontWeight: 700 }}>{pending}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Disbursements ({disbursements.length})</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {disbursements.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No disbursements yet — click "Trigger Disbursement" to generate them.
                  </td>
                </tr>
              )}
              {disbursements.map(d => (
                <tr key={d.disbursement_id}>
                  <td className="td-muted">{d.disbursement_id}</td>
                  <td>{d.recipient_name ?? d.recipient_id}</td>
                  <td>${Number(d.amount).toFixed(2)}</td>
                  <td><Badge status={d.status} /></td>
                  <td className="td-mono">{d.tx_hash ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
