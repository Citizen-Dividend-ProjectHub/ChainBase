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

export default function TopBar() {
  const { role, userName, walletAddress } = useAuth()
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
        <Avatar initials={initials(userName)} size={38} innerBg="#0d0d12" fontSize={12} />
      </div>
    </div>
  )
}
