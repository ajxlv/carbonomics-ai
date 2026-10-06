// A quiet night landscape drawn in SVG: stars, a glow, and three drifting ridges in the brand greens.
// Purely decorative (aria-hidden); the ridges move slowly and stop for reduced-motion users.
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 53.7 + 11) % 100, y: (i * 29.3 + 7) % 52, r: 0.5 + (i % 4) * 0.25, d: (i % 9) * 0.5,
}))

// Rendered backdrop (hero-bg.webp): misty ridges, pine forest and a distant factory with chimneys at dusk.
function Scene() {
  return (
    <>
      <img src="hero-bg.webp" alt="" width="1920" height="1080" fetchpriority="high" className="absolute inset-0 h-full w-full object-cover object-bottom opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/20 to-slate-950" />
    </>
  )
}

export default function Hills({ className = '', scene = false }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {scene ? <Scene /> : <>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 70% at 50% 100%, #0f3b36 0%, #0a1f1e 38%, #060708 75%)' }} />
      <div className="absolute left-1/2 top-[18%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-teal-400/15 blur-[110px]" />
      {STARS.map((s, i) => (
        <span key={i} className="star absolute rounded-full bg-teal-50" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 3, height: s.r * 3, animationDelay: `${s.d}s` }} />
      ))}
      <svg className="hill-b absolute -left-[5%] bottom-0 h-[58%] w-[110%]" viewBox="0 0 1200 400" preserveAspectRatio="none">
        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14675f" stopOpacity=".55" /><stop offset="1" stopColor="#0a1f1e" stopOpacity="0" /></linearGradient></defs>
        <path d="M0 230 C 150 130 260 120 380 190 C 500 260 600 120 740 130 C 880 140 980 250 1200 150 L1200 400 L0 400Z" fill="url(#g1)" />
      </svg>
      <svg className="hill-a absolute -left-[5%] bottom-0 h-[46%] w-[110%]" viewBox="0 0 1200 400" preserveAspectRatio="none">
        <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f4a43" stopOpacity=".85" /><stop offset="1" stopColor="#07110f" stopOpacity="1" /></linearGradient></defs>
        <path d="M0 200 C 120 150 240 170 340 210 C 470 260 560 150 700 160 C 840 170 960 260 1200 190 L1200 400 L0 400Z" fill="url(#g2)" />
      </svg>
      <svg className="absolute bottom-0 h-[30%] w-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a2622" /><stop offset="1" stopColor="#060708" /></linearGradient></defs>
        <path d="M0 140 C 200 90 320 120 480 150 C 640 180 760 90 940 110 C 1060 124 1140 160 1200 140 L1200 300 L0 300Z" fill="url(#g3)" />
      </svg>
      </>}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
    </div>
  )
}
