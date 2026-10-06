import { useState } from 'react'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { authConfigured, signIn } from '../auth.js'

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'

export default function Login({ next, onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await signIn(email, password); onDone(next) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <a href="#home" className="muted mb-6 inline-flex items-center gap-1.5 text-sm hover:underline"><ArrowLeft size={15} /> Back to home</a>
        <div className="card">
          <div className="mb-5 flex items-center gap-3">
            <img src="./favicon.svg" alt="" className="h-10 w-10" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Log in</h1>
              <p className="muted text-xs">Carbonomics-AI</p>
            </div>
          </div>
          {!authConfigured && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Login is not configured on this site yet.
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm">
              <span className="muted mb-1 block text-xs">Email</span>
              <input type="email" required autoComplete="username" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="muted mb-1 block text-xs">Password</span>
              <input type="password" required autoComplete="current-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <button disabled={busy || !authConfigured} type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} {busy ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="muted mt-5 text-xs leading-relaxed">
            By logging in you agree to the <a className="underline" href="#terms">Terms of Use</a> and the <a className="underline" href="#privacy">Privacy Policy</a>.
            Your email, name and the results of your analyses are saved to your private history; your CSV file itself is not stored.
          </p>
          <p className="muted mt-3 text-xs leading-relaxed">
            Accounts are created by the Carbonomics team; there is no sign-up. Need access or forgot your password? Write to{' '}
            <a className="underline" href="mailto:carbonomics.app@gmail.com">carbonomics.app@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
