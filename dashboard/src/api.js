import { getToken, signOut } from './auth.js'

// The analysis server address is fixed at build time. It is deliberately not user-editable:
// the login token is sent to this address, so it must not be pointed anywhere else from the page.
export const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export async function api(path, { method = 'GET', json, form, signal } = {}) {
  const headers = {}
  const token = await getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (json !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`${API}${path}`, { method, headers, signal, body: json !== undefined ? JSON.stringify(json) : form })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new Error('Could not reach the analysis server. If you run it yourself, start it from the repository root with: uvicorn api.main:app --port 8000')
  }
  const body = await res.json().catch(() => ({}))
  if (res.status === 401) {
    await signOut()
    throw new Error('Your session has ended. Please log in again.')
  }
  if (!res.ok) {
    if (typeof body.detail === 'string') throw new Error(body.detail)
    if (res.status === 422) throw new Error('Some required fields are empty or not valid. Fill in the budget and, for every measure, its name, saving, cost per unit and most units.')
    throw new Error(`Server error (HTTP ${res.status}).`)
  }
  return body
}
