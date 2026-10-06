import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Loader2, Plus, Sun, Trash2 } from 'lucide-react'
import { Badge, COLORS, Callout, Card, Kpi, fmt, useChartTheme } from '../ui.jsx'
import { api } from '../api.js'

const YourInputs = () => <Badge tone="blue">YOUR INPUTS</Badge>
const field = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900'

// 3300000 -> "₹33.00 lakh"; shown next to the budget box so a missing zero is easy to spot.
export function inr(n) {
  if (n == null || Number.isNaN(n)) return '-'
  const v = Math.abs(n)
  if (v >= 1e7) return `₹${fmt(n / 1e7, 2)} crore`
  if (v >= 1e5) return `₹${fmt(n / 1e5, 2)} lakh`
  return `₹${fmt(n)}`
}

let nextId = 1
const blank = (mode = 'plain') => ({ id: nextId++, mode, label: '', acts_on: 'electricity', pct: false, saving: '', kwp: '', yield_: '', capex: '', units: '1', ann: '', group: '' })

const toBody = (m) => {
  const solar = m.mode === 'solar'
  return {
    label: m.label, acts_on: solar ? 'electricity' : m.acts_on,
    saving_type: solar ? 'fixed_kwh_per_year' : m.pct ? 'pct_of_activity' : m.acts_on === 'electricity' ? 'fixed_kwh_per_year' : 'fixed_litres_per_year',
    saving_value: solar ? Number(m.kwp) * Number(m.yield_) : m.saving === '' ? null : Number(m.saving),
    capex_inr: m.capex === '' ? null : Number(m.capex), max_units: m.units === '' ? null : Number(m.units),
    exclusive_group: m.group || null, annual_saving_inr: m.ann === '' ? null : Number(m.ann),
  }
}

