import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const steps = [
  {
    icon: '1',
    title: 'Enroll & verify',
    desc: 'Recipients register with a wallet address. Admins review and mark accounts eligible for the program.',
  },
  {
    icon: '2',
    title: 'Pool funded on-chain',
    desc: 'The Citizens Dividend funding pool is held in USDC on Ethereum, with balances visible to anyone.',
  },
  {
    icon: '3',
    title: 'Disbursed automatically',
    desc: 'Each cycle, eligible recipients are paid in USDC automatically — no manual transfers, no delays.',
  },
  {
    icon: '4',
    title: 'Verifiable on Etherscan',
    desc: 'Every disbursement produces a transaction hash recipients and auditors can check on-chain.',
  },
]

function Reveal({ children, delay = 0, style, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={'landing-reveal' + (visible ? ' visible' : '') + (className ? ' ' + className : '')}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  )
}

export default function Landing() {
  return (
    <div className="landing-root">
      <style>{`
        .landing-root {
          min-height: 100vh;
          background: var(--cb-bg);
          overflow-x: hidden;
          position: relative;
        }

        @keyframes landing-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(24px, -32px) scale(1.06); }
        }
        @keyframes landing-shimmer { to { background-position: 200% center; } }
        @keyframes landing-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(1.35); }
        }
        @keyframes landing-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50%      { transform: translateY(8px); opacity: 1; }
        }
        @keyframes landing-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes landing-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .landing-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.35;
          pointer-events: none;
          z-index: 0;
        }
        .landing-blob-a { width: 420px; height: 420px; background: var(--cb-blue); top: -140px; left: -110px; animation: landing-float 11s ease-in-out infinite; }
        .landing-blob-b { width: 380px; height: 380px; background: var(--cb-green); top: 60px; right: -130px; animation: landing-float 13s ease-in-out infinite reverse; }
        .landing-blob-c { width: 300px; height: 300px; background: var(--cb-red); bottom: -160px; left: 38%; opacity: 0.18; animation: landing-float 15s ease-in-out infinite; animation-delay: -4s; }
        .landing-blob-d { width: 260px; height: 260px; background: var(--cb-gold); bottom: 10%; right: 6%; opacity: 0.18; animation: landing-float 12s ease-in-out infinite reverse; animation-delay: -6s; }

        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 36px;
          border-bottom: 1px solid var(--cb-border);
          background: var(--cb-card);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .landing-hero {
          position: relative;
          text-align: center;
          padding: 110px 24px 70px;
          max-width: 780px;
          margin: 0 auto;
          z-index: 1;
        }

        .landing-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(0,201,123,0.08);
          border: 1px solid var(--cb-green);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: #74e0a8;
          margin-bottom: 26px;
          animation: landing-fade-up 0.6s ease both;
        }
        .landing-dot { font-size: 10px; animation: landing-pulse 1.8s ease-in-out infinite; }

        .landing-title {
          font-size: 46px;
          font-weight: 800;
          line-height: 1.18;
          letter-spacing: -0.8px;
          animation: landing-fade-up 0.7s ease both;
          animation-delay: 0.05s;
        }

        .landing-title-gradient {
          background: linear-gradient(90deg, #6aa4ff 0%, #34c98a 45%, #ffcb3d 75%, #6aa4ff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: landing-shimmer 7s linear infinite;
        }

        .landing-subtext {
          font-size: 16px;
          color: var(--cb-muted);
          margin-top: 18px;
          line-height: 1.65;
          animation: landing-fade-up 0.7s ease both;
          animation-delay: 0.15s;
        }

        .landing-cta-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 34px;
          flex-wrap: wrap;
          animation: landing-fade-up 0.7s ease both;
          animation-delay: 0.25s;
        }

        .landing-btn {
          padding: 12px 22px;
          font-size: 14px;
          border-radius: 8px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .landing-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(47,123,255,0.4); opacity: 1; }
        .landing-btn-outline:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,255,255,0.08); }

        .landing-scroll-cue {
          margin-top: 56px;
          font-size: 12px;
          color: var(--cb-muted);
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .landing-scroll-cue span:last-child { animation: landing-bounce 1.6s ease-in-out infinite; font-size: 16px; }

        .landing-orbit {
          position: absolute;
          pointer-events: none;
          font-size: 26px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
        }
        .landing-orbit-1 { top: 18%; left: 6%;  animation: landing-float 8s ease-in-out infinite; }
        .landing-orbit-2 { top: 65%; left: 10%; animation: landing-float 10s ease-in-out infinite reverse; animation-delay: -2s; }
        .landing-orbit-3 { top: 24%; right: 7%; animation: landing-float 9s ease-in-out infinite; animation-delay: -3s; }
        .landing-orbit-4 { top: 68%; right: 11%; animation: landing-spin-slow 14s linear infinite; }

        .landing-steps {
          position: relative;
          z-index: 1;
          padding: 20px 24px 100px;
          max-width: 1020px;
          margin: 0 auto;
        }

        .landing-step-card {
          background: var(--cb-card);
          border: 1px solid var(--cb-border);
          border-radius: var(--radius-lg);
          padding: 22px;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .landing-step-card:hover {
          transform: translateY(-4px);
          border-color: var(--cb-border-strong);
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
        }
        .landing-step-icon { font-size: 24px; margin-bottom: 12px; display: block; }

        .landing-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .landing-reveal.visible { opacity: 1; transform: translateY(0); }

        /* ── Understand the basics ── */
        .landing-basics {
          position: relative;
          z-index: 1;
          padding: 40px 24px 60px;
          max-width: 980px;
          margin: 0 auto;
        }

        .landing-basics-row {
          display: flex;
          align-items: center;
          gap: 48px;
          padding: 36px 0;
          border-bottom: 1px solid var(--cb-border);
        }
        .landing-basics-row:last-child { border-bottom: none; }
        .landing-basics-row.reverse { flex-direction: row-reverse; }

        .landing-basics-media {
          flex: 0 0 340px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .landing-basics-text { flex: 1; min-width: 0; }

        .landing-basics-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--cb-text);
          margin-bottom: 10px;
        }
        .landing-basics-desc {
          font-size: 14.5px;
          color: var(--cb-muted);
          line-height: 1.7;
        }

        /* Ethereum: chain-of-blocks visual */
        .eth-chain-wrap { width: 100%; text-align: center; }
        .eth-chain { display: flex; align-items: center; justify-content: center; }
        .eth-block {
          background: var(--cb-card);
          border: 1px solid var(--cb-border);
          border-radius: var(--radius);
          padding: 10px 8px;
          width: 68px;
          text-align: center;
        }
        .eth-block-hash {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--cb-muted);
          display: block;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
        }
        .eth-block-check { color: var(--cb-green); font-size: 13px; }
        .eth-link {
          flex: 0 0 18px;
          height: 1px;
          background: var(--cb-border-strong);
        }
        .eth-chain-caption {
          margin-top: 14px;
          font-size: 12px;
          color: var(--cb-muted);
        }

        /* Wallet: mocked wallet card */
        .wallet-mock-card {
          background: var(--cb-card);
          border: 1px solid var(--cb-border);
          border-radius: var(--radius-lg);
          padding: 22px;
          width: 100%;
          text-align: center;
        }
        .wallet-mock-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--cb-muted);
          margin-bottom: 12px;
        }
        .wallet-mock-badge {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--cb-green);
        }

        /* USDC: equivalence + spend chips */
        .usdc-equiv {
          font-size: 26px;
          font-weight: 800;
          text-align: center;
          letter-spacing: -0.4px;
        }
        .usdc-equiv-eq { margin: 0 10px; color: var(--cb-muted); font-weight: 500; }
        .usdc-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 18px;
        }
        .usdc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--cb-fill);
          border: 1px solid var(--cb-border);
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12.5px;
          color: var(--cb-text);
        }

        @media (max-width: 860px) {
          .landing-orbit { display: none; }
          .landing-title { font-size: 32px; }
          .landing-basics-row, .landing-basics-row.reverse {
            flex-direction: column;
            gap: 24px;
          }
          .landing-basics-media { flex: 0 0 auto; }
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-root * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="cb-logo" style={{ width: 30, height: 30 }}>
            <div className="cb-logo-glow" />
            <div className="cb-logo-body">
              <div className="cb-logo-conic" />
              <div className="cb-logo-sheen" />
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Chain<span style={{ opacity: 0.55, fontWeight: 500 }}>Base</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login" className="btn btn-outline btn-sm landing-btn-outline">Sign In</Link>
          <Link to="/register" className="btn btn-green btn-sm landing-btn-primary">Get Started</Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-blob landing-blob-a" />
        <div className="landing-blob landing-blob-b" />
        <div className="landing-blob landing-blob-c" />
        <div className="landing-blob landing-blob-d" />

        <span className="landing-orbit landing-orbit-1">Ξ</span>
        <span className="landing-orbit landing-orbit-2">$</span>
        <span className="landing-orbit landing-orbit-3">¢</span>
        <span className="landing-orbit landing-orbit-4">◎</span>

        <div className="landing-badge">
          <span className="landing-dot">●</span> Live on Ethereum
        </div>

        <h1 className="landing-title">
          A Citizens Dividend, <span className="landing-title-gradient">paid automatically</span> and transparently
        </h1>

        <p className="landing-subtext">
          ChainBase disburses USDC payments directly to verified recipients every cycle.
          Funding, eligibility, and every transaction settle on Ethereum — auditable by anyone,
          controlled by no one.
        </p>

        <div className="landing-cta-row">
          <Link to="/register" className="btn btn-green landing-btn landing-btn-primary">
            Register as a Recipient
          </Link>
          <Link to="/login" className="btn btn-outline landing-btn landing-btn-outline">
            Sign In
          </Link>
        </div>

        <div className="landing-scroll-cue">
          <span>How it works</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Understand the basics ──────────────────────────────────────── */}
      <section className="landing-basics">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div className="page-title" style={{ fontSize: 22 }}>Understand the basics</div>
            <div className="page-subtitle">No crypto experience needed — here's what's actually happening</div>
          </div>
        </Reveal>

        <div className="landing-basics-row">
          <Reveal className="landing-basics-media">
            <div className="eth-chain-wrap">
              <div className="eth-chain">
                {['0x8f3a…', '0x2c91…', '0xa07e…', '0x51db…'].map((hash, i) => (
                  <div key={hash} style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="eth-block">
                      <span className="eth-block-hash">{hash}</span>
                      <span className="eth-block-check">✓</span>
                    </div>
                    {i < 3 && <div className="eth-link" />}
                  </div>
                ))}
              </div>
              <div className="eth-chain-caption">Every disbursement, permanently recorded</div>
            </div>
          </Reveal>
          <Reveal className="landing-basics-text" delay={80}>
            <div className="landing-basics-title">What is Ethereum?</div>
            <p className="landing-basics-desc">
              Ethereum is a public computer network — no company or government owns it. Every
              ChainBase payment runs on it, and thousands of independent computers around the
              world check and agree on each one. That means once a payment happens, nobody can
              quietly change it or hide it afterward. Anyone — you, a journalist, an auditor —
              can look up any ChainBase disbursement and see exactly when it happened and for
              how much.
            </p>
          </Reveal>
        </div>

        <div className="landing-basics-row reverse">
          <Reveal className="landing-basics-media" delay={80}>
            <div className="wallet-mock-card">
              <div className="wallet-mock-label">Your Wallet</div>
              <div className="wallet-pill" style={{ justifyContent: 'center', width: '100%' }}>
                <span className="wallet-pill-dot" />
                0x71C7…9F3B
              </div>
              <div className="wallet-mock-badge">✓ Created automatically for you</div>
            </div>
          </Reveal>
          <Reveal className="landing-basics-text">
            <div className="landing-basics-title">What's a wallet?</div>
            <p className="landing-basics-desc">
              Think of a wallet like an account number — except no one, not even ChainBase, can
              move money out of it without your permission, and you don't need a bank to have
              one. When you sign up, ChainBase automatically creates a wallet for you, so you
              never have to touch anything crypto-related yourself. Already comfortable with a
              wallet app like MetaMask? You can connect that one instead.
            </p>
          </Reveal>
        </div>

        <div className="landing-basics-row">
          <Reveal className="landing-basics-media">
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div className="usdc-equiv">
                1 USDC <span className="usdc-equiv-eq">=</span> $1 USD
              </div>
              <div className="usdc-chips">
                <span className="usdc-chip">Rent</span>
                <span className="usdc-chip">Groceries</span>
                <span className="usdc-chip">Gas</span>
                <span className="usdc-chip">Bills</span>
              </div>
            </div>
          </Reveal>
          <Reveal className="landing-basics-text" delay={80}>
            <div className="landing-basics-title">Getting paid: what is USDC?</div>
            <p className="landing-basics-desc">
              USDC is a digital dollar — 1 USDC always equals $1 USD, unlike other
              cryptocurrencies that jump around in value. A $1,200 disbursement is exactly 1,200
              USDC: no conversion, no waiting, no guessing what it's worth. You can spend it
              directly — many cards and apps let you pay for rent, groceries, gas, and bills with
              it just like a debit card — or convert it to cash in your bank account whenever
              you want.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="landing-steps">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="page-title" style={{ fontSize: 22 }}>How it works</div>
            <div className="page-subtitle">From enrollment to on-chain payment</div>
          </div>
        </Reveal>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 90}>
              <div className="landing-step-card">
                <span className="landing-step-icon">{step.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {step.desc}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        position: 'relative', zIndex: 1, textAlign: 'center', padding: '24px',
        borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)',
      }}>
        ChainBase — Citizens Dividend Portal
      </footer>
    </div>
  )
}
