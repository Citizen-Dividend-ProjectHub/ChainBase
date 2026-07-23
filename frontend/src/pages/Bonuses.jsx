import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import StatCard from '../components/StatCard'

const MCC_OPTIONS = [
  { code: '5411', label: 'Grocery Store',         restricted: false },
  { code: '5812', label: 'Restaurant',            restricted: false },
  { code: '5541', label: 'Gas Station',           restricted: false },
  { code: '5921', label: 'Liquor Store',          restricted: true  },
  { code: '5813', label: 'Bar / Cocktail Lounge', restricted: true  },
  { code: '5993', label: 'Tobacco Shop',          restricted: true  },
  { code: '7995', label: 'Casino / Gambling',     restricted: true  },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

function parsePeriod(p) {
  const [y, m] = p.split('-').map(Number)
  return { year: y, month: m }
}
function formatPeriod(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}
function friendlyPeriod(p) {
  const { year, month } = parsePeriod(p)
  return `${MONTHS_LONG[month - 1]} ${year}`
}
function currentPeriod() {
  const d = new Date()
  return formatPeriod(d.getFullYear(), d.getMonth() + 1)
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const navBtn = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: '3px 10px',
}

// ── Month jump picker ─────────────────────────────────────────────────────────
function PeriodNav({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const { year, month } = parsePeriod(value)
  const [pickerYear, setPickerYear] = useState(year)
  const ref = useRef(null)

  // close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function shift(delta) {
    let m = month + delta, y = year
    if (m > 12) { m = 1;  y++ }
    if (m < 1)  { m = 12; y-- }
    onChange(formatPeriod(y, m))
  }

  function pick(m) {
    onChange(formatPeriod(pickerYear, m))
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }} ref={ref}>
      <button type="button" onClick={() => shift(-1)} style={navBtn}>‹</button>

      {/* Clickable label opens picker */}
      <button
        type="button"
        onClick={() => { setPickerYear(year); setOpen(o => !o) }}
        style={{
          ...navBtn, fontSize: 13, fontWeight: 600, minWidth: 128, textAlign: 'center',
          padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
        }}
      >
        {friendlyPeriod(value)}
        <span style={{ fontSize: 9, opacity: 0.5 }}>▼</span>
      </button>

      <button type="button" onClick={() => shift(1)} style={navBtn}>›</button>

      <button
        type="button"
        onClick={() => onChange(currentPeriod())}
        style={{ ...navBtn, fontSize: 11, padding: '3px 8px', color: 'var(--green-bright)', borderColor: 'var(--green)' }}
      >
        Today
      </button>

      {/* Jump picker popup */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 14, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {/* Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" onClick={() => setPickerYear(y => y - 1)} style={{ ...navBtn, fontSize: 14 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{pickerYear}</span>
            <button type="button" onClick={() => setPickerYear(y => y + 1)} style={{ ...navBtn, fontSize: 14 }}>›</button>
          </div>

          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {MONTHS.map((label, i) => {
              const m = i + 1
              const isActive = pickerYear === year && m === month
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pick(m)}
                  style={{
                    padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: isActive ? 700 : 400,
                    cursor: 'pointer', border: 'none',
                    background: isActive ? 'var(--green)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text)',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Recipient avatar card ─────────────────────────────────────────────────────
function RecipientCard({ recipient, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '10px 8px', borderRadius: 8, cursor: 'pointer', width: '100%',
        background: selected ? 'rgba(63,185,80,0.12)' : 'var(--bg)',
        border: `1px solid ${selected ? 'var(--green)' : 'var(--border)'}`,
        transition: 'border-color .15s, background .15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontWeight: 700,
        fontSize: 13, flexShrink: 0,
        background: selected ? 'var(--green)' : 'var(--bg-2)',
        color: selected ? '#fff' : 'var(--text-muted)',
      }}>
        {initials(recipient.full_name)}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3 }}>
        {recipient.full_name.split(' ')[0]}
      </span>
      {!recipient.is_eligible && (
        <span style={{ fontSize: 9, color: 'var(--red)', background: 'rgba(248,81,73,0.1)', padding: '1px 5px', borderRadius: 4 }}>
          ineligible
        </span>
      )}
    </button>
  )
}

// ── Avatar cell helper ────────────────────────────────────────────────────────
function AvatarName({ name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0,
      }}>
        {initials(name)}
      </div>
      {name}
    </div>
  )
}

export default function Bonuses() {
  const { token } = useAuth()

  // page-level state (only loading spinner on first load)
  const [ready, setReady]           = useState(false)
  const [err, setErr]               = useState('')

  const [bonuses, setBonuses]       = useState([])
  const [spending, setSpending]     = useState([])
  const [spendingLoading, setSpendingLoading] = useState(false)
  const [cycles, setCycles]         = useState([])
  const [recipients, setRecipients] = useState([])
  const [actionMsg, setActionMsg]   = useState('')
  const [filter, setFilter]         = useState('all')
  const [period, setPeriod]         = useState('2024-04')

  // Simulate form
  const [simRecipient, setSimRecipient] = useState('')
  const [simMcc, setSimMcc]         = useState('5411')
  const [simResult, setSimResult]   = useState(null)
  const [simLoading, setSimLoading] = useState(false)

  // Calculate form
  const [calcCycle, setCalcCycle]   = useState('')
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcMsg, setCalcMsg]       = useState('')

  // ── Initial load (all data) ───────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setErr('')
      try {
        const [b, s, r, c] = await Promise.all([
          apiFetch('/bonuses', {}, token),
          apiFetch(`/spending?period=${period}`, {}, token),
          apiFetch('/recipients', {}, token),
          apiFetch('/cycles', {}, token),
        ])
        setBonuses(b ?? [])
        setSpending(s?.records ?? [])
        setRecipients(r ?? [])
        setCycles(c ?? [])
        if (r?.length) setSimRecipient(String(r[0].recipient_id))
      } catch (e) { setErr(e.message) }
      finally { setReady(true) }
    }
    init()
  }, [token])  // runs once

  // ── Period change — only refresh spending, no full reload ─────────────────
  useEffect(() => {
    if (!ready) return   // skip until initial load is done
    setSpendingLoading(true)
    apiFetch(`/spending?period=${period}`, {}, token)
      .then(s => setSpending(s?.records ?? []))
      .catch(() => {})
      .finally(() => setSpendingLoading(false))
  }, [period])

  async function reloadBonuses() {
    const b = await apiFetch('/bonuses', {}, token)
    setBonuses(b ?? [])
  }

  async function handleAction(bonusId, action) {
    setActionMsg('')
    try {
      await apiFetch(`/bonuses/${bonusId}/${action}`, { method: 'PATCH' }, token)
      setBonuses(prev => prev.map(b =>
        b.bonus_id === bonusId ? { ...b, status: action === 'approve' ? 'approved' : 'denied' } : b
      ))
      setActionMsg(`Bonus ${action === 'approve' ? 'approved' : 'denied'}.`)
    } catch (e) { setActionMsg(e.message) }
  }

  async function handleSimulate(e) {
    e.preventDefault()
    setSimResult(null); setSimLoading(true)
    try {
      const res = await apiFetch('/spending/simulate', {
        method: 'POST',
        body: JSON.stringify({ recipient_id: Number(simRecipient), mcc: simMcc }),
      }, token)
      setSimResult(res)
      // refresh spending for current period only
      const s = await apiFetch(`/spending?period=${period}`, {}, token)
      setSpending(s?.records ?? [])
    } catch (e) { setSimResult({ error: e.message }) }
    finally { setSimLoading(false) }
  }

  async function handleCalculate(e) {
    e.preventDefault()
    setCalcMsg(''); setCalcLoading(true)
    try {
      const res = await apiFetch('/bonuses/calculate', {
        method: 'POST',
        body: JSON.stringify({ cycle_id: Number(calcCycle) }),
      }, token)
      setCalcMsg(res.message)
      reloadBonuses()
    } catch (e) { setCalcMsg(e.message) }
    finally { setCalcLoading(false) }
  }

  if (!ready) return <div className="empty">Loading…</div>
  if (err)    return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>

  const pending  = bonuses.filter(b => b.status === 'pending')
  const approved = bonuses.filter(b => b.status === 'approved')
  const denied   = bonuses.filter(b => b.status === 'denied')
  const totalApproved = approved.reduce((s, b) => s + Number(b.amount), 0)
  const visible = filter === 'all' ? bonuses : bonuses.filter(b => b.status === filter)

  const selectedCycle = cycles.find(c => String(c.cycle_id) === String(calcCycle))
  const bonusPreview  = selectedCycle ? (Number(selectedCycle.amount_per_recipient) * 0.1).toFixed(2) : null

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Good Spending Bonuses</div>
          <div className="page-subtitle">10% bonus for recipients with zero restricted purchases in a cycle period</div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Pending Review" value={pending.length}   color="yellow" />
        <StatCard label="Approved"       value={approved.length}  color="green" />
        <StatCard label="Denied"         value={denied.length} />
        <StatCard label="Total Approved" value={`$${totalApproved.toFixed(2)}`} color="green" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* ── Simulate transaction ── */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Simulate Transaction</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Demo — no Stripe needed</span>
          </div>
          <form onSubmit={handleSimulate} style={{ padding: 20 }}>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Select Recipient</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
                {recipients.map(r => (
                  <RecipientCard
                    key={r.recipient_id}
                    recipient={r}
                    selected={String(simRecipient) === String(r.recipient_id)}
                    onClick={() => setSimRecipient(String(r.recipient_id))}
                  />
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Merchant Category</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                {MCC_OPTIONS.map(o => (
                  <button
                    key={o.code}
                    type="button"
                    onClick={() => setSimMcc(o.code)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                      background: simMcc === o.code
                        ? (o.restricted ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.12)')
                        : 'var(--bg)',
                      border: `1px solid ${simMcc === o.code
                        ? (o.restricted ? 'var(--red)' : 'var(--green)')
                        : 'var(--border)'}`,
                      color: simMcc === o.code
                        ? (o.restricted ? 'var(--red)' : 'var(--green-bright)')
                        : 'var(--text)',
                    }}
                  >
                    <span>{o.label}</span>
                    {o.restricted && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: 'rgba(248,81,73,0.15)', color: 'var(--red)' }}>
                        restricted
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-green"
              disabled={simLoading || !simRecipient}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {simLoading ? 'Sending…' : 'Record Transaction'}
            </button>

            {simResult && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 'var(--radius)', fontSize: 13,
                background: simResult.error ? 'rgba(248,81,73,0.1)' : simResult.restricted ? 'rgba(210,153,34,0.1)' : 'rgba(63,185,80,0.1)',
                border: `1px solid ${simResult.error ? 'var(--red)' : simResult.restricted ? 'var(--yellow)' : 'var(--green)'}`,
                color: simResult.error ? 'var(--red)' : simResult.restricted ? 'var(--yellow)' : 'var(--green-bright)',
              }}>
                {simResult.error ?? simResult.message}
              </div>
            )}
          </form>
        </div>

        {/* ── Generate bonuses ── */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Generate Bonuses</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Creates pending awards for a cycle</span>
          </div>
          <form onSubmit={handleCalculate} style={{ padding: 20 }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Select Cycle</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {cycles.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No cycles found.</span>
                )}
                {cycles.map(c => {
                  const isSelected = String(calcCycle) === String(c.cycle_id)
                  const date = c.scheduled_date
                    ? new Date(c.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'
                  return (
                    <button
                      key={c.cycle_id}
                      type="button"
                      onClick={() => setCalcCycle(String(c.cycle_id))}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        background: isSelected ? 'rgba(63,185,80,0.1)' : 'var(--bg)',
                        border: `1px solid ${isSelected ? 'var(--green)' : 'var(--border)'}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          Cycle #{c.cycle_id}
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{date}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          ${Number(c.amount_per_recipient).toFixed(0)}/recipient · {c.total_recipients} recipients
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <Badge status={c.status} />
                        {isSelected && (
                          <span style={{ fontSize: 11, color: 'var(--green-bright)', fontWeight: 600 }}>
                            +${(Number(c.amount_per_recipient) * 0.1).toFixed(2)} bonus
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {bonusPreview && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: 'rgba(63,185,80,0.07)', border: '1px solid var(--green)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bonus per eligible recipient</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-bright)' }}>${bonusPreview} USDC</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  10% of ${Number(selectedCycle.amount_per_recipient).toFixed(2)} · only recipients with 0 restricted purchases qualify
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-green"
              disabled={calcLoading || !calcCycle}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {calcLoading ? 'Calculating…' : 'Generate Bonuses'}
            </button>

            {calcMsg && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 'var(--radius)', fontSize: 13,
                background: 'rgba(63,185,80,0.1)', border: '1px solid var(--green)', color: 'var(--green-bright)',
              }}>
                {calcMsg}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── Spending behavior ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Spending Behavior
            {spendingLoading && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                Loading…
              </span>
            )}
          </span>
          <PeriodNav value={period} onChange={setPeriod} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Period</th>
                <th>Total Transactions</th>
                <th>Restricted</th>
                <th>Bonus Eligible</th>
              </tr>
            </thead>
            <tbody>
              {spending.length === 0 && (
                <tr><td colSpan={5} className="empty">No transactions recorded for {friendlyPeriod(period)}.</td></tr>
              )}
              {spending.map(s => {
                const clean = s.restricted_purchase_count === 0
                return (
                  <tr key={s.behavior_id}>
                    <td><AvatarName name={s.full_name} /></td>
                    <td className="td-muted">{s.period}</td>
                    <td>{s.total_transaction_count}</td>
                    <td>
                      {s.restricted_purchase_count > 0
                        ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{s.restricted_purchase_count}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                    </td>
                    <td>{clean ? <Badge status="eligible" /> : <Badge status="ineligible" />}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bonus awards table ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Bonus Awards ({visible.length})</span>
          {actionMsg && (
            <span style={{ fontSize: 13, color: 'var(--green-bright)' }}>{actionMsg}</span>
          )}
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Period</th>
                <th>Cycle</th>
                <th>Bonus Amount</th>
                <th>Restricted Purchases</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} className="empty">No bonuses match this filter.</td></tr>
              )}
              {visible.map(b => (
                <tr key={b.bonus_id}>
                  <td><AvatarName name={b.full_name} /></td>
                  <td className="td-muted">{b.period}</td>
                  <td className="td-muted">#{b.cycle_id}</td>
                  <td style={{ color: 'var(--green-bright)', fontWeight: 600 }}>
                    ${Number(b.amount).toFixed(2)}{' '}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>USDC</span>
                  </td>
                  <td>
                    {(b.restricted_purchase_count ?? 0) > 0
                      ? <span style={{ color: 'var(--red)' }}>{b.restricted_purchase_count}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                  </td>
                  <td><Badge status={b.status} /></td>
                  <td>
                    {b.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-green" onClick={() => handleAction(b.bonus_id, 'approve')}>
                          Approve
                        </button>
                        <button className="btn btn-sm btn-red" onClick={() => handleAction(b.bonus_id, 'deny')}>
                          Deny
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {b.reviewed_by_name ? `by ${b.reviewed_by_name}` : '—'}
                      </span>
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
