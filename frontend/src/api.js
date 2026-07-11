const BASE = '/api'

export async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + path, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.message ?? body.detail ?? `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}
