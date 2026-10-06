import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react'
import { Badge, COLORS, Callout, Card, Kpi, MODEL_LABEL, fmt, shortDate, useChartTheme } from '../ui.jsx'

const DEFAULT_API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const MODELS = ['naive_last_week', 'train_mean', 'random_forest', 'xgboost']
const TARGET_LABEL = { electricity_kwh: 'Electricity (kWh)', diesel_litres: 'Generator diesel (L)' }
const TARGET_UNIT = { electricity_kwh: 'kWh', diesel_litres: 'L' }
const YourData = () => <Badge tone="blue">YOUR DATA</Badge>

async function analyze(apiUrl, file, opts) {
  const body = new FormData()
  body.append('file', file)
  ;['date_col', 'electricity_col', 'diesel_col'].forEach((k) => { if (opts[k]) body.append(k, opts[k]) })
  body.append('future_weeks', String(opts.future_weeks))
  let res
  try {
    res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/analyze`, { method: 'POST', body })
  } catch {
    throw new Error(`Could not reach the analysis server at ${apiUrl}. Start it from the repository root with: uvicorn api.main:app --port 8000`)
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof json.detail === 'string' ? json.detail : `Server error (HTTP ${res.status}).`)
  return json
}

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [apiUrl, setApiUrl] = useState(DEFAULT_API)
  const [opts, setOpts] = useState({ date_col: '', electricity_col: '', diesel_col: '', future_weeks: 8 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const run = async () => {
    setBusy(true); setError(''); setResult(null)
    try { setResult(await analyze(apiUrl, file, opts)) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const set = (k) => (e) => setOpts({ ...opts, [k]: e.target.value })

  return (
    <div className="space-y-6">
      <Callout tone="blue" title="Analyse your own CSV">
        Upload daily, weekly or monthly rows with a date column and electricity (kWh) and/or generator diesel (litres).
        Emission is always activity x emission factor. The forecast predicts activity only, and a model is used only if it
        beats the naive last-week guess. The file is processed in memory and not stored. This page needs the analysis server
        to be running; the static demo site does not include it.
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
        </div>
        <details className="mt-4 text-sm">
          <summary className="muted cursor-pointer text-xs">Column names and server address (optional)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="muted mb-1 block text-xs">Date column</span><input className={field} placeholder="auto-detect" value={opts.date_col} onChange={set('date_col')} /></label>
            <label><span className="muted mb-1 block text-xs">Electricity (kWh) column</span><input className={field} placeholder="auto-detect" value={opts.electricity_col} onChange={set('electricity_col')} /></label>
            <label><span className="muted mb-1 block text-xs">Diesel (litres) column</span><input className={field} placeholder="auto-detect" value={opts.diesel_col} onChange={set('diesel_col')} /></label>
            <label><span className="muted mb-1 block text-xs">Server address</span><input className={field} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} /></label>
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

function Results({ r }) {
  const t = useChartTheme()
  const { input, accounting, factors_used: factors, forecast } = r
  const tot = accounting.totals
  const bars = accounting.periods.map((p) => ({ period: p.period_start, 'Scope 1 (diesel)': p.scope1_kg, 'Scope 2 (electricity)': p.scope2_kg }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total emission" value={fmt(tot.total_tco2e, 2)} unit="tCO₂e" sub={`${input.period_start} to ${input.period_end}`} badge={<YourData />} />
        <Kpi label="Scope 2 (electricity)" value={fmt(tot.scope2_tco2e, 2)} unit="tCO₂e" sub="activity x grid factor" />
        <Kpi label="Scope 1 (diesel)" value={fmt(tot.scope1_tco2e, 2)} unit="tCO₂e" sub="activity x diesel factor" />
        <Kpi label="Rows analysed" value={fmt(input.rows)} sub={`${input.granularity_detected} data${input.granularity_detected !== input.granularity_analysed ? `, analysed as ${input.granularity_analysed}` : ''}`} />
      </div>
      {input.notes.map((n) => <Callout key={n} tone="blue">{n}</Callout>)}

      <Card title={`Emission per ${input.granularity_analysed === 'monthly' ? 'month' : 'week'}`} subtitle="kg CO₂e, stacked by scope" badge={<YourData />}>
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
      </Card>

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

      <Forecast forecast={forecast} t={t} />
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
