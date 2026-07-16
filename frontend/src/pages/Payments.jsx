import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={copy} title="Copy full hash" style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: copied ? 'var(--green-bright)' : 'var(--text-muted)',
      fontSize: 12, padding: '0 4px', verticalAlign: 'middle', flexShrink: 0,
    }}>
      {copied ? '✓' : '⧉'}
    </button>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function Payments() {
  const { token, userId } = useAuth()
  const [profile, setProfile]             = useState(null)
  const [disbursements, setDisbursements] = useState([])
  const [loading, setLoading]             = useState(true)
  const [err, setErr]                     = useState('')
  const [filter, setFilter]               = useState('all')

  useEffect(() => {
    if (!userId) return
    async function load() {
      setLoading(true); setErr('')
      try {
        const [profileData, disbData] = await Promise.all([
          apiFetch(`/recipients/${userId}`, {}, token),
          apiFetch(`/recipients/${userId}/disbursements`, {}, token),
        ])
        setProfile(profileData)
        setDisbursements(disbData ?? [])
      } catch (e) { setErr(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [token, userId])

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>

  const confirmed    = disbursements.filter(d => d.status === 'confirmed')
  const pending      = disbursements.filter(d => d.status === 'pending')
  const totalReceived = confirmed.reduce((s, d) => s + Number(d.amount), 0)
  const totalPending  = pending.reduce((s, d) => s + Number(d.amount), 0)

  const visible = filter === 'all'       ? disbursements
               : filter === 'confirmed' ? confirmed
               :                          pending

  const wallet = profile?.wallet_address ?? ''

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Payment History</div>
          <div className="page-subtitle">All Citizens Dividend disbursements to your wallet</div>
        </div>
        {wallet && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(63,185,80,0.08)', border: '1px solid var(--green)',
            borderRadius: 20, padding: '6px 14px', fontSize: 12,
            color: 'var(--green-bright)', fontFamily: 'monospace',
          }}>
            <span style={{ fontSize: 10 }}>●</span>
            {wallet.slice(0, 6)}…{wallet.slice(-4)}
          </div>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Received</div>
          <div className="stat-value green" style={{ fontSize: 24 }}>
            ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>USDC · {confirmed.length} payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value yellow" style={{ fontSize: 24 }}>
            ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>USDC · {pending.length} payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Payments</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{disbursements.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>across all cycles</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Payment</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {profile?.next_disbursement_date ?? 'None scheduled'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>auto-disbursed 1st of month</div>
        </div>
      </div>

      {/* ── Payments table ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Disbursements ({visible.length})</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
            >
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date &amp; Time</th>
                <th>Cycle</th>
                <th>Wallet</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Transaction Hash</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} className="empty">No payments match this filter.</td></tr>
              )}
              {visible.map(d => (
                <tr key={d.disbursement_id}>
                  <td className="td-muted">#{d.disbursement_id}</td>
                  <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(d.disbursed_at)}</td>
                  <td className="td-muted">Cycle #{d.cycle_id}</td>
                  <td>
                    {wallet ? (
                      <span className="wallet">{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
                    ) : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--green-bright)' }}>
                    ${Number(d.amount).toFixed(2)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>USDC</span>
                  </td>
                  <td><Badge status={d.status} /></td>
                  <td>
                    {d.tx_hash ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${d.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="td-mono"
                          style={{ color: 'var(--green-bright)', textDecoration: 'none' }}
                          title={d.tx_hash}
                        >
                          {d.tx_hash.slice(0, 10)}…{d.tx_hash.slice(-6)}
                        </a>
                        <CopyButton text={d.tx_hash} />
                      </span>
                    ) : (
                      <span className="td-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer totals row ── */}
        {visible.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 32,
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            fontSize: 13, color: 'var(--text-muted)',
          }}>
            <span>
              {visible.length} payment{visible.length !== 1 ? 's' : ''}
            </span>
            <span>
              Total:{' '}
              <strong style={{ color: 'var(--text)' }}>
                ${visible.reduce((s, d) => s + Number(d.amount), 0)
                  .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </strong>
            </span>
          </div>
        )}
      </div>
    </>
  )
}
