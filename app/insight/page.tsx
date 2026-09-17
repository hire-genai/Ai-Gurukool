'use client'

import { useEffect, useState } from 'react'

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface LabelCount { label: string; count: number }
interface InsightData {
  total: number
  byRole: { parent: number; student: number; teacher: number }
  trustAI: LabelCount[]
  enrollment: LabelCount[]
  appeals: LabelCount[]
  recommend: LabelCount[]
  avgSatisfaction: number
}

const TARGET = 1000  // launch waitlist target
const POS  = ['Yes completely', "Yes I'd love that", 'Yes as co-teacher', 'Definitely yes', 'Definitely']
const POS2 = ['Yes with human oversight', 'Yes with human support', 'Yes for admin tasks', 'Probably yes', 'Maybe']
const pct = (n: number, t: number) => t ? Math.round((n / t) * 100) : 0

/* ─── SVG: Big Donut with center headline ────────────────────────────────── */
function BigDonut({ segments, size = 190, thickness = 24, centerTop, centerBig, centerSub }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerTop?: string
  centerBig: string
  centerSub?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="bdGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={thickness} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ
        const rot  = (offset / total) * 360 - 90
        offset += seg.value
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${Math.max(0, dash - 3)} ${circ}`}
            transform={`rotate(${rot} ${cx} ${cy})`}
            filter="url(#bdGlow)"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        )
      })}
      {centerTop && (
        <text x={cx} y={cy - 22} textAnchor="middle" fontSize="10" fill="#8899bb" letterSpacing="2" fontWeight="700">
          {centerTop.toUpperCase()}
        </text>
      )}
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="38" fontWeight="800" fill="#fff" letterSpacing="-2">
        {centerBig}
      </text>
      {centerSub && (
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize="10" fill="#8899bb" letterSpacing="1.5" fontWeight="600">
          {centerSub.toUpperCase()}
        </text>
      )}
    </svg>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function InsightPage() {
  const [data, setData] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/insights')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="tv-page tv-center">
      <div className="tv-spin" /><span style={{ color: '#8899bb', marginLeft: 12 }}>Loading…</span>
    </div>
  )
  if (!data) return <div className="tv-page tv-center" style={{ color: '#ef4444' }}>Could not load data.</div>

  const { total, trustAI, enrollment, appeals, recommend, avgSatisfaction, byRole } = data

  const enrollYes = enrollment.filter(x => POS.includes(x.label) || POS2.includes(x.label)).reduce((s, x) => s + x.count, 0)
  const trustYes  = trustAI.filter(x => POS.includes(x.label) || POS2.includes(x.label)).reduce((s, x) => s + x.count, 0)
  const recYes    = recommend.filter(x => x.label === 'Definitely' || x.label === 'Maybe').reduce((s, x) => s + x.count, 0)

  const enrollDonut = [
    { label: 'Yes',       value: enrollment.filter(x => POS.includes(x.label)).reduce((s, x) => s + x.count, 0), color: '#22c55e' },
    { label: 'Probably',  value: enrollment.filter(x => x.label === 'Probably yes').reduce((s, x) => s + x.count, 0), color: '#f5a623' },
    { label: 'Not sure',  value: enrollment.filter(x => x.label === 'Not sure').reduce((s, x) => s + x.count, 0), color: '#8899bb' },
    { label: 'No',        value: enrollment.filter(x => x.label === 'Probably not').reduce((s, x) => s + x.count, 0), color: '#ef4444' },
  ].filter(x => x.value > 0)

  const topAppeals = appeals.slice(0, 3)
  const maxAppeal = Math.max(...topAppeals.map(x => x.count), 1)
  const rawProgress = (total / TARGET) * 100
  const targetProgress = Math.min(100, rawProgress)
  const progressLabel = total === 0 ? '0%' : rawProgress < 1 ? `${rawProgress.toFixed(1)}%` : `${Math.round(rawProgress)}%`

  return (
    <div className="tv-page">
      {/* ── HEADER ── */}
      <header className="tv-head">
        <a href="/" className="tv-brand">
          <span className="tv-brand-dot" />
          AI-Gurukool
        </a>
        <div className="tv-head-title">What families are saying about us</div>
        <div className="tv-head-live">
          <span className="tv-live-dot" /> {total} verified responses
        </div>
      </header>

      {/* ── HERO SECTION: Big donut + Enrollment story ── */}
      <section className="tv-hero">
        <div className="tv-hero-donut">
          <BigDonut
            segments={enrollDonut}
            centerTop="Would Enroll"
            centerBig={`${pct(enrollYes, total)}%`}
            centerSub={`of ${total} responses`}
          />
          <div className="tv-legend-inline">
            {enrollDonut.map((s, i) => (
              <div key={i} className="tv-leg">
                <span className="tv-leg-dot" style={{ background: s.color }} />
                <span className="tv-leg-lbl">{s.label}</span>
                <span className="tv-leg-val">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tv-hero-right">
          <div className="tv-eyebrow">The Verdict</div>
          <h1 className="tv-hero-title">
            <span className="tv-gold">{pct(enrollYes, total)}%</span> of families would<br />
            <span className="tv-gold">enroll their child</span>
          </h1>

          <div className="tv-mini-stats">
            <div className="tv-mini">
              <div className="tv-mini-v" style={{ color: '#22c55e' }}>{pct(trustYes, total)}%</div>
              <div className="tv-mini-l">Trust AI teacher</div>
            </div>
            <div className="tv-mini">
              <div className="tv-mini-v" style={{ color: '#3987e5' }}>{pct(recYes, total)}%</div>
              <div className="tv-mini-l">Would recommend</div>
            </div>
            <div className="tv-mini">
              <div className="tv-mini-v" style={{ color: '#eda100' }}>{avgSatisfaction || '—'}<span>/10</span></div>
              <div className="tv-mini-l">School score</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM ROW: Top reasons + Launch progress ── */}
      <section className="tv-bottom">
        <div className="tv-panel">
          <div className="tv-panel-head">✨ Top 3 reasons people want AI-Gurukool</div>
          {topAppeals.length === 0
            ? <div className="tv-empty">No responses yet</div>
            : (
              <div className="tv-reasons">
                {topAppeals.map((r, i) => (
                  <div key={r.label} className="tv-reason">
                    <div className="tv-reason-rank">#{i + 1}</div>
                    <div className="tv-reason-body">
                      <div className="tv-reason-lbl">{r.label}</div>
                      <div className="tv-reason-track">
                        <div className="tv-reason-fill" style={{ width: `${(r.count / maxAppeal) * 100}%` }} />
                      </div>
                    </div>
                    <div className="tv-reason-n">{r.count}<span> voted</span></div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        <div className="tv-panel tv-panel-launch">
          <div className="tv-panel-head">🚀 Journey to launch</div>
          <div className="tv-launch-nums">
            <span className="tv-launch-cur">{total}</span>
            <span className="tv-launch-sep">/</span>
            <span className="tv-launch-tgt">{TARGET}</span>
          </div>
          <div className="tv-launch-desc">verified responses collected</div>
          <div className="tv-launch-track">
            <div className="tv-launch-fill" style={{ width: `${Math.max(4, targetProgress)}%` }}>
              <span className="tv-launch-pct">{progressLabel}</span>
            </div>
          </div>
          <div className="tv-launch-foot">
            <span>👨‍👩‍👧 {byRole.parent}</span>
            <span>🎒 {byRole.student}</span>
            <span>📚 {byRole.teacher}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
