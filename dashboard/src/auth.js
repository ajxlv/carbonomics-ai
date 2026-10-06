// Supabase login without the full SDK: password sign-in, token refresh and sign-out over Supabase Auth's REST API.
// Only the public (anon / publishable) key is used here. Accounts are created by an admin; there is no sign-up.
import { useSyncExternalStore } from 'react'

const clean = (u) => { try { return new URL(u).origin } catch { return '' } }
const URL_ = clean(import.meta.env.VITE_SUPABASE_URL || '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const authConfigured = Boolean(URL_ && KEY)

const STORE = 'carbonomics-session'
let session = null        // { access_token, refresh_token, expires_at, email, user_id }
let profile = null        // { full_name, role } or null
const listeners = new Set()
let snapshot = { session: null, profile: null }

const emit = () => { snapshot = { session, profile }; listeners.forEach((f) => f()) }
const persist = () => {
  try { session ? localStorage.setItem(STORE, JSON.stringify(session)) : localStorage.removeItem(STORE) } catch { /* storage may be blocked */ }
}
try {
  const raw = localStorage.getItem(STORE)
  if (raw) session = JSON.parse(raw)
} catch { /* ignore */ }
snapshot = { session, profile }

const fromResponse = (j) => ({
  access_token: j.access_token,
  refresh_token: j.refresh_token,
  expires_at: j.expires_at ?? Math.floor(Date.now() / 1000) + (j.expires_in ?? 3600),
  email: j.user?.email ?? session?.email ?? '',
  user_id: j.user?.id ?? session?.user_id ?? '',
})

async function authCall(path, body, token) {
  let res
  try {
    res = await fetch(`${URL_}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error('Could not reach the login service. Check your internet connection and try again.')
  }
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export async function signIn(email, password) {
  if (!authConfigured) throw new Error('Login is not configured on this site.')
  const { res, json } = await authCall('token?grant_type=password', { email: email.trim(), password })
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) throw new Error('Wrong email or password.')
    if (res.status === 429) throw new Error('Too many attempts. Please wait a few minutes and try again.')
    throw new Error('Login failed. Please try again later.')
  }
  session = fromResponse(json); persist(); profile = null; emit()
  loadProfile()
}

export async function signOut() {
  const token = session?.access_token
  session = null; profile = null; persist(); emit()
  if (token && authConfigured) { try { await authCall('logout', {}, token) } catch { /* already signed out locally */ } }
}

let refreshing = null
async function refresh() {
  if (!session?.refresh_token) return false
  if (!refreshing) {
    refreshing = authCall('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
      .then(({ res, json }) => {
        if (!res.ok) { session = null; profile = null; persist(); emit(); return false }
        session = fromResponse(json); persist(); emit(); return true
      })
      .catch(() => false)
      .finally(() => { refreshing = null })
  }
  return refreshing
}

// A valid access token, refreshed when it is about to expire; null when logged out.
export async function getToken() {
  if (!session) return null
  if (session.expires_at - Math.floor(Date.now() / 1000) < 60) await refresh()
  return session?.access_token ?? null
}

async function loadProfile() {
  const token = await getToken()
  if (!token || !session?.user_id) return
  try {
    const res = await fetch(`${URL_}/rest/v1/profiles?select=full_name,role&user_id=eq.${encodeURIComponent(session.user_id)}&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const rows = await res.json()
    profile = rows[0] ?? null; emit()
  } catch { /* the name is cosmetic */ }
}
if (session) loadProfile()

const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f) }
const getSnapshot = () => snapshot
export const useAuth = () => useSyncExternalStore(subscribe, getSnapshot)
