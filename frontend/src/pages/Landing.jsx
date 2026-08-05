import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import GlobeBackground from '../components/GlobeBackground'

const steps = [
  { num: '01', title: 'Enroll & verify', desc: 'Recipients register with a wallet address. Admins review and mark accounts eligible for the program.' },
  { num: '02', title: 'Pool funded on-chain', desc: 'The Citizens Dividend funding pool is held in USDC on Ethereum, with balances visible to anyone.' },
  { num: '03', title: 'Disbursed automatically', desc: 'Each cycle, eligible recipients are paid in USDC automatically — no manual transfers, no delays.' },
  { num: '04', title: 'Verifiable on Etherscan', desc: 'Every disbursement produces a transaction hash recipients and auditors can check on-chain.' },
]

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707L11.95 4.464a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0M4.05 11.536a.5.5 0 0 1 0 .707L2.636 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.05 4.464a.5.5 0 0 1-.707 0L1.929 3.05a.5.5 0 1 1 .707-.707L4.05 3.757a.5.5 0 0 1 0 .707" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278" />
    </svg>
  )
}

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
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="landing-root">
      <style>{`
        .landing-root {
          --cb-accent-text: #9dc0ff;
          --cb-shadow: none;
          --cb-nav: rgba(11,13,18,.72);
          --cb-veil: radial-gradient(ellipse 55% 62% at 50% 50%, rgba(9,22,58,.55), rgba(9,19,46,.6) 40%, rgba(10,14,26,.72) 70%, rgba(11,13,18,.9) 100%);
          position: relative; min-height: 100vh; background: var(--cb-bg); color: var(--cb-text);
          overflow-x: hidden; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
        }
        .cb-light .landing-root {
          --cb-accent-text: #1a56c0;
          --cb-shadow: 0 1px 2px rgba(16,24,40,.05);
          --cb-nav: rgba(245,246,249,.78);
          --cb-veil: radial-gradient(ellipse 55% 62% at 50% 50%, rgba(222,231,246,.4), rgba(232,238,248,.62) 62%, rgba(245,246,249,.9) 100%);
        }
        .landing-root a { text-decoration: none; }
        .landing-root ::selection { background: rgba(47,127,240,.28); }

        @keyframes cbspin { to { transform: rotate(360deg); } }
        @keyframes cbup { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cbpulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(1.5); } }
        @keyframes cbbounce { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(6px); opacity: 1; } }

        .landing-globe-wrap { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .landing-globe-veil { position: absolute; inset: 0; background: var(--cb-veil); }

        .landing-nav {
          position: sticky; top: 0; z-index: 30;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 34px; border-bottom: 1px solid var(--cb-border);
          background: var(--cb-nav); backdrop-filter: blur(14px);
        }
        .landing-logo { display: flex; align-items: center; gap: 10px; color: var(--cb-text); }
        .landing-logo-mark { position: relative; width: 30px; height: 30px; border-radius: 50%; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); background: #050b18; display: block; }
        .landing-logo-conic { position: absolute; inset: -30%; background: conic-gradient(from 0deg,#2f7bff,#00c97b,#ffc400,#ff3b3b,#2f7bff); filter: blur(4px) saturate(1.4); animation: cbspin 14s linear infinite; }
        .landing-logo-sheen { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.36), rgba(255,255,255,0) 44%); }
        .landing-wordmark { font-size: 16.5px; font-weight: 700; letter-spacing: -.3px; }
        .landing-wordmark span { font-weight: 500; opacity: .5; }
        .landing-nav-right { display: flex; align-items: center; gap: 9px; }
        .landing-theme-btn {
          width: 34px; height: 34px; border-radius: 9px; background: var(--cb-surface);
          border: 1px solid var(--cb-border); color: var(--cb-muted);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .landing-btn { padding: 8px 15px; border-radius: 9px; font-size: 13px; font-weight: 600; }
        .landing-btn-lg { padding: 12px 22px; font-size: 14px; }
        .landing-btn-secondary { background: var(--cb-surface); border: 1px solid var(--cb-border2); color: var(--cb-text2); }
        .landing-btn-primary { background: var(--cb-accent); border: 1px solid var(--cb-accent); color: #fff; }

        .landing-hero { position: relative; z-index: 1; text-align: center; padding: 104px 24px 78px; max-width: 800px; margin: 0 auto; }
        .landing-status-pill {
          display: inline-flex; align-items: center; gap: 8px; padding: 6px 13px; border-radius: 999px;
          background: var(--cb-surface); border: 1px solid var(--cb-border2); font-size: 12px; color: var(--cb-text2);
          margin-bottom: 26px; animation: cbup .6s ease both;
        }
        .landing-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cb-good); animation: cbpulse 2s ease-in-out infinite; }
        .landing-h1 {
          font-size: 46px; font-weight: 700; line-height: 1.16; letter-spacing: -1.4px; color: var(--cb-text);
          animation: cbup .7s ease both; animation-delay: .05s;
        }
        .landing-accent-text { color: var(--cb-accent-text); }
        .landing-subhead {
          font-size: 16px; color: var(--cb-muted); margin-top: 18px; line-height: 1.65;
          animation: cbup .7s ease both; animation-delay: .15s;
        }
        .landing-cta-row {
          display: flex; gap: 10px; justify-content: center; margin-top: 32px; flex-wrap: wrap;
          animation: cbup .7s ease both; animation-delay: .25s;
        }
        .landing-scroll-cue {
          margin-top: 56px; font-size: 12px; color: var(--cb-muted2);
          display: flex; flex-direction: column; gap: 6px; align-items: center;
        }
        .landing-bounce { animation: cbbounce 1.8s ease-in-out infinite; }

        .landing-reveal { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
        .landing-reveal.visible { opacity: 1; transform: translateY(0); }

        .landing-basics { position: relative; z-index: 1; padding: 30px 24px 60px; max-width: 980px; margin: 0 auto; }
        .landing-section-title { font-size: 22px; font-weight: 700; letter-spacing: -.5px; color: var(--cb-text); }
        .landing-section-sub { font-size: 14px; color: var(--cb-muted); margin-top: 5px; }

        .landing-basics-row { display: flex; align-items: center; gap: 48px; padding: 36px 0; border-bottom: 1px solid var(--cb-border); }
        .landing-basics-row.reverse { flex-direction: row-reverse; }
        .landing-basics-row:last-child { border-bottom: none; }
        .landing-basics-media { flex: 0 0 330px; }
        .landing-basics-text { flex: 1; min-width: 0; }
        .landing-basics-title { font-size: 20px; font-weight: 700; letter-spacing: -.3px; color: var(--cb-text); margin-bottom: 9px; }
        .landing-basics-desc { font-size: 14.5px; color: var(--cb-muted); line-height: 1.7; }

        .eth-chain { display: flex; align-items: center; justify-content: center; }
        .eth-block { width: 68px; padding: 10px 8px; border-radius: 9px; background: var(--cb-surface); border: 1px solid var(--cb-border); box-shadow: var(--cb-shadow); text-align: center; }
        .eth-block-hash { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--cb-muted2); }
        .eth-block-check { display: block; margin-top: 4px; font-size: 12px; color: var(--cb-good); }
        .eth-link { width: 18px; height: 1px; background: var(--cb-border2); }
        .eth-chain-caption { margin-top: 14px; font-size: 12px; color: var(--cb-muted2); text-align: center; }

        .wallet-mock-card { padding: 22px; border-radius: 14px; background: var(--cb-surface); border: 1px solid var(--cb-border); box-shadow: var(--cb-shadow); text-align: center; }
        .wallet-mock-label { font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: var(--cb-muted2); margin-bottom: 13px; }
        .wallet-mock-chip {
          display: inline-flex; align-items: center; gap: 8px; justify-content: center; width: 100%;
          padding: 9px 12px; border-radius: 8px; background: var(--cb-surface2); border: 1px solid var(--cb-border);
          font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--cb-text2);
        }
        .wallet-mock-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cb-good); }
        .wallet-mock-footnote { margin-top: 13px; font-size: 12px; color: var(--cb-good); }

        .usdc-equiv { font-size: 24px; font-weight: 700; letter-spacing: -.5px; color: var(--cb-text); }
        .usdc-equiv-eq { font-size: 16px; font-weight: 500; color: var(--cb-muted2); margin: 0 8px; }
        .usdc-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 18px; }
        .usdc-chip { padding: 6px 12px; border-radius: 999px; background: var(--cb-surface); border: 1px solid var(--cb-border); font-size: 12.5px; color: var(--cb-text2); }

        .landing-steps { position: relative; z-index: 1; padding: 20px 24px 96px; max-width: 1020px; margin: 0 auto; }
        .landing-steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
        .landing-step-card { padding: 22px; border-radius: 14px; background: var(--cb-surface); border: 1px solid var(--cb-border); box-shadow: var(--cb-shadow); }
        .landing-step-num { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; color: var(--cb-accent-text); margin-bottom: 12px; }
        .landing-step-title { font-size: 14.5px; font-weight: 600; color: var(--cb-text); margin-bottom: 6px; }
        .landing-step-desc { font-size: 13px; color: var(--cb-muted); line-height: 1.6; }

        .landing-footer { position: relative; z-index: 1; text-align: center; padding: 24px; border-top: 1px solid var(--cb-border); font-size: 12px; color: var(--cb-muted2); }
      `}</style>

      <div className="landing-globe-wrap">
        <GlobeBackground />
        <div className="landing-globe-veil" />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-mark">
            <span className="landing-logo-conic" />
            <span className="landing-logo-sheen" />
          </span>
          <span className="landing-wordmark">Chain<span>Base</span></span>
        </Link>
        <div className="landing-nav-right">
          <button className="landing-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <Link to="/login" className="landing-btn landing-btn-secondary">Sign In</Link>
          <Link to="/register" className="landing-btn landing-btn-primary">Get Started</Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-status-pill"><span className="landing-status-dot" /> Live on Ethereum</div>
        <h1 className="landing-h1">
          A Citizens Dividend, <span className="landing-accent-text">paid automatically</span> and transparently
        </h1>
        <p className="landing-subhead">
          ChainBase disburses USDC payments directly to verified recipients every cycle.
          Funding, eligibility, and every transaction settle on Ethereum — auditable by anyone,
          controlled by no one.
        </p>
        <div className="landing-cta-row">
          <Link to="/register" className="landing-btn landing-btn-lg landing-btn-primary">Register as a Recipient</Link>
          <Link to="/login" className="landing-btn landing-btn-lg landing-btn-secondary">Sign In</Link>
        </div>
        <div className="landing-scroll-cue">
          <span>How it works</span>
          <span className="landing-bounce">↓</span>
        </div>
      </section>

      {/* ── Understand the basics ──────────────────────────────────────── */}
      <section className="landing-basics">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div className="landing-section-title">Understand the basics</div>
            <div className="landing-section-sub">No crypto experience needed — here's what's actually happening</div>
          </div>
        </Reveal>

        <div className="landing-basics-row">
          <Reveal className="landing-basics-media">
            <div>
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
              <div className="wallet-mock-chip"><span className="wallet-mock-dot" /> 0x71C7…9F3B</div>
              <div className="wallet-mock-footnote">✓ Created automatically for you</div>
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
              <div className="usdc-equiv">1 USDC <span className="usdc-equiv-eq">=</span> $1 USD</div>
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
            <div className="landing-section-title">How it works</div>
            <div className="landing-section-sub">From enrollment to on-chain payment</div>
          </div>
        </Reveal>

        <div className="landing-steps-grid">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 90}>
              <div className="landing-step-card">
                <div className="landing-step-num">{step.num}</div>
                <div className="landing-step-title">{step.title}</div>
                <div className="landing-step-desc">{step.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="landing-footer">ChainBase — Citizens Dividend Portal</footer>
    </div>
  )
}
