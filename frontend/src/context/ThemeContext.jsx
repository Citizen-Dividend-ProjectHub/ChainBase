import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('cb_theme') ?? 'dark')

  useEffect(() => {
    // Applied to <html> (not <body>) so it lands on the same element as the
    // :root token declarations — the old-name aliases (--bg: var(--cb-bg),
    // etc.) resolve var() against the element they're declared on, so an
    // override on a descendant (e.g. <body>) would never be picked up.
    document.documentElement.classList.toggle('cb-light', theme === 'light')
    localStorage.setItem('cb_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
