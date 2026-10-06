import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BarChart3, FileText, FlaskConical, History, ListChecks, LogIn, Mail, Menu, Play, ShieldCheck, Target, Upload, X } from 'lucide-react'

const CONTACT = 'carbonomics.app@gmail.com'
const MAILTO = `mailto:${CONTACT}?subject=${encodeURIComponent('Carbonomics-AI demo request')}&body=${encodeURIComponent('Hello,\n\nI would like a demo of Carbonomics-AI.\n\nName:\nInstitution / role:\nPreferred time:\n')}`

const FEATURES = [
  { icon: ListChecks, title: 'Carbon accounting', text: 'Scope 1 (generator diesel) and Scope 2 (grid electricity). Emission is always activity multiplied by an emission factor, and every factor shows its source, version and unit.' },
  { icon: BarChart3, title: 'Forecasting', text: 'Models forecast the activity (kWh, litres), never the emission itself. A model is used only if it beats a simple last-week guess on unseen weeks; otherwise the simple guess is shown.' },
  { icon: FlaskConical, title: 'What-if scenarios', text: 'Change electricity use, diesel use or add solar generation and see the effect on emissions straight away. You choose the numbers; nothing is promised on your behalf.' },
  { icon: Target, title: 'Optimization', text: 'Enter your budget and the measures you are considering, with your own costs and savings. The optimiser picks the combination that cuts the most emissions.' },
  { icon: FileText, title: 'A report you can hand over', text: 'One PDF with the totals, charts, method, factors and recommended steps, written so that a reader who is not technical can follow it.' },
  { icon: Upload, title: 'Your own data', text: 'Upload a CSV or Excel file of daily, weekly or monthly use. Every run is kept in a private history that only you can see.' },
]

const STEPS = [
  { n: '1', title: 'Upload', text: 'Drop in your CSV or Excel file of electricity and diesel use.' },
  { n: '2', title: 'Analyse', text: 'Get emissions, a forecast and what-if scenarios in seconds.' },
  { n: '3', title: 'Decide', text: 'Add your budget and costs, get the best plan and a PDF report.' },
]

const TEAM = [
  { name: 'Sanket Chaudhari', role: 'Full-Stack Project Lead', tag: 'Architecture, ML, backend and web' },
  { name: 'Atharva Jadhav', role: 'Research Lead', tag: 'Methods and literature' },
  { name: 'Rahil Shah', role: 'Systems & Integration Lead', tag: 'Backend and pipeline' },
  { name: 'Purva Chopade', role: 'Data Analytics Lead', tag: 'Data and visualization' },
]

const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition'
const primary = `${btn} bg-white text-teal-900 shadow-lg shadow-teal-500/20 hover:bg-teal-50`
const ghost = `${btn} border border-white/25 text-white hover:bg-white/10`

// Fades a block in once, when it scrolls into view.
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { el?.classList.add('in'); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}

