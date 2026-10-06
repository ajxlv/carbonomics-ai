import { useCallback, useEffect, useState } from 'react'
import { FileText, FlaskConical, Loader2, Target, Trash2 } from 'lucide-react'
import { Badge, Callout, Card, Kpi, fmt } from '../ui.jsx'
import { api } from '../api.js'
import { PlanView } from './OptimizeCard.jsx'

const when = (iso) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Simulation({ run, onBack }) {
  const T = run.result?.totals
  const i = run.input ?? {}
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="muted text-sm hover:underline">← Back to history</button>
      <Card title={run.title || 'Saved scenario'} subtitle={`Saved ${when(run.created_at)}`} badge={<Badge tone="blue">YOUR DATA</Badge>}>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="muted text-xs">Electricity change</dt><dd className="font-medium">{i.electricity_change_pct ?? 0}%</dd></div>
          <div><dt className="muted text-xs">Diesel change</dt><dd className="font-medium">{i.diesel_change_pct ?? 0}%</dd></div>
          <div><dt className="muted text-xs">Solar offset per period</dt><dd className="font-medium">{fmt(i.solar_offset_kwh_per_period ?? 0)} kWh</dd></div>
        </dl>
      </Card>
      {T && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi label="Baseline" value={fmt(T.baseline_total_tco2e, 2)} unit="tCO₂e" sub="file as uploaded" />
          <Kpi label="Scenario" value={fmt(T.scenario_total_tco2e, 2)} unit="tCO₂e" sub="after the changes" />
          <Kpi label="Saved" value={fmt(T.saved_tco2e, 2)} unit="tCO₂e" sub={`${fmt(T.saved_pct, 1)}% of baseline`} />
        </div>
      )}
      {run.result?.note && <p className="muted text-xs">{run.result.note}</p>}
    </div>
  )
}

function Optimization({ run, onBack }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="muted text-sm hover:underline">← Back to history</button>
      <Card title={run.title || 'Saved optimization plan'} subtitle={`Saved ${when(run.created_at)}. Based on the measure figures entered at the time.`} badge={<Badge tone="blue">YOUR INPUTS</Badge>}>
        <PlanView r={run.result} />
      </Card>
    </div>
  )
}

const KIND = { analysis: 'Analysis', simulation: 'Scenario', optimization: 'Optimization plan' }

export default function HistoryPage({ onOpenAnalysis }) {
  const [runs, setRuns] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [sim, setSim] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try { setRuns(await api('/api/runs')) } catch (e) { setError(e.message); setRuns([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const open = async (r) => {
    setBusyId(r.id); setError('')
    try {
      const full = await api(`/api/runs/${r.id}`)
      if (full.kind === 'analysis') onOpenAnalysis(full)
      else setSim(full)
    } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title || r.input?.file_name || 'this run'}" from your history? This cannot be undone.`)) return
    setBusyId(r.id); setError('')
    try { await api(`/api/runs/${r.id}`, { method: 'DELETE' }); setRuns((rs) => rs.filter((x) => x.id !== r.id)) } catch (e) { setError(e.message) } finally { setBusyId(null) }
  }

  if (sim) return sim.kind === 'optimization' ? <Optimization run={sim} onBack={() => setSim(null)} /> : <Simulation run={sim} onBack={() => setSim(null)} />

  return (
    <div className="space-y-5">
      <Callout tone="blue" title="Your private history">
        Every analysis you run, and every scenario you choose to save, is kept here and is visible only to you. Your CSV file itself is not stored,
        only its name, the period totals and the results. You can delete any run at any time.
      </Callout>
      {error && <Callout title="Something went wrong">{error}</Callout>}
      {runs === null && <p className="muted flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</p>}
      {runs && runs.length === 0 && !error && <Card><p className="muted text-sm">Nothing saved yet. Analyse a file on the “Upload your data” page and it will appear here.</p></Card>}
      {runs && runs.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {runs.map((r) => {
              const isAnalysis = r.kind === 'analysis'
              const name = r.title || r.input?.file_name || KIND[r.kind] || 'Run'
              const total = isAnalysis ? r.summary?.total_tco2e : r.kind === 'optimization' ? r.summary?.tco2e_saved : r.summary?.scenario_total_tco2e
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-slate-800 dark:text-brand-500">{isAnalysis ? <FileText size={18} /> : r.kind === 'optimization' ? <Target size={18} /> : <FlaskConical size={18} />}</span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-white">{name}</div>
                      <div className="muted text-xs">
                        {KIND[r.kind] || 'Run'} · {when(r.created_at)}
                        {total != null && <> · {fmt(total, 2)} tCO₂e{r.kind === 'optimization' ? ` saved per year (${fmt(r.summary?.pct_of_baseline, 1)}%)` : !isAnalysis && r.summary?.saved_pct != null ? ` (${fmt(r.summary.saved_pct, 1)}% saved)` : ''}</>}
                        {isAnalysis && r.summary?.period_start && <> · {r.summary.period_start} to {r.summary.period_end}</>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled={busyId === r.id} onClick={() => open(r)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      {busyId === r.id ? 'Opening…' : 'Open'}
                    </button>
                    <button disabled={busyId === r.id} onClick={() => remove(r)} aria-label={`Delete ${name}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40"><Trash2 size={16} /></button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
