import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem('cb_token')    ?? null)
  const [role,     setRole]     = useState(() => localStorage.getItem('cb_role')     ?? null)
  const [userId,   setUserId]   = useState(() => localStorage.getItem('cb_userid')   ?? null)
  const [userName, setUserName] = useState(() => localStorage.getItem('cb_username') ?? null)

  function login(newToken, newRole, newUserId, newUserName) {
    localStorage.setItem('cb_token',    newToken)
    localStorage.setItem('cb_role',     newRole)
    localStorage.setItem('cb_userid',   String(newUserId ?? ''))
    localStorage.setItem('cb_username', newUserName ?? '')
    setToken(newToken)
    setRole(newRole)
    setUserId(newUserId ? String(newUserId) : null)
    setUserName(newUserName ?? null)
  }

  function logout() {
    localStorage.removeItem('cb_token')
    localStorage.removeItem('cb_role')
    localStorage.removeItem('cb_userid')
    localStorage.removeItem('cb_username')
    setToken(null)
    setRole(null)
    setUserId(null)
    setUserName(null)
  }

  return (
    <AuthContext.Provider value={{ token, role, userId, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
