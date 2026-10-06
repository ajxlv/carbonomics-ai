import { useEffect, useRef, useState } from 'react'
import Hills from './Hills.jsx'
import { ArrowRight, BarChart3, FileText, FlaskConical, History, ListChecks, LogIn, Mail, Menu, Play, Scale, Target, Upload, X } from 'lucide-react'

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
  { name: 'Sanket Chaudhari', role: 'Chief Architect & Project Lead', tag: 'Architecture, ML, backend and web, end to end' },
  { name: 'Atharva Jadhav', role: 'Chief Research Strategist', tag: 'Research design, literature and methodology' },
  { name: 'Rahil Shah', role: 'Head of Testing & Quality Assurance', tag: 'Testing and validation of every module' },
  { name: 'Purva Chopade', role: 'Head of Data Pipeline & Analytics', tag: 'Data pipeline, analytics and visualization' },
]

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

// A picture of the product, not real numbers: a dark window with rising bars and a ring.
function ProductMock() {
  const bars = [52, 64, 48, 78, 70, 58, 86, 66, 74, 60, 82, 55, 68, 72]
  return (
    <div className="glass mx-auto w-full max-w-3xl rounded-3xl p-4 shadow-2xl shadow-black/60 sm:p-6">
      <div className="mb-4 flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="ml-3 text-xs text-white/40">Overview · illustration, not real numbers</span></div>
      <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs text-white/50">Emissions by week</div>
          <div className="mt-4 flex h-36 items-end gap-1.5" aria-hidden="true">
            {bars.map((h, i) => <div key={i} className="bar-grow flex-1 rounded-t bg-gradient-to-t from-teal-600 to-teal-300" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />)}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {[['Activity × Factor', 'every factor sourced'], ['Forecast', 'beats naive, or says so'], ['Why it changed', 'energy use vs grid']].map(([a, b]) => (
            <div key={a} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"><div className="text-sm font-medium text-white">{a}</div><div className="text-xs text-white/45">{b}</div></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, kicker, title, text, flip }) {
  return (
    <Reveal>
      <div className={`grid items-center gap-8 rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8 md:grid-cols-2 ${flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-teal-900/50 via-slate-900 to-black">
          <div className="anim-drift absolute -left-6 top-4 h-32 w-32 rounded-full bg-teal-400/20 blur-3xl" />
          <Icon size={56} strokeWidth={1.1} className="anim-float relative text-teal-200" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-teal-300/80"><Icon size={14} /> {kicker}</div>
          <h3 className="font-display mt-3 text-3xl text-white">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{text}</p>
        </div>
      </div>
    </Reveal>
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
    <div className="dark min-h-screen overflow-x-hidden bg-slate-950 text-slate-300">
      <nav className={`fixed inset-x-0 top-0 z-50 transition ${scrolled || menu ? 'bg-slate-950/80 backdrop-blur-lg' : ''}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="#home" className="flex items-center gap-2.5" onClick={() => setMenu(false)}>
            <img src="./logo.svg" alt="Carbonomics-AI logo" className="h-9 w-9 rounded-lg" />
            <span className="font-medium text-white">Carbonomics-AI</span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            {links.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)} className="transition hover:text-white">{l}</a>)}
            <a href="#overview" className="transition hover:text-white">Demo</a>
            <a href="#login" className="pill-white !py-2">Login</a>
          </div>
          <button className="rounded-lg p-2 text-white md:hidden" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
            {menu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menu && (
          <div className="space-y-1 border-t border-white/10 px-4 pb-5 pt-3 md:hidden">
            {links.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)} className="block rounded-lg px-3 py-3 text-white/80 hover:bg-white/10">{l}</a>)}
            <a href="#overview" className="block rounded-lg px-3 py-3 text-white/80 hover:bg-white/10">View Demo</a>
            <a href="#login" className="pill-white mt-2 w-full">Login</a>
          </div>
        )}
      </nav>

      <header className="relative isolate flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 pb-32 pt-32 text-center text-white">
        <Hills />
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="glass mx-auto mb-7 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs text-teal-100/90"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Campus carbon intelligence · KKWIEER Nashik</p>
          <h1 className="font-display text-5xl leading-[1.05] sm:text-7xl">Carbon accounting and forecasting for modern campuses</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Turn electricity and diesel records into audit-style accounting, forecasts that earn their place, what-if scenarios and a budget-aware reduction plan. Every factor and assumption stays visible.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#overview" className="pill-white"><Play size={16} /> View Demo</a>
            <a href="#login" className="pill-ghost"><LogIn size={16} /> Login</a>
            <a href={MAILTO} className="pill-ghost"><Mail size={16} /> Request Demo</a>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-white/45">
            The demo is open to everyone and uses made-up random numbers for an imaginary campus, labelled FAKE throughout. Uploading your own data, history and reports need a login; accounts are created by the team.
          </p>
        </div>
        <div className="relative z-10 mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-white/55">
          {['Scope 1 · 2 · 3', 'Activity × Factor', 'Time-based validation', 'Plain-language PDF'].map((t) => <span key={t} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-teal-300" />{t}</span>)}
        </div>
      </header>

      <section className="relative z-10 -mt-24 px-4 pb-8 sm:px-8"><Reveal><ProductMock /></Reveal></section>

      <section id="features" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-20 sm:px-8">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl text-white sm:text-5xl">Deep carbon work for modern teams</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/50">From a raw spreadsheet to a plan you can hand over, in one place.</p>
        </Reveal>
        <div className="mt-12 space-y-6">
          <Feature icon={ListChecks} kicker="Accounting" title="Every number has a source" text={FEATURES[0].text} />
          <Feature icon={BarChart3} kicker="Forecasting" title="Forecasts that earn their place" text={FEATURES[1].text} flip />
          <Feature icon={Scale} kicker="Why it changed" title="Your doing, or the grid's?" text="When emissions change between two years, we split the change into what you did (energy use) and what the grid did (a cleaner or dirtier factor), using documented CEA values." />
          <Feature icon={Target} kicker="Optimization" title="The best plan for your budget" text={FEATURES[3].text} flip />
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[FEATURES[2], FEATURES[4], FEATURES[5]].map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[.03] p-5 transition hover:-translate-y-1 hover:border-teal-300/30">
                <Icon size={20} className="text-teal-300" />
                <h3 className="mt-4 font-medium text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/50">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-2 text-sm text-white/40"><History size={16} className="mt-0.5 shrink-0" /> Logged-in users get a private history of every run and saved scenario, visible only to them.</p>
      </section>

      <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-12 sm:px-8">
        <Reveal><h2 className="font-display text-4xl text-white">How it works</h2></Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] p-6">
                <span className="font-display absolute -right-1 -top-3 text-8xl text-white/[.05]" aria-hidden="true">{s.n}</span>
                <div className="relative">
                  <div className="font-display text-3xl text-teal-300">{s.n}</div>
                  <h3 className="mt-3 text-lg font-medium text-white">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/50">{s.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="team" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 sm:px-8">
        <Reveal>
          <h2 className="font-display text-4xl text-white">About the project</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-white/55">
            Carbonomics-AI is a final-year project from the Department of Artificial Intelligence and Data Science at K. K. Wagh
            Institute of Engineering Education and Research (KKWIEER), Nashik. It combines carbon accounting, machine-learning forecasting,
            simulation and optimization so that a campus can see where its emissions come from and what changing them would do.
          </p>
        </Reveal>
        <h2 className="font-display mt-14 text-4xl text-white">Team Carbonomics</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 90}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[.03] p-5 transition hover:-translate-y-1 hover:border-teal-300/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-700 text-sm font-semibold text-white" aria-hidden="true">{m.name.split(' ').map((w) => w[0]).join('')}</div>
                <div className="mt-4 font-medium text-white">{m.name}</div>
                <div className="mt-1 text-xs text-teal-300">{m.role}</div>
                <div className="mt-2 text-xs text-white/40">{m.tag}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-sm text-white/40">Project guide: Dr. Sneha A. Khaire, Professor, Department of AI &amp; DS, KKWIEER, Nashik.</p>
      </section>

      <section className="relative isolate overflow-hidden py-24 text-center text-white">
        <Hills />
        <Reveal className="relative z-10 mx-auto max-w-3xl px-4 sm:px-8">
          <h2 className="font-display text-4xl sm:text-5xl">See it with a demo campus</h2>
          <p className="mt-3 text-white/60">No sign-up. The demo uses fake numbers, so you can click through every chart safely.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#overview" className="pill-white">Open the demo <ArrowRight size={16} /></a>
            <a href="#login" className="pill-ghost"><LogIn size={16} /> Login</a>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 py-8">
        <div className="mx-auto max-w-6xl space-y-2 px-4 text-xs leading-relaxed text-white/40 sm:px-8">
          <div className="mb-3 flex items-center gap-2.5">
            <img src="./logo.svg" alt="Carbonomics-AI logo" className="h-10 w-10 rounded-lg" />
            <span className="text-sm font-medium text-white/80">Carbonomics-AI</span>
          </div>
          <p>Carbonomics-AI is a project of the Department of AI &amp; DS, K. K. Wagh Institute of Engineering Education and Research (KKWIEER), Nashik, built by Team Carbonomics.</p>
          <p>© 2026 Team Carbonomics. All rights reserved. The content, design, data and code of this site may not be copied, reproduced, scraped or reused without written permission.</p>
          <p>Contact: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> · <a className="underline" href="#privacy">Privacy Policy</a> · <a className="underline" href="#terms">Terms of Use</a></p>
        </div>
      </footer>
    </div>
  )
}
