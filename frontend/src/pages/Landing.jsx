import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const steps = [
  {
    icon: '📝',
    title: 'Enroll & verify',
    desc: 'Recipients register with a wallet address. Admins review and mark accounts eligible for the program.',
  },
  {
    icon: '🔐',
    title: 'Pool funded on-chain',
    desc: 'The Citizens Dividend funding pool is held in USDC on Ethereum, with balances visible to anyone.',
  },
  {
    icon: '⚡',
    title: 'Disbursed automatically',
    desc: 'Each cycle, eligible recipients are paid in USDC automatically — no manual transfers, no delays.',
  },
  {
    icon: '🔎',
    title: 'Verifiable on Etherscan',
    desc: 'Every disbursement produces a transaction hash recipients and auditors can check on-chain.',
  },
]

function Reveal({ children, delay = 0, style }) {
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
      className={'landing-reveal' + (visible ? ' visible' : '')}
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
          background: var(--bg);
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
        .landing-blob-a { width: 420px; height: 420px; background: var(--green-bright); top: -140px; left: -110px; animation: landing-float 11s ease-in-out infinite; }
        .landing-blob-b { width: 380px; height: 380px; background: var(--green); top: 60px; right: -130px; animation: landing-float 13s ease-in-out infinite reverse; }
        .landing-blob-c { width: 300px; height: 300px; background: var(--yellow); bottom: -160px; left: 38%; opacity: 0.22; animation: landing-float 15s ease-in-out infinite; animation-delay: -4s; }

        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 36px;
          border-bottom: 1px solid var(--border);
          background: rgba(13, 17, 23, 0.72);
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
          background: rgba(63,185,80,0.08);
          border: 1px solid var(--green);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: var(--green-bright);
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
          background: linear-gradient(90deg, var(--text) 0%, var(--green-bright) 50%, var(--text) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: landing-shimmer 7s linear infinite;
        }

        .landing-subtext {
          font-size: 16px;
          color: var(--text-muted);
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
        .landing-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(35,134,54,0.5); opacity: 1; }
        .landing-btn-outline:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,255,255,0.08); }

        .landing-scroll-cue {
          margin-top: 56px;
          font-size: 12px;
          color: var(--text-muted);
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
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 22px;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .landing-step-card:hover {
          transform: translateY(-4px);
          border-color: var(--green);
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
        }
        .landing-step-icon { font-size: 24px; margin-bottom: 12px; display: block; }

        .landing-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .landing-reveal.visible { opacity: 1; transform: translateY(0); }

        @media (max-width: 860px) {
          .landing-orbit { display: none; }
          .landing-title { font-size: 32px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-root * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-bright)', letterSpacing: '-0.3px' }}>
          Chain<span style={{ opacity: 0.5, fontWeight: 400 }}>Base</span>
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

        <span className="landing-orbit landing-orbit-1">Ξ</span>
        <span className="landing-orbit landing-orbit-2">💵</span>
        <span className="landing-orbit landing-orbit-3">🪙</span>
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
          <Link to="/admin" className="btn btn-outline landing-btn landing-btn-outline">
            Admin Login
          </Link>
        </div>

        <div className="landing-scroll-cue">
          <span>How it works</span>
          <span>↓</span>
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
