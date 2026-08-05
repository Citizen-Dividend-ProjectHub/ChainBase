import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Avatar from './Avatar'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
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

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

function AccountMenu() {
  const { role, userName, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function go(path) {
    setOpen(false)
    navigate(path)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="account-avatar-btn"
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', borderRadius: '50%' }}
      >
        <Avatar initials={initials(userName)} size={38} fontSize={12} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 200, zIndex: 50,
          background: 'var(--cb-card)', border: '1px solid var(--cb-border)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 12px 28px rgba(0,0,0,.35)',
          overflow: 'hidden', backdropFilter: 'blur(8px)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--cb-border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--cb-text)' }}>{userName ?? 'Account'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--cb-muted)', textTransform: 'capitalize' }}>{role}</div>
          </div>
          <div style={{ padding: 6 }}>
            <button
              onClick={() => go('/settings')}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                padding: '9px 10px', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--cb-text)',
              }}
            >
              Settings
            </button>
            {role === 'recipient' && (
              <button
                onClick={() => go('/wallet-settings')}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '9px 10px', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--cb-text)',
                }}
              >
                Wallet settings
              </button>
            )}
            <button
              onClick={logout}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                padding: '9px 10px', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--cb-red)',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TopBar() {
  const { role, walletAddress } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="topbar">
      <div />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="theme-toggle" onClick={toggleTheme} title="Toggle light / dark mode">
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </div>
        {role === 'recipient' && walletAddress && (
          <div className="wallet-pill">
            <span className="wallet-pill-dot" />
            {shortAddr(walletAddress)}
          </div>
        )}
        <AccountMenu />
      </div>
    </div>
  )
}
