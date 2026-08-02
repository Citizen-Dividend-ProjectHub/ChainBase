// Deliberately theme-invariant (always dark), like a real physical card doesn't
// change look with your phone's display settings — mirrors the same reasoning
// as .cb-logo-body's hardcoded #040a18 elsewhere in this codebase.
function formatAsCardNumber(address) {
  if (!address) return ''
  return address.match(/.{1,4}/g).join(' ')
}

export default function VirtualCard({ address, name, animate = false, locked = false }) {
  return (
    <div
      className={`virtual-card${animate ? ' virtual-card-animate' : ''}`}
      style={{
        aspectRatio: '1.9',
        maxWidth: 400,
        width: '100%',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, #040a18 0%, #0a1530 55%, #10254a 100%)',
        border: '1px solid rgba(255,255,255,.14)',
        boxShadow: '0 20px 40px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.05)',
        padding: 22,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#fff',
        filter: locked ? 'grayscale(.6) brightness(.75)' : 'none',
        transition: 'filter .2s',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 85% 15%, rgba(47,123,255,.28), transparent 55%)',
      }} />

      {locked && (
        <div style={{
          position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999,
          background: 'rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.25)',
        }}>
          🔒 Locked
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <div className="cb-logo" style={{ width: 26, height: 26 }}>
          <div className="cb-logo-glow" />
          <div className="cb-logo-body">
            <div className="cb-logo-conic" />
            <div className="cb-logo-sheen" />
          </div>
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>
          Chain<span style={{ opacity: .6, fontWeight: 500 }}>Base</span>
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{
          fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,.45)', marginBottom: 6,
        }}>
          Wallet Address
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '1px', lineHeight: 1.5,
        }}>
          {formatAsCardNumber(address)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {name || 'Recipient'}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)',
        }}>
          USDC
        </div>
      </div>
    </div>
  )
}
