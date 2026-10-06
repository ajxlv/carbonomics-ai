import { useState } from 'react'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { authConfigured, signIn } from '../auth.js'
import Hills from './Hills.jsx'

const field = 'w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/20'

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
    <div className="dark relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-300">
      <Hills />
      <div className="rise relative z-10 w-full max-w-sm">
        <a href="#home" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"><ArrowLeft size={15} /> Back to home</a>
        <div className="glass rounded-3xl p-6 shadow-2xl shadow-black/50">
          <div className="mb-5 flex items-center gap-3">
            <img src="./logo.svg" alt="" className="h-11 w-11 rounded-xl" />
            <div>
              <h1 className="font-display text-3xl text-white">Welcome back</h1>
              <p className="text-xs text-white/50">Log in to Carbonomics-AI</p>
            </div>
          </div>
          {!authConfigured && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Login is not configured on this site yet.
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs text-white/55">Email</span>
              <input type="email" required autoComplete="username" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs text-white/55">Password</span>
              <input type="password" required autoComplete="current-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <button disabled={busy || !authConfigured} type="submit"
              className="pill-white w-full disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} {busy ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="mt-5 text-xs leading-relaxed text-white/45">
            By logging in you agree to the <a className="underline" href="#terms">Terms of Use</a> and the <a className="underline" href="#privacy">Privacy Policy</a>.
            Your email, name and the results of your analyses are saved to your private history; your CSV file itself is not stored.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            Accounts are created by the Carbonomics team; there is no sign-up. Need access or forgot your password? Write to{' '}
            <a className="underline" href="mailto:carbonomics.app@gmail.com">carbonomics.app@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
