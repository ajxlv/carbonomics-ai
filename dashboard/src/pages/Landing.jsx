import { BarChart3, FlaskConical, History, ListChecks, LogIn, Mail, Play, Upload } from 'lucide-react'

const CONTACT = 'carbonomics.app@gmail.com'
const MAILTO = `mailto:${CONTACT}?subject=${encodeURIComponent('Carbonomics-AI demo request')}&body=${encodeURIComponent('Hello,\n\nI would like a demo of Carbonomics-AI.\n\nName:\nInstitution / role:\nPreferred time:\n')}`

const FEATURES = [
  { icon: ListChecks, title: 'Carbon accounting', text: 'Scope 1 (generator diesel) and Scope 2 (grid electricity). Emission is always activity multiplied by an emission factor, and every factor shows its source, version and unit.' },
  { icon: BarChart3, title: 'Forecasting', text: 'Models forecast the activity (kWh, litres), never the emission itself. A model is used only if it beats a simple last-week guess on unseen weeks; otherwise the simple guess is shown.' },
  { icon: FlaskConical, title: 'What-if scenarios', text: 'Change electricity use, diesel use or add solar generation and see the effect on emissions straight away. You choose the numbers; nothing is promised on your behalf.' },
  { icon: Upload, title: 'Your own data', text: 'Upload a CSV of daily, weekly or monthly consumption, get the same accounting, forecast and scenarios, and keep every run in a private history.' },
]

const TEAM = [
  { name: 'Sanket Chaudhari', role: 'Team leader' },
  { name: 'Atharva Jadhav', role: 'Team member' },
  { name: 'Purva Chopade', role: 'Team member' },
  { name: 'Rahil Shah', role: 'Team member' },
]

const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition'
const primary = `${btn} bg-brand-600 text-white shadow-sm hover:bg-brand-700`
const outline = `${btn} border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <a href="#home" className="flex items-center gap-2.5">
          <img src="./favicon.svg" alt="" className="h-9 w-9" />
          <span className="font-semibold text-slate-900 dark:text-white">Carbonomics-AI</span>
        </a>
        <a href="#login" className={`${primary} !py-2`}><LogIn size={16} /> Login</a>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-8 sm:pt-16">
        <p className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-500">Campus carbon intelligence</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Know your campus carbon footprint, forecast it, and test how to reduce it.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Carbonomics-AI turns electricity and generator-diesel records into audit-style carbon accounting, forecasts of future use,
          and what-if scenarios, with every emission factor documented and every assumption visible.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#overview" className={primary}><Play size={16} /> View Demo</a>
          <a href={MAILTO} className={outline}><Mail size={16} /> Request Demo</a>
          <a href="#login" className={outline}><LogIn size={16} /> Login</a>
        </div>
        <p className="muted mt-4 max-w-2xl text-xs leading-relaxed">
          The demo is open to everyone. It uses made-up random numbers for an imaginary campus, labelled FAKE throughout; no real
          campus data is shown. Uploading your own data, saving
          history and everything else needs a login; accounts are created by the team.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">What it does</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card flex gap-4">
                <span className="h-fit rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-slate-800 dark:text-brand-500"><Icon size={20} /></span>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
                  <p className="muted mt-1 text-sm leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="muted mt-6 flex items-center gap-2 text-sm"><History size={16} /> Logged-in users get a private history of every run and saved scenario, visible only to them.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">About the project</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">
          Carbonomics-AI is a final-year project from the Department of Artificial Intelligence and Data Science at K. K. Wagh
          Institute of Engineering Education and Research (KKWIEER), Nashik. It combines carbon accounting, machine-learning forecasting,
          simulation and optimization so that a campus can see where its emissions come from and what changing them would do.
        </p>

        <h2 className="mt-12 text-2xl font-semibold text-slate-900 dark:text-white">Team</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <div key={m.name} className="card">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white" aria-hidden="true">
                {m.name.split(' ').map((w) => w[0]).join('')}
              </div>
              <div className="mt-3 font-semibold text-slate-900 dark:text-white">{m.name}</div>
              <div className="muted text-sm">{m.role}</div>
            </div>
          ))}
        </div>
        <p className="muted mt-5 text-sm">Project guide: Dr. Sneha A. Khaire, Professor, Department of AI &amp; DS, KKWIEER, Nashik.</p>
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
