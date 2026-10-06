import { useEffect, useState } from 'react'
import { BarChart3, FlaskConical, Gauge, History as HistoryIcon, Home, LineChart as LineIcon, ListChecks, LogOut, Lock, Menu, Moon, ShieldCheck, Sun, Target, Upload as UploadIcon, X } from 'lucide-react'
import { Synthetic, ThemeCtx } from './ui.jsx'
import Overview from './pages/Overview.jsx'
import Trends from './pages/Trends.jsx'
import Forecast from './pages/Forecast.jsx'
import Simulation from './pages/Simulation.jsx'
import Optimization from './pages/Optimization.jsx'
import Factors from './pages/Factors.jsx'
import Quality from './pages/Quality.jsx'
import Upload from './pages/Upload.jsx'
import HistoryPage from './pages/History.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import { Privacy, Terms } from './pages/Legal.jsx'
import { authConfigured, signOut, useAuth } from './auth.js'

const PAGES = [
  { id: 'overview', label: 'Overview', icon: Gauge, C: Overview },
  { id: 'trends', label: 'Trends', icon: LineIcon, C: Trends },
  { id: 'forecast', label: 'Forecast', icon: BarChart3, C: Forecast },
  { id: 'simulation', label: 'Simulation', icon: FlaskConical, C: Simulation },
  { id: 'optimization', label: 'Optimization', icon: Target, C: Optimization },
  { id: 'upload', label: 'Upload your data', icon: UploadIcon, C: Upload, locked: true, needsData: false },
  { id: 'history', label: 'History', icon: HistoryIcon, C: HistoryPage, locked: true, needsData: false },
  { id: 'factors', label: 'Emission factors', icon: ListChecks, C: Factors },
  { id: 'quality', label: 'Data & QA', icon: ShieldCheck, C: Quality },
]

const readTheme = () => {
  try {
    const saved = localStorage.getItem('carbonomics-theme')
    if (saved) return saved === 'dark'
  } catch { /* storage may be blocked */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

// '#login?next=upload' -> { route: 'login', next: 'upload' }
const parseHash = () => {
  const [route, query = ''] = location.hash.slice(1).split('?')
  return { route: route || 'home', next: new URLSearchParams(query).get('next') || 'upload' }
}
const goto = (hash) => { location.hash = hash }

export default function App() {
  const [{ route, next }, setRoute] = useState(parseHash)
  const [dark, setDark] = useState(readTheme)
  const { session, profile } = useAuth()

  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('carbonomics-theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [dark])

  // Without Supabase settings (local development) the locked pages stay open; the API still decides what it accepts.
  const loggedIn = Boolean(session) || !authConfigured
  const isDash = PAGES.some((p) => p.id === route)
  const locked = PAGES.find((p) => p.id === route)?.locked

  useEffect(() => { if (locked && !loggedIn) goto(`login?next=${route}`) }, [locked, loggedIn, route])
  useEffect(() => { if (route === 'login' && session) goto(next) }, [route, session, next])

  if (route === 'login') return session ? null : <Login next={next} onDone={(n) => goto(n)} />
  if (route === 'privacy') return <Privacy />
  if (route === 'terms') return <Terms />
  if (!isDash) return <Landing />
  if (locked && !loggedIn) return null
  return <Dashboard page={route} dark={dark} setDark={setDark} session={session} profile={profile} loggedIn={loggedIn} />
}

function Dashboard({ page, dark, setDark, session, profile, loggedIn }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [opened, setOpened] = useState(null)   // a saved analysis opened from History

  useEffect(() => {
    fetch('./data/dashboard.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(`Could not load data/dashboard.json (${e.message}). Run python scripts/run_pipeline.py first.`))
  }, [])

  const go = (id) => { setOpen(false); location.hash = PAGES.find((p) => p.id === id)?.locked && !loggedIn ? `login?next=${id}` : id }
  const current = PAGES.find((p) => p.id === page) ?? PAGES[0]
  const Page = current.C
  const needsData = current.needsData !== false
  const openAnalysis = (run) => { setOpened(run); go('upload') }

  const nav = (
    <nav className="flex flex-col gap-1">
      {PAGES.map(({ id, label, icon: Icon, locked }) => (
        <button key={id} onClick={() => go(id)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${current.id === id ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          <Icon size={18} /> <span className="flex-1 text-left">{label}</span>
          {locked && !loggedIn && <Lock size={13} className="opacity-60" aria-label="Login required" />}
        </button>
      ))}
    </nav>
  )

  return (
    <ThemeCtx.Provider value={{ dark }}>
      <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
        <aside className={`${open ? 'fixed inset-0 z-40 block bg-white p-5 dark:bg-slate-950' : 'hidden'} lg:static lg:block lg:border-r lg:border-slate-200 lg:bg-white lg:p-5 dark:lg:border-slate-800 dark:lg:bg-slate-950`}>
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="./favicon.svg" alt="" className="h-9 w-9" />
              <div>
                <div className="font-semibold leading-tight text-slate-900 dark:text-white">Carbonomics-AI</div>
                <div className="muted text-xs">Carbon intelligence</div>
              </div>
            </div>
            <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={22} /></button>
          </div>
          {nav}
          <a href="#home" className="muted mt-4 flex items-center gap-3 px-3 py-2 text-sm hover:underline"><Home size={16} /> Home</a>
          <p className="muted mt-8 text-xs leading-relaxed">K. K. Wagh Panchvati Campus, Nashik<br />Calendar year 2025</p>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-8 dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{current.label}</h1>
            </div>
            <div className="flex items-center gap-3">
              {needsData && <span className="hidden sm:inline-flex items-center gap-2 text-xs muted">Weekly data is <Synthetic /></span>}
              {authConfigured && (session
                ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="muted hidden max-w-[14rem] truncate md:inline" title={session.email}>{profile?.full_name || session.email}{profile?.role && profile.role !== 'other' ? ` (${profile.role})` : ''}</span>
                    <button onClick={() => signOut().then(() => { location.hash = 'home' })} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800"><LogOut size={15} /> Log out</button>
                  </div>
                )
                : <a href="#login" className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700">Log in</a>)}
              <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode"
                className="rounded-xl p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
            {needsData && error && <div className="card text-sm text-rose-600">{error}</div>}
            {needsData && !error && !data && <div className="muted text-sm">Loading…</div>}
            {needsData && data && <Page data={data} />}
            {!needsData && <Page opened={opened} onCloseOpened={() => setOpened(null)} onOpenAnalysis={openAnalysis} />}
          </main>
          <footer className="muted px-4 pb-8 text-center text-xs sm:px-8">Carbonomics-AI · final-year project, KKWIEER Nashik · © 2026 Team Carbonomics, all rights reserved · <a className="underline" href="#privacy">Privacy</a> · <a className="underline" href="#terms">Terms</a> · figures labelled REAL come from the Energy team's monthly log; SYNTHETIC figures are not measurements.</footer>
        </div>
      </div>
    </ThemeCtx.Provider>
  )
}
