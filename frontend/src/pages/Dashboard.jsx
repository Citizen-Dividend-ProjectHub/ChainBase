import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import CardManager from '../components/CardManager'
import { useCountdown } from '../hooks/useCountdown'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function timeAgo(iso) {
  if (!iso) return null
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))
  if (mins < 1) return 'Synced just now'
  if (mins < 60) return `Synced ${mins} min ago`
  const hrs = Math.round(mins / 60)
  return `Synced ${hrs}h ago`
}

// ── Admin dashboard ────────────────────────────────────────────────────────────
function AdminDashboard({ token }) {
  const [pool, setPool]               = useState(null)
  const [recipients, setRecipients]   = useState([])
  const [disbursements, setDisbursements] = useState([])
  const [cycles, setCycles]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [err, setErr]                 = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true); setErr('')
      try {
        const [poolData, recipientData, disbData, cycleData] = await Promise.all([
          apiFetch('/funding-pool', {}, token),
          apiFetch('/recipients',   {}, token),
          apiFetch('/disbursements',{}, token),
          apiFetch('/cycles',       {}, token),
        ])
        setPool(poolData)
        setRecipients(recipientData ?? [])
        setDisbursements(disbData ?? [])
        setCycles(cycleData ?? [])
      } catch (e) { setErr(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [token])

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--cb-bad)' }}>Error: {err}</div>

  const eligible       = recipients.filter(r => r.is_eligible).length
  const totalDisbursed = disbursements.filter(d => d.status === 'confirmed').reduce((s, d) => s + Number(d.amount), 0)
  const failedCount    = disbursements.filter(d => d.status === 'failed').length

  const latestCycle  = cycles.length ? cycles.reduce((a, b) => (a.cycle_id > b.cycle_id ? a : b)) : null
  const assumedAmount = latestCycle ? Number(latestCycle.amount_per_recipient) : 0
  const cycleTotal    = eligible * assumedAmount
  const poolBalance    = Number(pool?.balance ?? 0)
  const runwayCycles   = cycleTotal > 0 ? Math.floor(poolBalance / cycleTotal) : 0
  const progressPct    = cycleTotal > 0 ? Math.min(100, (runwayCycles / 12) * 100) : 0
  const shortfall       = cycleTotal - poolBalance
  const nextCycle       = cycles.find(c => c.status === 'pending')

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div className="page-title cb-title-grad">Program Dashboard</div>
        <div className="page-subtitle">Citizens Dividend — real-time program health &amp; on-chain disbursement log.</div>
      </div>

      <div className="hero-grid">
        <div className="hero-card">
          <div className="stat-label">Funding Pool Balance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px 12px', marginTop: 14 }}>
            <div className="cb-hero-grad tabular" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-1px' }}>
              ${poolBalance.toLocaleString()}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cb-muted)' }}>USDC</div>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--cb-muted)', marginTop: 10 }}>
            {cycleTotal > 0
              ? `Covers ≈ ${runwayCycles} more monthly cycle${runwayCycles === 1 ? '' : 's'} at current enrollment`
              : 'No cycle amount to project runway from yet'}
          </div>
          <div style={{ marginTop: 20, height: 6, borderRadius: 999, background: 'var(--cb-fill)', border: '1px solid var(--cb-border)', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 999, background: 'var(--cb-accent)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--cb-muted2)', marginTop: 8 }}>
            <span>{timeAgo(pool?.last_synced_at) ?? 'Sync status unknown'}</span>
            <span>{nextCycle ? `Next disbursement: ${nextCycle.scheduled_date?.slice(0, 10)}` : 'No cycle scheduled'}</span>
          </div>
        </div>

        <div className="hero-side-card">
          <div className="stat-label">Upcoming Cycle</div>
          <div className="cb-hero-grad tabular" style={{ marginTop: 14, fontSize: 30, fontWeight: 700, letterSpacing: '-.5px' }}>
            {eligible.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: 'var(--cb-muted)' }}>eligible recipients × ${assumedAmount.toLocaleString()}</div>
          <div style={{ height: 1, background: 'var(--cb-border)', margin: '18px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: 'var(--cb-muted)' }}>Cycle total</span>
            <span className="cb-hero-grad tabular" style={{ fontSize: 18, fontWeight: 600 }}>${cycleTotal.toLocaleString()}</span>
          </div>
          {shortfall > 0 && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: 'var(--cb-fill)', border: '1px solid var(--cb-bad)',
              fontSize: 12, color: 'var(--cb-bad)',
            }}>
              Pool short by ${shortfall.toLocaleString()} — top up before next cycle
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Total Recipients"   value={recipients.length} sub={`${recipients.length} enrolled`} />
        <StatCard label="Eligible"           value={eligible} sub={recipients.length ? `${Math.round((eligible / recipients.length) * 100)}% of enrolled` : '—'} />
        <StatCard label="Disbursed to Date"  value={`$${totalDisbursed.toLocaleString()}`} sub={`across ${cycles.filter(c => c.status === 'completed').length} cycles`} />
        <StatCard label="Failed Payments"    value={failedCount} sub="last cycle" />
      </div>

      <div className="card card-table">
        <div className="card-header">
          <span className="card-title">Recent Disbursements</span>
          <Link to="/cycles" style={{ fontSize: 12.5 }}>View all cycles →</Link>
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
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="cb-avatar" style={{ width: 28, height: 28 }}>
                        <span className="cb-avatar-inner" style={{ fontSize: 11 }}>{initials(d.recipient_name)}</span>
                      </div>
                      <span style={{ color: 'var(--cb-text2)' }}>{d.recipient_name ?? d.recipient_id}</span>
                    </div>
                  </td>
                  <td className="tabular" style={{ fontWeight: 600 }}>${Number(d.amount).toFixed(2)}</td>
                  <td><Badge status={d.status} /></td>
                  <td className="td-mono">{d.tx_hash ? d.tx_hash.slice(0, 10) + '…' : '—'}</td>
                  <td style={{ color: 'var(--cb-muted)' }}>
                    <Link to={`/cycles/${d.cycle_id}`}>#{d.cycle_id}</Link>
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
      color: copied ? 'var(--cb-good)' : 'var(--cb-muted)',
      fontSize: 12, padding: '0 4px', verticalAlign: 'middle',
      display: 'inline-flex', alignItems: 'center',
    }}>
      {copied ? '✓' : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="12" height="12" rx="1.5" />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
      )}
    </button>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
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

  const countdown = useCountdown(profile?.next_disbursement_date ?? null)

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--cb-bad)' }}>Error: {err}</div>

  const confirmed      = disbursements.filter(d => d.status === 'confirmed')
  const failed         = disbursements.filter(d => d.status === 'failed')
  const totalReceived  = confirmed.reduce((s, d) => s + Number(d.amount), 0)
  const lastAmount     = confirmed.length > 0 ? Number(confirmed[0].amount) : 0
  const onTimePct      = confirmed.length + failed.length > 0
    ? Math.round((confirmed.length / (confirmed.length + failed.length)) * 100)
    : 100
  const wallet = profile?.wallet_address ?? ''

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div className="page-title cb-title-grad">{greeting()}, {userName ?? 'there'}</div>
        <div className="page-subtitle">Your Citizens Dividend arrives automatically each month — no claim needed.</div>
      </div>

      <div className="hero-grid">
        <div className="hero-card">
          <div className="stat-label">Current Balance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px 12px', marginTop: 14 }}>
            <div className="cb-hero-grad tabular" style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-1px' }}>
              ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cb-muted)' }}>USDC</div>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--cb-muted)', marginTop: 10 }}>
            ≈ ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD · on Ethereum
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            {wallet && (
              <a
                href={`https://sepolia.etherscan.io/address/${wallet}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
              >
                View on Etherscan
              </a>
            )}
          </div>
        </div>

        <div className="hero-side-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-label">Next Dividend</div>
            <div className="badge badge-green">Auto</div>
          </div>
          <div className="cb-hero-grad tabular" style={{ marginTop: 16, fontSize: 32, fontWeight: 700, letterSpacing: '-.5px' }}>
            ${lastAmount.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cb-muted)' }}>USDC</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--cb-muted)', marginTop: 4 }}>
            {profile?.next_disbursement_date
              ? new Date(profile.next_disbursement_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
              : 'No cycle scheduled'}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>Arrives in</div>
            <div className="cb-hero-grad tabular" style={{ fontSize: 20, fontWeight: 600 }}>
              {countdown || '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div className="card-header" style={{ padding: 0, border: 'none', marginBottom: 16 }}>
          <span className="card-title">Your ChainBase Card</span>
        </div>
        <CardManager token={token} userId={userId} userName={userName} totalReceived={totalReceived} />
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Monthly Dividend" value={`$${lastAmount.toFixed(2)}`} sub="USDC · fixed" />
        <StatCard label="Total Received"   value={`$${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={`${confirmed.length} payments`} />
        <StatCard label="Payments"         value={disbursements.length} sub={`${onTimePct}% on time`} />
      </div>

      <div className="card card-table">
        <div className="card-header">
          <span className="card-title">Payment History</span>
          <div className="badge badge-green">Disbursed 1st of every month</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Status</th><th>Transaction</th></tr>
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
                  <td className="tabular" style={{ fontWeight: 600 }}>
                    ${Number(d.amount).toFixed(2)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--cb-muted2)' }}>USDC</span>
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
                        >
                          {d.tx_hash.slice(0, 10)}…{d.tx_hash.slice(-6)}
                        </a>
                        <CopyButton text={d.tx_hash} />
                      </span>
                    ) : (
                      <span className="td-muted">Awaiting cycle</span>
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