export default function OptimizeCard({ r, onPlan }) {
  const { accounting, input } = r
  const [budget, setBudget] = useState('')
  const [rows, setRows] = useState([blank()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState(null)
  const [saveState, setSaveState] = useState(null)

  const hasElec = 'electricity_kwh' in accounting.periods[0]
  const hasDiesel = 'diesel_litres' in accounting.periods[0]
  const upd = (id, k) => (e) => setRows((rs) => rs.map((m) => (m.id === id ? { ...m, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } : m)))
  const request = (extra = {}) => ({
    periods: accounting.periods.map((p) => ({ period_start: p.period_start, electricity_kwh: p.electricity_kwh, diesel_litres: p.diesel_litres })),
    granularity: input.granularity_analysed, budget_inr: budget === '' ? null : Number(budget),
    measures: rows.map(toBody), ...extra,
  })

  const run = async () => {
    setBusy(true); setError(''); setSaveState(null)
    try {
      const req = request()
      setRes(await api('/api/optimize', { method: 'POST', json: req }))
      onPlan?.({ budget_inr: req.budget_inr, measures: req.measures })
    } catch (e) { setError(e.message); setRes(null); onPlan?.(null) } finally { setBusy(false) }
  }
  const save = async () => {
    setSaveState('saving')
    try {
      const out = await api('/api/optimize', { method: 'POST', json: request({ save: true, title: `Optimization, budget ${inr(Number(budget))}`, parent_run_id: r.run?.id ?? null }) })
      setSaveState(out.run?.saved ? { ok: true, message: 'Plan saved to your history.' } : { ok: false, message: out.run?.error || 'History is not available, so the plan was not saved.' })
    } catch (e) { setSaveState({ ok: false, message: e.message }) }
  }

  return (
    <Card title="Optimization: best measures within a budget"
      subtitle="Enter your own measures and costs. Nothing is pre-filled, so the result is only as good as the figures you type." badge={<YourInputs />}>
      <label className="block max-w-xs text-sm">
        <span className="muted mb-1 block text-xs">Total budget (₹)</span>
        <input type="number" min="0" className={field} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 3300000" />
        {budget !== '' && Number(budget) >= 0 && <span className="muted mt-1 block text-xs">= {inr(Number(budget))}</span>}
      </label>

      <div className="mt-5 space-y-3">
        {rows.map((m, i) => (
          <div key={m.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="muted flex items-center gap-1.5 text-xs font-medium">{m.mode === 'solar' && <Sun size={14} />} Measure {i + 1}{m.mode === 'solar' ? ' (solar)' : ''}</span>
              <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== m.id))} disabled={rows.length === 1} aria-label={`Remove measure ${i + 1}`} className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/40"><Trash2 size={15} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm lg:col-span-2"><span className="muted mb-1 block text-xs">Name</span>
                <input className={field} maxLength={100} value={m.label} onChange={upd(m.id, 'label')} placeholder={m.mode === 'solar' ? 'e.g. Rooftop solar, 100 kWp' : 'e.g. LED retrofit'} /></label>
              {m.mode === 'plain' ? (
                <>
                  <label className="text-sm"><span className="muted mb-1 block text-xs">Reduces</span>
                    <select className={field} value={m.acts_on} onChange={upd(m.id, 'acts_on')}>
                      {hasElec && <option value="electricity">Electricity</option>}
                      {hasDiesel && <option value="diesel">Generator diesel</option>}
                    </select></label>
                  <label className="text-sm"><span className="muted mb-1 block text-xs">{m.pct ? 'Saving (% of yearly use)' : `Saving per unit (${m.acts_on === 'electricity' ? 'kWh' : 'litres'} per year)`}</span>
                    <input type="number" min="0" className={field} value={m.saving} onChange={upd(m.id, 'saving')} />
                    <span className="mt-1 flex items-center gap-1.5 text-xs"><input type="checkbox" checked={m.pct} onChange={upd(m.id, 'pct')} /> enter as a percentage</span></label>
                </>
              ) : (
                <>
                  <label className="text-sm"><span className="muted mb-1 block text-xs">Size of one unit (kWp)</span>
                    <input type="number" min="0" className={field} value={m.kwp} onChange={upd(m.id, 'kwp')} /></label>
                  <label className="text-sm"><span className="muted mb-1 block text-xs">Yield (kWh per kWp per year), your figure</span>
                    <input type="number" min="0" className={field} value={m.yield_} onChange={upd(m.id, 'yield_')} /></label>
                </>
              )}
              <label className="text-sm"><span className="muted mb-1 block text-xs">Cost of one unit (₹)</span>
                <input type="number" min="0" className={field} value={m.capex} onChange={upd(m.id, 'capex')} /></label>
              <label className="text-sm"><span className="muted mb-1 block text-xs">Most units possible</span>
                <input type="number" min="1" max="1000" className={field} value={m.units} onChange={upd(m.id, 'units')} /></label>
              <label className="text-sm"><span className="muted mb-1 block text-xs">Yearly ₹ saved per unit (optional, for payback)</span>
                <input type="number" min="0" className={field} value={m.ann} onChange={upd(m.id, 'ann')} /></label>
              <label className="text-sm"><span className="muted mb-1 block text-xs">Alternative group (optional)</span>
                <input className={field} maxLength={40} value={m.group} onChange={upd(m.id, 'group')} placeholder="same word = pick only one" /></label>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setRows((rs) => [...rs, blank()])} disabled={rows.length >= 30} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"><Plus size={15} /> Add measure</button>
        {hasElec && <button onClick={() => setRows((rs) => [...rs, blank('solar')])} disabled={rows.length >= 30} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"><Sun size={15} /> Add solar (kWp × yield)</button>}
        <button onClick={run} disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50">
          {busy && <Loader2 size={16} className="animate-spin" />} Find best plan
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}

      {res && (
        <div className="mt-6 space-y-5 border-t border-slate-200 pt-5 dark:border-slate-800">
          <PlanView r={res} />
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saveState === 'saving'}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50">
              {saveState === 'saving' && <Loader2 size={16} className="animate-spin" />} Save this plan
            </button>
            {saveState && saveState !== 'saving' && <span className={`text-xs ${saveState.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>{saveState.message}</span>}
          </div>
        </div>
      )}
    </Card>
  )
}

const th = 'py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide'

// The result of /api/optimize. Also used by the History page to show a saved plan.
export function PlanView({ r }) {
  const t = useChartTheme()
  const { baseline, optimal: o, greedy: g, ranking } = r
  const chart = ranking.map((x) => ({ name: x.label, pct: x.pct_of_baseline_per_unit }))
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Baseline" value={fmt(baseline.tco2e_per_year, 1)} unit="tCO₂e / year" sub={`from ${baseline.days_covered} days of your data`} />
        <Kpi label="Best plan saves" value={fmt(o.tco2e_saved, 1)} unit="tCO₂e / year" sub={`${fmt(o.pct_of_baseline, 1)}% of baseline`} />
        <Kpi label="Plan cost" value={inr(o.total_capex_inr)} sub={`budget ${inr(r.budget_inr)}`} />
        <Kpi label="Payback" value={o.payback_years != null ? fmt(o.payback_years, 1) : '-'} unit={o.payback_years != null ? 'years' : ''} sub={o.payback_years != null ? 'from your rupee savings' : 'needs a yearly ₹ saving for every chosen measure'} />
      </div>

      {o.selected.length === 0
        ? <Callout tone="blue">No measure fits this budget. Increase the budget or lower a measure's cost.</Callout>
        : (
          <div className="overflow-x-auto">
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Recommended plan (selected by the optimiser)</h4>
            <table className="w-full text-sm">
              <thead><tr className="muted border-b border-slate-200 dark:border-slate-800"><th className={th}>Measure</th><th className={`${th} text-right`}>Units</th><th className={`${th} text-right`}>Cost</th><th className={`${th} text-right`}>tCO₂e saved / year</th><th className={`${th} text-right`}>% of baseline</th></tr></thead>
              <tbody>
                {o.selected.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 pr-4 font-medium">{s.label}</td><td className="py-2.5 pr-4 text-right tabular-nums">{s.units}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{inr(s.capex_inr)}</td><td className="py-2.5 pr-4 text-right tabular-nums">{fmt(s.tco2e_saved, 2)}</td><td className="py-2.5 text-right tabular-nums">{fmt(s.pct_of_baseline, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <div className="overflow-x-auto">
        <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Each measure on its own, best reduction first</h4>
        <table className="w-full text-sm">
          <thead><tr className="muted border-b border-slate-200 dark:border-slate-800"><th className={th}>#</th><th className={th}>Measure</th><th className={`${th} text-right`}>% reduction (one unit)</th><th className={`${th} text-right`}>₹ per tCO₂e saved</th><th className={`${th} text-right`}>Payback (years)</th></tr></thead>
          <tbody>
            {ranking.map((x, i) => (
              <tr key={x.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <td className="py-2.5 pr-4">{i + 1}</td>
                <td className="py-2.5 pr-4 font-medium">{x.label} {i === 0 && <Badge tone="green">largest reduction</Badge>} {x.cap_applied && <Badge tone="amber">capped at the source's use</Badge>}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{fmt(x.pct_of_baseline_per_unit, 2)}%</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{x.inr_per_tco2e != null ? inr(x.inr_per_tco2e) : '-'}</td>
                <td className="py-2.5 text-right tabular-nums">{x.payback_years != null ? fmt(x.payback_years, 1) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid stroke={t.grid} horizontal={false} />
            <XAxis type="number" stroke={t.axis} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" stroke={t.axis} tickLine={false} width={150} />
            <Tooltip contentStyle={t.tip} formatter={(v) => [`${fmt(v, 2)}% of baseline`, 'Reduction (one unit)']} />
            <Bar animationDuration={900} dataKey="pct" fill={COLORS.electricity} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="muted text-xs">
        Comparison: ordering measures by cost-effectiveness alone (a simple "cheapest first" rule) would save {fmt(g.tco2e_saved, 1)} tCO₂e per year for {inr(g.total_capex_inr)};
        the optimiser's plan saves {fmt(o.tco2e_saved, 1)}. Solver: {r.solver_status}; cross-check against the scenario calculation {r.consistency_check.passed ? 'passed' : 'FAILED'}.
      </p>
      {r.notes.map((n) => <Callout key={n} tone="blue">{n}</Callout>)}
      <p className="muted text-xs">{r.disclaimer}</p>
    </div>
  )
}
