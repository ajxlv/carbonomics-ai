import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Check, FileUp, Loader2 } from 'lucide-react'
import { Badge, COLORS, Callout, Card, Kpi, MODEL_LABEL, fmt, shortDate, useChartTheme } from '../ui.jsx'
import { api } from '../api.js'

const MODELS = ['naive_last_week', 'train_mean', 'random_forest', 'xgboost']
const TARGET_LABEL = { electricity_kwh: 'Electricity (kWh)', diesel_litres: 'Generator diesel (L)' }
const TARGET_UNIT = { electricity_kwh: 'kWh', diesel_litres: 'L' }
const YourData = () => <Badge tone="blue">YOUR DATA</Badge>

function analyze(file, opts) {
  const body = new FormData()
  body.append('file', file)
  ;['date_col', 'electricity_col', 'diesel_col', 'title'].forEach((k) => { if (opts[k]) body.append(k, opts[k]) })
  body.append('future_weeks', String(opts.future_weeks))
  return api('/api/analyze', { method: 'POST', form: body })
}

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900'

export default function Upload({ opened, onCloseOpened }) {
  const [file, setFile] = useState(null)
  const [opts, setOpts] = useState({ title: '', date_col: '', electricity_col: '', diesel_col: '', future_weeks: 8 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // A run opened from History replaces whatever was on screen.
  useEffect(() => { if (opened) { setResult({ ...opened.result, run: { saved: true, id: opened.id, error: null, title: opened.title, opened: true } }); setError('') } }, [opened])

  const run = async () => {
    setBusy(true); setError(''); setResult(null); onCloseOpened?.()
    try { setResult(await analyze(file, opts)) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const set = (k) => (e) => setOpts({ ...opts, [k]: e.target.value })

  return (
    <div className="space-y-6">
      <Callout tone="blue" title="Analyse your own CSV">
        Upload daily, weekly or monthly rows with a date column and electricity (kWh) and/or generator diesel (litres).
        Emission is always activity x emission factor. The forecast predicts activity only, and a model is used only if it
        beats the naive last-week guess. Your CSV file itself is processed in memory and is not stored; the results (totals and
        per-period figures) are saved to your private history so you can open them later.
      </Callout>

      <Card title="1. Choose a file" badge={<YourData />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-4 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
            <FileUp size={22} className="shrink-0 text-brand-600" />
            <span className="min-w-0 truncate">{file ? file.name : 'Click to choose a .csv file (max 5 MB)'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError('') }} />
          </label>
          <label className="text-sm">
            <span className="muted mb-1 block text-xs">Weeks to forecast (1 to 26)</span>
            <input type="number" min="1" max="26" className={field} value={opts.future_weeks} onChange={set('future_weeks')} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="muted mb-1 block text-xs">Name for this run (optional, shown in History)</span>
            <input maxLength={200} className={field} placeholder="e.g. Main building, FY 2025-26" value={opts.title} onChange={set('title')} />
          </label>
        </div>
        <details className="mt-4 text-sm">
          <summary className="muted cursor-pointer text-xs">Column names (optional)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="muted mb-1 block text-xs">Date column</span><input className={field} placeholder="auto-detect" value={opts.date_col} onChange={set('date_col')} /></label>
            <label><span className="muted mb-1 block text-xs">Electricity (kWh) column</span><input className={field} placeholder="auto-detect" value={opts.electricity_col} onChange={set('electricity_col')} /></label>
            <label><span className="muted mb-1 block text-xs">Diesel (litres) column</span><input className={field} placeholder="auto-detect" value={opts.diesel_col} onChange={set('diesel_col')} /></label>
          </div>
        </details>
        <button disabled={!file || busy} onClick={run}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy && <Loader2 size={16} className="animate-spin" />} {busy ? 'Analysing…' : 'Analyse'}
        </button>
      </Card>

      {error && <Callout title="Could not analyse this file"><div className="flex gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div></Callout>}
      {result && <Results r={result} />}
    </div>
  )
}

function SavedNote({ run }) {
  if (!run) return null
  if (run.saved) return <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><Check size={14} /> {run.opened ? 'Opened from your history.' : 'Saved to your history.'}</p>
  if (run.error) return <Callout title="Not saved to history">{run.error} The analysis below is still correct.</Callout>
  return null
}

function Results({ r }) {
  const t = useChartTheme()
  const { input, accounting, factors_used: factors, forecast } = r
  const tot = accounting.totals
  const hasPeriods = Array.isArray(accounting.periods)
  const bars = (accounting.periods ?? []).map((p) => ({ period: p.period_start, 'Scope 1 (diesel)': p.scope1_kg, 'Scope 2 (electricity)': p.scope2_kg }))

  return (
    <div className="space-y-6">
      <SavedNote run={r.run} />
      {r.truncated && <Callout tone="blue" title="Summary only">This run was too large to store in full, so the per-period charts, scenario and forecast detail were not saved. Upload the file again to see them.</Callout>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total emission" value={fmt(tot.total_tco2e, 2)} unit="tCO₂e" sub={`${input.period_start} to ${input.period_end}`} badge={<YourData />} />
        <Kpi label="Scope 2 (electricity)" value={fmt(tot.scope2_tco2e, 2)} unit="tCO₂e" sub="activity x grid factor" />
        <Kpi label="Scope 1 (diesel)" value={fmt(tot.scope1_tco2e, 2)} unit="tCO₂e" sub="activity x diesel factor" />
        <Kpi label="Rows analysed" value={fmt(input.rows)} sub={`${input.granularity_detected} data${input.granularity_detected !== input.granularity_analysed ? `, analysed as ${input.granularity_analysed}` : ''}`} />
      </div>
      {(input.notes ?? []).map((n) => <Callout key={n} tone="blue">{n}</Callout>)}

      {hasPeriods && <Card title={`Emission per ${input.granularity_analysed === 'monthly' ? 'month' : 'week'}`} subtitle="kg CO₂e, stacked by scope" badge={<YourData />}>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={bars} margin={{ left: -5 }}>
              <CartesianGrid stroke={t.grid} vertical={false} />
              <XAxis dataKey="period" tickFormatter={shortDate} stroke={t.axis} tickLine={false} minTickGap={24} />
              <YAxis stroke={t.axis} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={64} />
              <Tooltip contentStyle={t.tip} labelFormatter={shortDate} formatter={(v, n) => [`${fmt(v, 1)} kg CO₂e`, n]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="Scope 2 (electricity)" stackId="e" fill={COLORS.electricity} />
              <Bar isAnimationActive={false} dataKey="Scope 1 (diesel)" stackId="e" fill={COLORS.diesel} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>}

      <Card title="Emission factors used" subtitle="Every factor carries its source, version and unit">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="muted border-b border-slate-200 text-left text-xs uppercase tracking-wide dark:border-slate-800">
              <th className="py-2 pr-4">Activity</th><th className="py-2 pr-4 text-right">Factor</th><th className="py-2 pr-4">Unit</th><th className="py-2 pr-4">Source, version</th><th className="py-2">Verified</th>
            </tr></thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.factor_key} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                  <td className="py-2.5 pr-4 font-medium">{TARGET_LABEL[f.activity]}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{f.factor}</td>
                  <td className="py-2.5 pr-4">{f.output}</td>
                  <td className="py-2.5 pr-4">{f.source}, {f.version}</td>
                  <td className="py-2.5">{f.verified ? <Badge tone="green">verified</Badge> : <Badge tone="amber">unverified</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {hasPeriods && <Scenario r={r} />}
      {forecast?.targets && Object.values(forecast.targets).every((b) => b.backtest) && <Forecast forecast={forecast} t={t} />}
      <p className="muted text-xs">{r.disclaimer}</p>
    </div>
  )
}

function Forecast({ forecast, t }) {
  if (forecast.status !== 'ok') return <Callout title="No forecast for this file">{forecast.reason}</Callout>
  return (
    <>
      {Object.entries(forecast.targets).map(([target, b]) => {
        const unit = TARGET_UNIT[target]
        const rows = b.backtest.map((x) => ({ week_start: x.week_start, actual: x.actual, ...Object.fromEntries(MODELS.map((m) => [m, x[m]])) }))
        const lastActual = rows[rows.length - 1]
        const future = b.future.map((x) => ({ week_start: x.week_start, forecast: x.predicted }))
        // join the forecast line to the last observed week so the lines connect
        const data = [...rows.map((x, i) => (i === rows.length - 1 ? { ...x, forecast: lastActual.actual } : x)), ...future]
        const best = Math.min(...b.metrics.map((m) => m.MAE))
        return (
          <Card key={target} title={`Forecast: ${TARGET_LABEL[target]}`} subtitle={`Test weeks, then ${b.future.length} future weeks (dashed). Model used: ${MODEL_LABEL[b.chosen_model]}`} badge={<YourData />}>
            <div className={`mb-4 rounded-xl border p-3 text-sm ${b.beats_naive ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>
              {b.message}
              {b.warnings.map((w) => <div key={w} className="mt-1">{w}</div>)}
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={data} margin={{ left: -5 }}>
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis dataKey="week_start" tickFormatter={shortDate} stroke={t.axis} tickLine={false} minTickGap={24} />
                  <YAxis stroke={t.axis} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={64} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={t.tip} labelFormatter={shortDate} formatter={(v, n) => [`${fmt(v, 1)} ${unit}`, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line isAnimationActive={false} dataKey="actual" name="Actual" stroke={t.actual} strokeWidth={3} dot={{ r: 3 }} />
                  {MODELS.map((m) => (
                    <Line isAnimationActive={false} key={m} dataKey={m} name={MODEL_LABEL[m]} stroke={COLORS.models[m]} strokeWidth={1.4} dot={false} strokeDasharray={m === 'train_mean' ? '4 4' : undefined} />
                  ))}
                  <Line isAnimationActive={false} dataKey="forecast" name="Forecast" stroke={COLORS.electricity} strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="muted border-b border-slate-200 text-left text-xs uppercase tracking-wide dark:border-slate-800">
                  <th className="py-2 pr-4">Model</th><th className="py-2 pr-4 text-right">MAE</th><th className="py-2 pr-4 text-right">RMSE</th><th className="py-2 text-right">R²</th>
                </tr></thead>
                <tbody>
                  {b.metrics.map((m) => (
                    <tr key={m.model} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="py-2.5 pr-4 font-medium">{MODEL_LABEL[m.model]}{m.model === 'naive_last_week' && <span className="muted ml-2 text-xs">baseline</span>}</td>
                      <td className={`py-2.5 pr-4 text-right tabular-nums ${m.MAE === best ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}>{fmt(m.MAE, 1)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{fmt(m.RMSE, 1)}</td>
                      <td className="py-2.5 text-right tabular-nums">{fmt(m.R2, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted mt-3 text-xs">{b.train_weeks} training weeks, {b.test_weeks} test weeks (time-ordered split, no shuffling).</p>
            </div>
          </Card>
        )
      })}

      <Card title="Forecast emission" subtitle="Predicted activity x emission factor, kg CO₂e per week" badge={<YourData />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="muted border-b border-slate-200 text-left text-xs uppercase tracking-wide dark:border-slate-800">
              <th className="py-2 pr-4">Week starting</th><th className="py-2 pr-4 text-right">Scope 2</th><th className="py-2 pr-4 text-right">Scope 1</th><th className="py-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {forecast.emission_future.map((e) => (
                <tr key={e.week_start} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                  <td className="py-2 pr-4">{shortDate(e.week_start)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{fmt(e.scope2_kg, 1)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{fmt(e.scope1_kg, 1)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{fmt(e.total_kg, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

const slider = 'w-full accent-teal-700'

function Scenario({ r }) {
  const t = useChartTheme()
  const { input, accounting } = r
  const hasDiesel = 'diesel_litres' in accounting.periods[0]
  const hasElec = 'electricity_kwh' in accounting.periods[0]
  const unit = input.granularity_analysed === 'monthly' ? 'month' : 'week'
  const [sc, setSc] = useState({ e: 0, d: 0, s: 0 })
  const [sim, setSim] = useState(null)
  const [err, setErr] = useState('')
  const [saveState, setSaveState] = useState(null)   // null | 'saving' | { ok, message }

  const periodsBody = () => accounting.periods.map((p) => ({ period_start: p.period_start, electricity_kwh: p.electricity_kwh, diesel_litres: p.diesel_litres }))
  const save = async () => {
    setSaveState('saving')
    try {
      const res = await api('/api/simulate', { method: 'POST', json: {
        periods: periodsBody(), electricity_change_pct: sc.e, diesel_change_pct: sc.d, solar_offset_kwh_per_period: sc.s,
        save: true, title: `Scenario: ${r.run?.title || input.period_start + ' to ' + input.period_end}`, parent_run_id: r.run?.id ?? null,
      } })
      setSaveState(res.run?.saved ? { ok: true, message: 'Scenario saved to your history.' } : { ok: false, message: res.run?.error || 'History is not available, so the scenario was not saved.' })
    } catch (e) { setSaveState({ ok: false, message: e.message }) }
  }
  useEffect(() => { setSaveState(null) }, [sc])

  useEffect(() => {
    const periods = periodsBody()
    const ctl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const json = await api('/api/simulate', { method: 'POST', signal: ctl.signal,
          json: { periods, electricity_change_pct: sc.e, diesel_change_pct: sc.d, solar_offset_kwh_per_period: sc.s } })
        setSim(json); setErr('')
      } catch (e) { if (e.name !== 'AbortError') setErr(e.message) }
    }, 300)
    return () => { clearTimeout(timer); ctl.abort() }
  }, [sc, accounting])

  const T = sim?.totals
  const rows = sim?.periods.map((p) => ({ period: p.period_start, Baseline: p.base_total_tco2e, Scenario: p.scen_total_tco2e }))
  const num = (k) => (e) => setSc({ ...sc, [k]: Number(e.target.value) })

  return (
    <Card title="What-if scenario" subtitle="Try a change and see the emission effect. These are numbers you choose, not predictions of what a measure will achieve." badge={<YourData />}>
      <div className="grid gap-5 sm:grid-cols-3">
        {hasElec && (
          <label className="text-sm">
            <span className="mb-1 flex justify-between"><span>Electricity change</span><b className="tabular-nums">{sc.e > 0 ? '+' : ''}{sc.e}%</b></span>
            <input type="range" min="-100" max="100" step="1" value={sc.e} onChange={num('e')} className={slider} />
          </label>
        )}
        {hasDiesel && (
          <label className="text-sm">
            <span className="mb-1 flex justify-between"><span>Diesel change</span><b className="tabular-nums">{sc.d > 0 ? '+' : ''}{sc.d}%</b></span>
            <input type="range" min="-100" max="100" step="1" value={sc.d} onChange={num('d')} className={slider} />
          </label>
        )}
        {hasElec && (
          <label className="text-sm">
            <span className="muted mb-1 block text-xs">Solar offset (kWh per {unit}, 0 or more)</span>
            <input type="number" min="0" step="100" className={field} value={sc.s} onChange={num('s')} />
          </label>
        )}
      </div>
      {err && <p className="mt-4 text-sm text-rose-600">{err}</p>}
      {T && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Kpi label="Baseline" value={fmt(T.baseline_total_tco2e, 2)} unit="tCO₂e" sub="your file as uploaded" />
            <Kpi label="Scenario" value={fmt(T.scenario_total_tco2e, 2)} unit="tCO₂e" sub="after your changes" />
            <Kpi label="Saved" value={fmt(T.saved_tco2e, 2)} unit="tCO₂e" sub={`${fmt(T.saved_pct, 1)}% of baseline`} />
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer>
              <BarChart data={rows} margin={{ left: -5 }}>
                <CartesianGrid stroke={t.grid} vertical={false} />
                <XAxis dataKey="period" tickFormatter={shortDate} stroke={t.axis} tickLine={false} minTickGap={24} />
                <YAxis stroke={t.axis} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v, 1)} width={64} />
                <Tooltip contentStyle={t.tip} labelFormatter={shortDate} formatter={(v, n) => [`${fmt(v, 2)} tCO₂e`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar isAnimationActive={false} dataKey="Baseline" fill="#64748b" />
                <Bar isAnimationActive={false} dataKey="Scenario" fill={COLORS.electricity} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted mt-3 text-xs">{sim.note}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saveState === 'saving'}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50">
              {saveState === 'saving' && <Loader2 size={16} className="animate-spin" />} Save this scenario
            </button>
            {saveState && saveState !== 'saving' && <span className={`text-xs ${saveState.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>{saveState.message}</span>}
          </div>
        </>
      )}
    </Card>
  )
}