// A picture of the product, not real numbers: bars rise, a ring turns.
function HeroPreview() {
  const bars = [52, 64, 48, 78, 70, 58, 86, 66, 74, 60, 82, 55]
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="anim-float rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs text-teal-100/80">
          <span className="font-medium">Emissions by month</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5">illustration</span>
        </div>
        <div className="mt-4 flex h-36 items-end gap-1.5 sm:h-44" aria-hidden="true">
          {bars.map((h, i) => (
            <div key={i} className="bar-grow flex-1 rounded-t-md bg-gradient-to-t from-teal-500 to-emerald-300" style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-teal-50">
          {['Scope 1', 'Scope 2', 'Scope 3'].map((s, i) => (
            <div key={s} className="rounded-xl bg-white/10 px-2 py-2">
              <div className="mx-auto mb-1 h-1.5 w-8 rounded-full" style={{ background: ['#f59e0b', '#2dd4bf', '#818cf8'][i] }} />{s}
            </div>
          ))}
        </div>
      </div>
      <div className="anim-float-slow absolute -bottom-6 -left-3 hidden rounded-2xl border border-white/15 bg-slate-900/80 p-3 shadow-xl backdrop-blur sm:block">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full" style={{ background: 'conic-gradient(#2dd4bf 0 58%, #f59e0b 58% 62%, #818cf8 62% 100%)' }}>
            <div className="m-[7px] h-[34px] w-[34px] rounded-full bg-slate-900" />
          </div>
          <div className="text-xs text-teal-50"><div className="font-semibold">Activity × Factor</div><div className="text-teal-200/70">every factor sourced</div></div>
        </div>
      </div>
      <div className="anim-float absolute -right-2 -top-5 hidden rounded-2xl border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-teal-50 shadow-xl backdrop-blur sm:block">
        <ShieldCheck size={14} className="mb-0.5 mr-1 inline text-emerald-300" />Private history per user
      </div>
    </div>
  )
}

export default function Landing() {
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const go = (id) => (e) => { e.preventDefault(); setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }
  const links = [['features', 'Features'], ['how', 'How it works'], ['team', 'Team']]

  return (
    <div className="min-h-screen overflow-x-hidden">
      <nav className={`fixed inset-x-0 top-0 z-50 transition ${scrolled || menu ? 'bg-slate-950/85 backdrop-blur-lg' : ''}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="#home" className="flex items-center gap-2.5" onClick={() => setMenu(false)}>
            <img src="./favicon.svg" alt="" className="h-9 w-9" />
            <span className="font-semibold text-white">Carbonomics-AI</span>
          </a>
          <div className="hidden items-center gap-7 text-sm text-teal-50/90 md:flex">
            {links.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)} className="hover:text-white">{l}</a>)}
            <a href="#login" className="rounded-xl bg-white px-4 py-2 font-medium text-teal-900 hover:bg-teal-50">Login</a>
          </div>
          <button className="rounded-lg p-2 text-white md:hidden" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
            {menu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menu && (
          <div className="space-y-1 border-t border-white/10 px-4 pb-5 pt-3 md:hidden">
            {links.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)} className="block rounded-lg px-3 py-3 text-teal-50 hover:bg-white/10">{l}</a>)}
            <a href="#overview" className="block rounded-lg px-3 py-3 text-teal-50 hover:bg-white/10">View Demo</a>
            <a href="#login" className="mt-2 block rounded-xl bg-white px-4 py-3 text-center font-medium text-teal-900">Login</a>
          </div>
        )}
      </nav>

      <header className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="grid-bg absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="anim-drift absolute -left-24 top-10 -z-10 h-80 w-80 rounded-full bg-teal-500/30 blur-3xl" />
        <div className="anim-drift absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl [animation-delay:-6s]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-32 sm:px-8 sm:pt-40 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-teal-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Campus carbon intelligence
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Know your carbon footprint.{' '}
              <span className="text-shine bg-gradient-to-r from-teal-300 via-emerald-200 to-teal-300 bg-clip-text text-transparent">Then shrink it.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-teal-50/80 sm:text-lg">
              Carbonomics-AI turns electricity and diesel records into audit-style carbon accounting, forecasts, what-if scenarios and a
              budget-aware reduction plan, with every factor and assumption visible.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#overview" className={primary}><Play size={16} /> View Demo</a>
              <a href="#login" className={ghost}><LogIn size={16} /> Login</a>
              <a href={MAILTO} className={ghost}><Mail size={16} /> Request Demo</a>
            </div>
            <p className="mt-5 max-w-xl text-xs leading-relaxed text-teal-100/60">
              The demo is open to everyone and uses made-up random numbers for an imaginary campus, labelled FAKE throughout. Uploading
              your own data, history and reports need a login; accounts are created by the team.
            </p>
          </div>
          <HeroPreview />
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-8 text-center sm:px-8 md:grid-cols-4">
          {[['Scope 1 · 2 · 3', 'GHG Protocol scopes'], ['Activity × Factor', 'never a guess'], ['Time-based split', 'no leakage in forecasts'], ['PDF report', 'plain-language']].map(([a, b]) => (
            <div key={a} className="px-2 py-3">
              <div className="text-lg font-semibold text-teal-700 dark:text-teal-300 sm:text-xl">{a}</div>
              <div className="muted text-xs sm:text-sm">{b}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-8">
        <Reveal><h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">How it works</h2></Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="card relative h-full overflow-hidden">
                <span className="absolute -right-2 -top-4 text-8xl font-bold text-slate-100 dark:text-slate-800" aria-hidden="true">{s.n}</span>
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-semibold text-white">{s.n}</div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="muted mt-1 text-sm leading-relaxed">{s.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <Reveal><h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">What it does</h2></Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 90}>
                <div className="card group h-full transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-slate-800 dark:text-brand-500"><Icon size={20} /></span>
                  <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{title}</h3>
                  <p className="muted mt-1.5 text-sm leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="muted mt-6 flex items-start gap-2 text-sm"><History size={16} className="mt-0.5 shrink-0" /> Logged-in users get a private history of every run and saved scenario, visible only to them.</p>
        </div>
      </section>

      <section id="team" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-8">
        <Reveal>
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">About the project</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">
            Carbonomics-AI is a final-year project from the Department of Artificial Intelligence and Data Science at K. K. Wagh
            Institute of Engineering Education and Research (KKWIEER), Nashik. It combines carbon accounting, machine-learning forecasting,
            simulation and optimization so that a campus can see where its emissions come from and what changing them would do.
          </p>
        </Reveal>
        <h2 className="mt-14 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">Team Carbonomics</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 90}>
              <div className="card h-full transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-semibold text-white" aria-hidden="true">
                  {m.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <div className="mt-4 font-semibold text-slate-900 dark:text-white">{m.name}</div>
                <div className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-500">{m.role}</div>
                <div className="muted mt-2 text-xs">{m.tag}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="muted mt-6 text-sm">Project guide: Dr. Sneha A. Khaire, Professor, Department of AI &amp; DS, KKWIEER, Nashik.</p>
      </section>

      <section className="relative isolate overflow-hidden bg-slate-950 py-16 text-white">
        <div className="anim-drift absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-500/25 blur-3xl" />
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-8">
          <h2 className="text-2xl font-semibold sm:text-4xl">See it with a demo campus</h2>
          <p className="mt-3 text-teal-50/75">No sign-up. The demo uses fake numbers, so you can click through every chart safely.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#overview" className={primary}>Open the demo <ArrowRight size={16} /></a>
            <a href="#login" className={ghost}><LogIn size={16} /> Login</a>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl space-y-2 px-4 text-xs leading-relaxed text-slate-500 sm:px-8 dark:text-slate-400">
          <p>Carbonomics-AI is a project of the Department of AI &amp; DS, K. K. Wagh Institute of Engineering Education and Research (KKWIEER), Nashik, built by Team Carbonomics.</p>
          <p>© 2026 Team Carbonomics. All rights reserved. The content, design, data and code of this site may not be copied, reproduced, scraped or reused without written permission.</p>
          <p>Contact: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> · <a className="underline" href="#privacy">Privacy Policy</a> · <a className="underline" href="#terms">Terms of Use</a></p>
        </div>
      </footer>
    </div>
  )
}
