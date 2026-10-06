// A quiet night landscape drawn in SVG: stars, a glow, and three drifting ridges in the brand greens.
// Purely decorative (aria-hidden); the ridges move slowly and stop for reduced-motion users.
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 53.7 + 11) % 100, y: (i * 29.3 + 7) % 52, r: 0.5 + (i % 4) * 0.25, d: (i % 9) * 0.5,
}))

// Faded campus-and-nature silhouette: a factory with chimneys on the left giving way to trees on the right.
const TREES = Array.from({ length: 15 }, (_, i) => ({ x: 640 + i * 38 + (i % 3) * 9, h: 52 + ((i * 37) % 44), w: 15 + (i % 3) * 5 }))
function Scene() {
  return (
    <svg className="absolute bottom-[17%] left-0 h-[34%] w-full" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax meet"
      style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 40%, #000 70%, transparent)', maskImage: 'linear-gradient(to bottom, transparent, #000 40%, #000 70%, transparent)' }}>
      <g fill="#3fb5a3" opacity=".2">
        <rect x="70" y="190" width="150" height="110" /><rect x="230" y="215" width="120" height="85" /><rect x="360" y="170" width="90" height="130" />
        <path d="M70 190 l25 -22 v22 l25 -22 v22 l25 -22 v22 l25 -22 v22Z" />
        <rect x="110" y="95" width="22" height="95" /><rect x="152" y="70" width="22" height="120" /><rect x="394" y="85" width="20" height="85" />
        <rect x="104" y="90" width="34" height="8" /><rect x="146" y="65" width="34" height="8" /><rect x="388" y="80" width="32" height="8" />
        {TREES.map((t, i) => (
          <g key={i}>
            <rect x={t.x - 2} y={300 - t.h * 0.3} width="4" height={t.h * 0.3} />
            <path d={`M${t.x} ${300 - t.h} L${t.x + t.w} ${300 - t.h * 0.25} L${t.x - t.w} ${300 - t.h * 0.25}Z`} />
          </g>
        ))}
      </g>
      <g fill="#bfe9e2" opacity=".07" className="hill-b">
        <circle cx="121" cy="70" r="22" /><circle cx="150" cy="40" r="28" /><circle cx="190" cy="20" r="30" />
        <circle cx="163" cy="48" r="24" /><circle cx="404" cy="62" r="20" /><circle cx="432" cy="34" r="26" />
      </g>
    </svg>
  )
}

export default function Hills({ className = '', scene = false }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
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
      {scene && <Scene />}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
    </div>
  )
}
