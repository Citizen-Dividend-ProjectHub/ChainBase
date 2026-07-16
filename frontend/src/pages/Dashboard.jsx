import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'

// ── Admin dashboard ────────────────────────────────────────────────────────────
function AdminDashboard({ token }) {
  const [pool, setPool]               = useState(null)
  const [recipients, setRecipients]   = useState([])
  const [disbursements, setDisbursements] = useState([])
  const [loading, setLoading]         = useState(true)
  const [err, setErr]                 = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true); setErr('')
      try {
        const [poolData, recipientData, disbData] = await Promise.all([
          apiFetch('/funding-pool', {}, token),
          apiFetch('/recipients',   {}, token),
          apiFetch('/disbursements',{}, token),
        ])
        setPool(poolData)
        setRecipients(recipientData ?? [])
        setDisbursements(disbData ?? [])
      } catch (e) { setErr(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [token])

  const eligible      = recipients.filter(r => r.is_eligible).length
  const totalDisbursed = disbursements
    .filter(d => d.status === 'confirmed')
    .reduce((s, d) => s + Number(d.amount), 0)

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Citizens Dividend program overview</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Recipients" value={recipients.length} />
        <StatCard label="Eligible"         value={eligible} color="green" />
        <StatCard label="Funding Pool"     value={pool ? `$${Number(pool.balance).toLocaleString()}` : '—'} color="green" />
        <StatCard label="Total Disbursed"  value={`$${totalDisbursed.toLocaleString()}`} />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Disbursements</span>
          <Link to="/cycles" className="btn btn-outline btn-sm">View All Cycles</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Recipient</th><th>Amount</th><th>Status</th><th>Tx Hash</th><th>Cycle</th></tr>
            </thead>
            <tbody>
              {disbursements.length === 0 && (
                <tr><td colSpan={5} className="empty">No disbursements yet.</td></tr>
              )}
              {disbursements.slice(0, 10).map(d => (
                <tr key={d.disbursement_id}>
                  <td>{d.recipient_name ?? d.recipient_id}</td>
                  <td>${Number(d.amount).toFixed(2)}</td>
                  <td><Badge status={d.status} /></td>
                  <td className="td-mono">{d.tx_hash ? d.tx_hash.slice(0, 10) + '…' : '—'}</td>
                  <td>
                    <Link to={`/cycles/${d.cycle_id}`} style={{ color: 'var(--green-bright)', textDecoration: 'none' }}>
                      #{d.cycle_id}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Recipient dashboard ────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={copy} title="Copy transaction hash" style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: copied ? 'var(--green-bright)' : 'var(--text-muted)',
      fontSize: 12, padding: '0 4px', verticalAlign: 'middle',
    }}>
      {copied ? '✓' : '⧉'}
    </button>
  )
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function RecipientDashboard({ token, userId, userName }) {
  const [profile, setProfile]         = useState(null)
  const [disbursements, setDisbursements] = useState([])
  const [loading, setLoading]         = useState(true)
  const [err, setErr]                 = useState('')

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

  const confirmed   = disbursements.filter(d => d.status === 'confirmed')
  const totalReceived = confirmed.reduce((s, d) => s + Number(d.amount), 0)
  const lastAmount  = confirmed.length > 0 ? Number(confirmed[0].amount) : 0
  const enrolledAt  = profile?.enrolled_at
    ? new Date(profile.enrolled_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—'
  const wallet = profile?.wallet_address ?? ''

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        gap: 12, marginBottom: 28,
      }}>
        {wallet && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(63,185,80,0.08)', border: '1px solid var(--green)',
            borderRadius: 20, padding: '5px 12px', fontSize: 12,
            color: 'var(--green-bright)', fontFamily: 'monospace',
          }}>
            <span style={{ fontSize: 10 }}>●</span>
            {wallet.slice(0, 6)}…{wallet.slice(-4)}
          </div>
        )}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--green)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {initials(userName)}
        </div>
      </div>

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div className="page-title">Your Citizens Dividend</div>
        <div className="page-subtitle">
          {userName ?? 'Recipient'} · Enrolled {enrolledAt}
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">USDC Balance</div>
          <div className="stat-value green" style={{ fontSize: 30 }}>
            ${lastAmount.toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Payment</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {profile?.next_disbursement_date ?? 'No cycle scheduled'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Received</div>
          <div className="stat-value" style={{ fontSize: 26 }}>
            ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* ── Payment history ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Payment History</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(63,185,80,0.08)', border: '1px solid var(--green)',
            borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'var(--green-bright)',
          }}>
            <span>✓</span> Auto-disbursed 1st of month
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Transaction hash</th>
              </tr>
            </thead>
            <tbody>
              {disbursements.length === 0 && (
                <tr><td colSpan={4} className="empty">No payments yet.</td></tr>
              )}
              {disbursements.map(d => (
                <tr key={d.disbursement_id}>
                  <td className="td-muted">
                    {d.disbursed_at
                      ? new Date(d.disbursed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td style={{ fontWeight: 500 }}>${Number(d.amount).toFixed(2)} USDC</td>
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
                        >
                          {d.tx_hash.slice(0, 8)}…{d.tx_hash.slice(-4)}
                        </a>
                        <CopyButton text={d.tx_hash} />
                      </span>
                    ) : (
                      <span className="td-muted">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Root export ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { token, role, userId, userName } = useAuth()
  if (role === 'admin') return <AdminDashboard token={token} />
  return <RecipientDashboard token={token} userId={userId} userName={userName} />
}
