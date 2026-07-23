import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'

const MCC_OPTIONS = [
  { code: '5411', label: 'Grocery Store',         restricted: false, icon: '🛒' },
  { code: '5812', label: 'Restaurant',            restricted: false, icon: '🍽' },
  { code: '5541', label: 'Gas Station',           restricted: false, icon: '⛽' },
  { code: '5999', label: 'Retail / Shopping',     restricted: false, icon: '🛍' },
  { code: '7011', label: 'Hotel / Lodging',       restricted: false, icon: '🏨' },
  { code: '4111', label: 'Transit / Transport',   restricted: false, icon: '🚌' },
  { code: '5921', label: 'Liquor Store',          restricted: true,  icon: '🍺' },
  { code: '5813', label: 'Bar / Cocktail Lounge', restricted: true,  icon: '🍸' },
  { code: '5993', label: 'Tobacco Shop',          restricted: true,  icon: '🚬' },
  { code: '7995', label: 'Casino / Gambling',     restricted: true,  icon: '🎰' },
]

const QUICK_AMOUNTS = [10, 25, 50, 100, 250]

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS_LONG = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
function friendlyPeriod(p) {
  const [y, m] = p.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

export default function Wallet() {
  const { token } = useAuth()
  const [balance, setBalance]       = useState(null)
  const [record, setRecord]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [err, setErr]               = useState('')

  // Purchase form
  const [mcc, setMcc]               = useState('5411')
  const [amount, setAmount]         = useState('')
  const [buying, setBuying]         = useState(false)
  const [result, setResult]         = useState(null)
  const amountRef = useRef(null)

  const period = currentPeriod()

  async function load() {
    setErr('')
    try {
      const [bal, hist] = await Promise.all([
        apiFetch('/spending/balance', {}, token),
        apiFetch(`/spending/me?period=${period}`, {}, token),
      ])
      setBalance(bal.balance ?? 0)
      setRecord(hist.record)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  async function handlePurchase(e) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setResult(null); setBuying(true)
    try {
      const res = await apiFetch('/spending/purchase', {
        method: 'POST',
        body: JSON.stringify({ mcc, amount: amt }),
      }, token)
      setBalance(res.new_balance)
      setResult({ ok: true, ...res })
      setAmount('')
      // refresh this month's record
      const hist = await apiFetch(`/spending/me?period=${period}`, {}, token)
      setRecord(hist.record)
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally { setBuying(false) }
  }

  if (loading) return <div className="empty">Loading…</div>
  if (err)     return <div className="empty" style={{ color: 'var(--red)' }}>Error: {err}</div>

  const selectedMcc = MCC_OPTIONS.find(o => o.code === mcc)
  const parsedAmt   = parseFloat(amount) || 0
  const insufficient = parsedAmt > balance
  const restricted  = selectedMcc?.restricted ?? false

  const totalTx      = record?.total_transaction_count ?? 0
  const restrictedTx = record?.restricted_purchase_count ?? 0
  const bonusEligible = restrictedTx === 0 && totalTx > 0

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Wallet</div>
          <div className="page-subtitle">Spend your Citizens Dividend tokens</div>
        </div>
      </div>

      {/* ── Balance card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              Available Balance
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: balance > 0 ? 'var(--green-bright)' : 'var(--red)', lineHeight: 1 }}>
              ${Number(balance).toFixed(2)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>USDC · Citizens Dividend</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{friendlyPeriod(period)} activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Transactions: </span>
                <strong>{totalTx}</strong>
              </span>
              <span style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Restricted: </span>
                <strong style={{ color: restrictedTx > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{restrictedTx}</strong>
              </span>
              {totalTx > 0 && (
                <Badge status={bonusEligible ? 'eligible' : 'ineligible'} />
              )}
            </div>
          </div>
        </div>
        {balance === 0 && (
          <div style={{
            margin: '0 20px 20px', padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: 'rgba(248,81,73,0.08)', border: '1px solid var(--red)', color: 'var(--red)',
          }}>
            Your balance is empty. Spending is disabled until your next disbursement.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }}>

        {/* ── Spend form ── */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Spend Tokens</span>
            {restricted && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(248,81,73,0.12)', color: 'var(--red)', border: '1px solid var(--red)' }}>
                ⚠ Restricted category
              </span>
            )}
          </div>
          <form onSubmit={handlePurchase} style={{ padding: 20 }}>

            {/* Amount */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Amount (USDC)</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none',
                }}>$</span>
                <input
                  ref={amountRef}
                  type="number" min="0.01" step="0.01" required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ paddingLeft: 26 }}
                  disabled={balance <= 0}
                />
              </div>
              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    type="button"
                    disabled={a > balance}
                    onClick={() => { setAmount(String(a)); amountRef.current?.focus() }}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: a > balance ? 'not-allowed' : 'pointer',
                      background: String(a) === amount ? 'var(--green)' : 'var(--bg-2)',
                      color: String(a) === amount ? '#fff' : a > balance ? 'var(--text-muted)' : 'var(--text)',
                      border: `1px solid ${String(a) === amount ? 'var(--green)' : 'var(--border)'}`,
                      opacity: a > balance ? 0.4 : 1,
                    }}
                  >
                    ${a}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={balance <= 0}
                  onClick={() => { setAmount(String(Math.floor(balance * 100) / 100)); amountRef.current?.focus() }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12,
                    cursor: balance <= 0 ? 'not-allowed' : 'pointer',
                    background: 'var(--bg-2)', color: 'var(--text)',
                    border: '1px solid var(--border)',
                    opacity: balance <= 0 ? 0.4 : 1,
                  }}
                >
                  Max
                </button>
              </div>
              {insufficient && parsedAmt > 0 && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
                  Exceeds your balance of ${Number(balance).toFixed(2)}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Where are you spending?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                {MCC_OPTIONS.map(o => (
                  <button
                    key={o.code}
                    type="button"
                    disabled={balance <= 0}
                    onClick={() => setMcc(o.code)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 7, cursor: balance <= 0 ? 'not-allowed' : 'pointer',
                      fontSize: 13, textAlign: 'left',
                      background: mcc === o.code
                        ? (o.restricted ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.12)')
                        : 'var(--bg)',
                      border: `1px solid ${mcc === o.code
                        ? (o.restricted ? 'var(--red)' : 'var(--green)')
                        : 'var(--border)'}`,
                      color: mcc === o.code
                        ? (o.restricted ? 'var(--red)' : 'var(--green-bright)')
                        : 'var(--text)',
                      opacity: balance <= 0 ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{o.icon}</span>
                    <span style={{ lineHeight: 1.2 }}>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={`btn ${restricted ? 'btn-red' : 'btn-green'}`}
              disabled={buying || balance <= 0 || insufficient || parsedAmt <= 0}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {buying
                ? 'Processing…'
                : parsedAmt > 0
                  ? `${restricted ? '⚠ Spend' : 'Spend'} $${parsedAmt.toFixed(2)} at ${selectedMcc?.label}`
                  : 'Enter an amount'}
            </button>

            {result && (
              <div style={{
                marginTop: 14, padding: '12px 14px', borderRadius: 8, fontSize: 13,
                background: result.ok
                  ? (result.restricted ? 'rgba(210,153,34,0.1)' : 'rgba(63,185,80,0.1)')
                  : 'rgba(248,81,73,0.1)',
                border: `1px solid ${result.ok ? (result.restricted ? 'var(--yellow)' : 'var(--green)') : 'var(--red)'}`,
                color: result.ok ? (result.restricted ? 'var(--yellow)' : 'var(--green-bright)') : 'var(--red)',
              }}>
                <div style={{ fontWeight: 600 }}>{result.message}</div>
                {result.ok && (
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
                    New balance: ${Number(result.new_balance).toFixed(2)} USDC
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* ── This month's summary ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Bonus eligibility card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <span className="card-title">Bonus Eligibility</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{friendlyPeriod(period)}</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {totalTx === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  No transactions yet this month. Make a purchase to start tracking.
                </div>
              ) : bonusEligible ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--green-bright)', fontWeight: 600, marginBottom: 6 }}>
                    You qualify for a 10% bonus this cycle!
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    You've made {totalTx} transaction{totalTx !== 1 ? 's' : ''} with zero restricted purchases.
                    Keep it up to stay eligible.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>
                    Not eligible for bonus
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    You have {restrictedTx} restricted purchase{restrictedTx !== 1 ? 's' : ''} this month.
                    Restricted spending disqualifies you from the 10% bonus.
                  </div>
                </>
              )}

              <div style={{
                marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              }}>
                {[
                  { label: 'Transactions', value: totalTx },
                  { label: 'Restricted', value: restrictedTx, red: restrictedTx > 0 },
                ].map(s => (
                  <div key={s.label} style={{
                    padding: '10px 12px', borderRadius: 8, background: 'var(--bg)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.red ? 'var(--red)' : 'var(--text)' }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Restricted categories info */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <span className="card-title">Restricted Categories</span>
            </div>
            <div style={{ padding: '12px 20px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Spending in these categories counts as a restricted purchase and disqualifies
                you from the monthly bonus award.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MCC_OPTIONS.filter(o => o.restricted).map(o => (
                  <div key={o.code} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 6, fontSize: 13,
                    background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)',
                    color: 'var(--text)',
                  }}>
                    <span>{o.icon}</span>
                    <span>{o.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
