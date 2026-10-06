import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Card, fmt } from '../ui.jsx'

const WHILE_RUNNING = [
  'Reading your file',
  'Checking dates and values',
  'Carbon accounting (activity × emission factor)',
  'Training Random Forest',
  'Training XGBoost',
  'Training Ridge regression',
  'Comparing models on held-out weeks',
  'Forecasting the next weeks',
]

// Steps after a run, with the numbers the server reported (settings tried, scores, seconds).
function finished(a) {
  const { input, forecast } = a.result
  const steps = [
    { label: 'Reading your file', detail: `${fmt(input.rows)} ${input.granularity_analysed} rows` },
    { label: 'Checking dates and values', detail: 'no gaps, no missing numbers, nothing filled in' },
    { label: 'Carbon accounting (activity × emission factor)', detail: `${fmt(a.result.accounting.totals.total_tco2e, 2)} tCO₂e in total` },
  ]
  const targets = forecast?.targets ? Object.entries(forecast.targets) : []
  const logs = targets.map(([, b]) => b.training).filter(Boolean)
  if (!logs.length) {
    steps.push({ label: 'Forecast', detail: forecast?.reason || 'not run for this file' })
    return { steps, seconds: null }
  }
  const names = logs[0].models
  names.forEach((m, i) => {
    const sec = logs.reduce((s, l) => s + (l.models[i]?.seconds ?? 0), 0)
    const tried = logs.reduce((s, l) => s + (l.models[i]?.settings_tried ?? 0), 0)
    steps.push({ label: `Trained ${m.label}`, detail: `${tried} settings checked with rolling validation, ${fmt(sec, 2)} s` })
  })
  const chosen = targets.map(([t, b]) => `${t === 'diesel_litres' ? 'diesel' : 'electricity'}: ${b.chosen_model.replaceAll('_', ' ')}`).join(', ')
  steps.push({ label: 'Compared models on held-out weeks', detail: `used for the forecast, ${chosen}` })
  const weeks = targets[0][1].future.length
  steps.push({ label: `Forecast for the next ${weeks} weeks`, detail: 'predicted activity × emission factor' })
  return { steps, seconds: logs.reduce((s, l) => s + l.seconds, 0) }
}

export default function TrainingProgress({ busy, analysis }) {
  const [at, setAt] = useState(0)
  useEffect(() => {
    if (!busy) return undefined
    setAt(0)
    const id = setInterval(() => setAt((i) => Math.min(i + 1, WHILE_RUNNING.length - 2)), 650)
    return () => clearInterval(id)
  }, [busy])

  if (busy) {
    return (
      <Card title="Analysing your file" subtitle="Models are being trained on your data right now">
        <ol className="space-y-2.5">
          {WHILE_RUNNING.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${i > at ? 'opacity-35' : ''}`}>
              {i < at ? <Check size={16} className="text-emerald-600" /> : i === at ? <Loader2 size={16} className="animate-spin text-brand-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700" />}
              <span className={i === at ? 'font-medium' : ''}>{label}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="shimmer h-full w-full rounded-full" /></div>
      </Card>
    )
  }
  if (!analysis) return null
  const { steps, seconds } = finished(analysis)
  return (
    <Card title="Your file is analysed" subtitle={seconds != null ? `Models trained and compared in ${fmt(seconds, 1)} s on the server` : 'Carbon accounting is done'}>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={s.label} className="rise flex items-start gap-3 text-sm" style={{ '--d': `${i * 90}ms` }}>
            <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <span><span className="font-medium">{s.label}</span><span className="muted"> · {s.detail}</span></span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
