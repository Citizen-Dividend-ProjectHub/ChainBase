import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem('cb_token')    ?? null)
  const [role,     setRole]     = useState(() => localStorage.getItem('cb_role')     ?? null)
  const [userId,   setUserId]   = useState(() => localStorage.getItem('cb_userid')   ?? null)
  const [userName, setUserName] = useState(() => localStorage.getItem('cb_username') ?? null)
  const [isVerified, setIsVerified] = useState(() => localStorage.getItem('cb_verified') === 'true')
  const [verificationStatus, setVerificationStatus] = useState(() => localStorage.getItem('cb_verification_status') ?? null)
  // Set right after registration so VerificationGate can auto-open the modal once
  // the app redirects there — Register.jsx itself gets unmounted by PublicRoute
  // the instant login() sets a token, so it can never render this modal itself.
  const [pendingVerificationUrl, setPendingVerificationUrl] = useState(null)
  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('cb_wallet_address') ?? null)

  function login(newToken, newRole, newUserId, newUserName) {
    localStorage.setItem('cb_token',    newToken)
    localStorage.setItem('cb_role',     newRole)
    localStorage.setItem('cb_userid',   String(newUserId ?? ''))
    localStorage.setItem('cb_username', newUserName ?? '')
    localStorage.setItem('cb_verified', 'false')
    localStorage.setItem('cb_verification_status', 'pending')
    localStorage.removeItem('cb_wallet_address')
    setToken(newToken)
    setRole(newRole)
    setUserId(newUserId ? String(newUserId) : null)
    setUserName(newUserName ?? null)
    setIsVerified(false)
    setVerificationStatus('pending')
    setWalletAddress(null)
  }

  function logout() {
    localStorage.removeItem('cb_token')
    localStorage.removeItem('cb_role')
    localStorage.removeItem('cb_userid')
    localStorage.removeItem('cb_username')
    localStorage.removeItem('cb_verified')
    localStorage.removeItem('cb_verification_status')
    localStorage.removeItem('cb_wallet_address')
    setToken(null)
    setRole(null)
    setUserId(null)
    setUserName(null)
    setIsVerified(false)
    setVerificationStatus(null)
    setWalletAddress(null)
  }

  async function refreshMe(currentToken = token) {
    if (!currentToken) return
    const me = await apiFetch('/auth/me', {}, currentToken)
    if (!me) return
    const verified = me.role === 'admin' ? true : !!me.is_verified
    const status = me.role === 'admin' ? 'approved' : (me.verification_status ?? null)
    localStorage.setItem('cb_verified', String(verified))
    localStorage.setItem('cb_verification_status', status ?? '')
    setIsVerified(verified)
    setVerificationStatus(status)
    if (me.wallet_address) {
      localStorage.setItem('cb_wallet_address', me.wallet_address)
    } else {
      localStorage.removeItem('cb_wallet_address')
    }
    setWalletAddress(me.wallet_address ?? null)
  }

  useEffect(() => {
    if (token) refreshMe(token).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{
      token, role, userId, userName, isVerified, verificationStatus,
      login, logout, refreshMe,
      pendingVerificationUrl, setPendingVerificationUrl,
      walletAddress,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
