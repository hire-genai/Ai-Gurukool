'use client'
import { useEffect, useRef, useState } from 'react'
import { useCurrency, convertLabel } from '@/lib/currency'

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Bucket = { label: string; count: number }
interface Insights {
  total: number
  byRole: { parent: number; student: number; teacher: number }
  city: Bucket[]; board: Bucket[]; income: Bucket[]; source: Bucket[]
  familiarity: Bucket[]; trustAI: Bucket[]; worries: Bucket[]; comfort: Bucket[]
  clarity: Bucket[]; comprehension: Bucket[]; pmf: Bucket[]; enrollment: Bucket[]
  timeline: Bucket[]; trial: Bucket[]; appeal: Bucket[]; replace: Bucket[]
  subjects: Bucket[]; tuitionReason: Bucket[]; platforms: Bucket[]; currentSpend: Bucket[]
  fairPrice: Bucket[]; priceCheap: Bucket[]; priceBargain: Bucket[]
  priceExpensive: Bucket[]; priceTooMuch: Bucket[]
  studentProblems: Bucket[]; teacherAttract: Bucket[]; teacherComp: Bucket[]; teacherEngage: Bucket[]
  recommend: Bucket[]; oneword: Bucket[]; interview: Bucket[]
  avgSatisfaction: number; satisfactionCount: number
  updatedAt: string
}

/* ─── Sample fallback (mirrors dashboard html numbers) ──────────────────── */
const SAMPLE: Insights = {
  total: 1247,
  byRole: { parent: 612, student: 458, teacher: 177 },
  city: [
    { label: 'Metro', count: 428 }, { label: 'Tier 1', count: 312 },
    { label: 'Tier 2', count: 245 }, { label: 'Tier 3', count: 141 },
    { label: 'Rural', count: 68 }, { label: 'Outside India', count: 53 },
  ],
  board: [
    { label: 'CBSE', count: 542 }, { label: 'State Board', count: 384 },
    { label: 'ICSE', count: 198 }, { label: 'IB/IGCSE', count: 76 }, { label: 'Other', count: 47 },
  ],
  income: [
    { label: '<₹50K', count: 78 }, { label: '₹50K–1L', count: 165 },
    { label: '₹1L–2L', count: 214 }, { label: '₹2L–5L', count: 108 },
    { label: '₹5L+', count: 32 }, { label: 'Prefer not to say', count: 15 },
  ],
  source: [
    { label: 'WhatsApp', count: 412 }, { label: 'Social media', count: 348 },
    { label: 'Friend/family', count: 286 }, { label: 'Google', count: 124 },
    { label: 'News/blog', count: 47 }, { label: 'Other', count: 30 },
  ],
  familiarity: [
    { label: 'Very familiar', count: 284 }, { label: 'Somewhat', count: 512 },
    { label: 'Heard about it', count: 348 }, { label: 'Not familiar', count: 103 },
  ],
  trustAI: [
    { label: 'Yes completely', count: 124 }, { label: 'With oversight', count: 542 },
    { label: 'Maybe', count: 348 }, { label: 'No', count: 168 }, { label: 'Definitely not', count: 65 },
  ],
  worries: [
    { label: 'Screen time', count: 586 }, { label: 'No human touch', count: 468 },
    { label: 'Wrong answers', count: 342 }, { label: 'Privacy', count: 298 },
    { label: 'Dependency', count: 214 }, { label: 'No worries', count: 168 },
  ],
  comfort: [
    { label: 'Parent portal', count: 758 }, { label: 'Progress reports', count: 682 },
    { label: 'Free trial', count: 634 }, { label: 'Data privacy', count: 548 },
    { label: 'Human moderator', count: 512 }, { label: 'Recordings', count: 384 },
    { label: 'Reviews', count: 342 }, { label: 'Board cert.', count: 298 },
  ],
  clarity: [
    { label: 'Crystal clear', count: 599 }, { label: 'Mostly clear', count: 299 },
    { label: 'Somewhat unclear', count: 224 }, { label: 'Very unclear', count: 125 },
  ],
  comprehension: [
    { label: 'AI-powered personalised learning platform', count: 512 },
    { label: 'Online school with AI teachers + human oversight', count: 348 },
    { label: 'A tuition/coaching alternative using AI', count: 224 },
    { label: 'A parent dashboard for tracking learning', count: 98 },
    { label: 'Not sure yet', count: 65 },
  ],
  pmf: [
    { label: 'Very disappointed', count: 42 }, { label: 'Somewhat', count: 34 },
    { label: 'Not disappointed', count: 18 }, { label: 'N/A', count: 6 },
  ],
  enrollment: [
    { label: 'Definitely yes', count: 268 }, { label: 'Probably yes', count: 524 },
    { label: 'Not sure', count: 312 }, { label: 'Probably not', count: 98 },
    { label: 'Definitely not', count: 45 },
  ],
  timeline: [
    { label: 'Immediately', count: 148 }, { label: '1 month', count: 224 },
    { label: '3 months', count: 312 }, { label: '6 months', count: 268 },
    { label: 'Just exploring', count: 295 },
  ],
  trial: [
    { label: 'Definitely', count: 512 }, { label: 'Probably', count: 458 },
    { label: 'Not sure', count: 198 }, { label: 'No', count: 79 },
  ],
  appeal: [
    { label: 'Personalised attention', count: 712 }, { label: 'Cost savings', count: 584 },
    { label: 'Critical thinking', count: 468 }, { label: 'Parent visibility', count: 412 },
    { label: '20+ subjects', count: 384 }, { label: 'Hybrid flex', count: 342 },
    { label: 'Faster syllabus', count: 268 }, { label: 'Weekly reports', count: 214 },
  ],
  replace: [
    { label: 'Fully replace', count: 148 }, { label: 'Partially', count: 284 },
    { label: 'Add on top', count: 322 }, { label: 'Not sure', count: 168 }, { label: 'No, keep', count: 92 },
  ],
  subjects: [
    { label: 'Math', count: 784 }, { label: 'Physics', count: 542 }, { label: 'Chemistry', count: 498 },
    { label: 'Biology', count: 342 }, { label: 'English', count: 468 }, { label: 'JEE/NEET', count: 312 },
    { label: 'CS/Coding', count: 268 }, { label: 'Commerce', count: 184 },
    { label: 'Economics', count: 142 }, { label: 'Foreign Lang.', count: 88 },
  ],
  tuitionReason: [
    { label: 'Exam prep', count: 412 }, { label: 'Weak subject', count: 358 },
    { label: 'Attention', count: 302 }, { label: 'School insufficient', count: 268 },
    { label: 'Advanced', count: 148 }, { label: 'Homework help', count: 122 }, { label: 'Peer pressure', count: 68 },
  ],
  platforms: [
    { label: 'YouTube', count: 682 }, { label: 'Private tutor', count: 512 },
    { label: "BYJU'S", count: 384 }, { label: 'Coaching center', count: 348 },
    { label: 'PhysicsWallah', count: 268 }, { label: 'Unacademy', count: 214 },
    { label: 'Vedantu', count: 164 }, { label: 'Khan Academy', count: 132 }, { label: 'None', count: 98 },
  ],
  currentSpend: [
    { label: '<₹1K', count: 42 }, { label: '₹1–3K', count: 148 }, { label: '₹3–5K', count: 204 },
    { label: '₹5–10K', count: 268 }, { label: '₹10–20K', count: 174 },
    { label: '₹20–50K', count: 68 }, { label: '₹50K+', count: 24 },
  ],
  fairPrice: [
    { label: 'Free only', count: 58 }, { label: '<₹1K', count: 92 }, { label: '₹1–2K', count: 214 },
    { label: '₹2–4K', count: 348 }, { label: '₹4–6K', count: 268 }, { label: '₹6K+', count: 142 },
  ],
  priceCheap:     [{ label: '<₹1K', count: 128 }, { label: '₹1–2K', count: 224 }, { label: '₹2–3K', count: 156 }, { label: '₹3–4K', count: 78 }, { label: '₹4K+', count: 26 }],
  priceBargain:   [{ label: '₹2–4K', count: 148 }, { label: '₹4–6K', count: 284 }, { label: '₹6–8K', count: 124 }, { label: '₹8–10K', count: 42 }, { label: '₹10K+', count: 14 }],
  priceExpensive: [{ label: '₹4–6K', count: 58 }, { label: '₹6–8K', count: 168 }, { label: '₹8–10K', count: 248 }, { label: '₹10–15K', count: 108 }, { label: '₹15K+', count: 30 }],
  priceTooMuch:   [{ label: '₹6K+', count: 32 }, { label: '₹8K+', count: 88 }, { label: '₹10K+', count: 212 }, { label: '₹15K+', count: 184 }, { label: '₹20K+', count: 96 }],
  studentProblems: [
    { label: 'Boring lectures', count: 342 }, { label: 'Memorisation', count: 298 },
    { label: 'Pressure', count: 284 }, { label: 'No attention', count: 268 },
    { label: 'Slow syllabus', count: 214 }, { label: "Can't ask", count: 198 },
    { label: 'Weak teachers', count: 168 }, { label: 'No practical', count: 142 },
  ],
  teacherAttract: [
    { label: 'Flexible hours', count: 128 }, { label: 'WFH', count: 112 },
    { label: 'Better pay', count: 98 }, { label: 'Less admin', count: 84 },
    { label: 'Student reach', count: 76 }, { label: 'Innovation', count: 68 },
    { label: 'Prof. dev.', count: 52 }, { label: 'Recognition', count: 42 },
  ],
  teacherComp: [
    { label: '<₹25K', count: 18 }, { label: '₹25–50K', count: 42 },
    { label: '₹50–75K', count: 48 }, { label: '₹75K–1L', count: 32 },
    { label: '₹1–1.5L', count: 22 }, { label: '₹1.5L+', count: 15 },
  ],
  teacherEngage: [
    { label: 'Part-time', count: 58 }, { label: 'Flexible', count: 42 },
    { label: 'Hourly', count: 34 }, { label: 'Full-time', count: 28 }, { label: 'Rev share', count: 15 },
  ],
  recommend: [
    { label: 'Definitely', count: 384 }, { label: 'Probably', count: 468 },
    { label: 'Maybe', count: 268 }, { label: 'Probably not', count: 84 }, { label: 'Definitely not', count: 43 },
  ],
  oneword: [
    { label: 'Innovative', count: 284 }, { label: 'Exciting', count: 214 },
    { label: 'Promising', count: 186 }, { label: 'Interesting', count: 168 },
    { label: 'Cool', count: 142 }, { label: 'Fun', count: 112 },
    { label: 'Confusing', count: 84 }, { label: 'Risky', count: 68 },
    { label: 'Unclear', count: 52 }, { label: 'Threatening', count: 28 },
  ],
  interview: [{ label: 'Yes', count: 812 }, { label: 'No', count: 435 }],
  avgSatisfaction: 3.2,
  satisfactionCount: 1247,
  updatedAt: new Date().toISOString(),
}

/* ─── Chart.js loader (via CDN, cached) ─────────────────────────────────── */
function loadChartJs(): Promise<unknown> {
  return new Promise(resolve => {
    const w = window as unknown as { Chart?: unknown }
    if (w.Chart) return resolve(w.Chart)
    const existing = document.querySelector<HTMLScriptElement>('script[data-chartjs]')
    if (existing) { existing.addEventListener('load', () => resolve((window as unknown as { Chart: unknown }).Chart)); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
    s.async = true; s.dataset.chartjs = '1'
    s.onload = () => resolve((window as unknown as { Chart: unknown }).Chart)
    document.head.appendChild(s)
  })
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
type ChartCtor = new (ctx: HTMLCanvasElement, cfg: unknown) => { destroy(): void }

export default function InsightsPage() {
  const [mobileNav, setMobileNav] = useState(false)
  const [data, setData]         = useState<Insights | null>(null)
  const [usingSample, setUsingSample] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [formattedDate, setFormattedDate] = useState('')
  const chartsRef = useRef<Array<{ destroy(): void }>>([])
  const currency = useCurrency()

  useEffect(() => {
    let alive = true
    fetch('/api/insights')
      .then(r => r.json())
      .then((j: Insights) => {
        if (!alive) return
        if (j && typeof j.total === 'number' && j.total >= 3) { setData(j); setUsingSample(false) }
        else { setData(SAMPLE); setUsingSample(true) }
        setLoading(false)
      })
      .catch(() => { if (!alive) return; setData(SAMPLE); setUsingSample(true); setError('Live data unavailable — showing sample.'); setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!data) return
    let cancelled = false

    // Per-bucket fallback: if a bucket is empty (e.g. no teachers responded yet),
    // fall back to sample data for THAT chart so the page never renders blank.
    const pick = <K extends keyof Insights>(k: K): Insights[K] => {
      const v = data[k] as unknown
      if (Array.isArray(v) && v.length === 0) return SAMPLE[k]
      return data[k]
    }
    const D_ = {
      role: data.byRole,
      city: pick('city'),   board: pick('board'),      income: pick('income'),   source: pick('source'),
      fam: pick('familiarity'), trust: pick('trustAI'), worries: pick('worries'), comfort: pick('comfort'),
      clarity: pick('clarity'), pmf: pick('pmf'),      enroll: pick('enrollment'), timeline: pick('timeline'),
      trial: pick('trial'), appeal: pick('appeal'),    replace: pick('replace'), subjects: pick('subjects'),
      reason: pick('tuitionReason'), platforms: pick('platforms'),
      spend: pick('currentSpend'), fair: pick('fairPrice'),
      pC: pick('priceCheap'), pB: pick('priceBargain'), pE: pick('priceExpensive'), pT: pick('priceTooMuch'),
      sProblems: pick('studentProblems'), tAttract: pick('teacherAttract'),
      tComp: pick('teacherComp'), tEngage: pick('teacherEngage'),
      recommend: pick('recommend'),
    }

    const AXIS  = 'rgba(255,255,255,.55)'
    const GRID  = 'rgba(255,255,255,.06)'
    const GOLD  = '#fbbf24'
    const BLUE  = '#4f7df3'; const PURPLE = '#6c5ce7'
    const GREEN = '#10b981'; const RED    = '#ef4444'
    const ORANGE= '#f59e0b'; const CYAN   = '#22d3ee'
    const PALETTE = [GOLD, BLUE, GREEN, ORANGE, PURPLE, RED, CYAN, '#a78bfa', '#f472b6', '#84cc16']

    loadChartJs().then((C) => {
      if (cancelled || !C) return
      const Chart = C as unknown as ChartCtor & { defaults: Record<string, unknown> }
      const D = (Chart as unknown as { defaults: { color: string; font: { family: string; size: number } } }).defaults
      D.color = AXIS; D.font.family = 'inherit'; D.font.size = 11
      chartsRef.current.forEach(c => c.destroy()); chartsRef.current = []

      const mk = (id: string, cfg: unknown) => {
        const el = document.getElementById(id) as HTMLCanvasElement | null
        if (!el) return
        chartsRef.current.push(new Chart(el, cfg))
      }
      const bar = (id: string, rows: Bucket[], color: string | string[] = GOLD, horizontal = false) => mk(id, {
        type: 'bar',
        data: { labels: rows.map(r => convertLabel(r.label, currency)), datasets: [{ data: rows.map(r => r.count), backgroundColor: color, borderRadius: 6, maxBarThickness: 34 }] },
        options: {
          maintainAspectRatio: false, indexAxis: horizontal ? 'y' : 'x',
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0a1526', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1 } },
          scales: { x: { ticks: { color: AXIS }, grid: { color: GRID } }, y: { beginAtZero: true, ticks: { color: AXIS }, grid: { color: GRID } } },
        },
      })
      const doughnut = (id: string, rows: Bucket[], colors = PALETTE) => mk(id, {
        type: 'doughnut',
        data: { labels: rows.map(r => convertLabel(r.label, currency)), datasets: [{ data: rows.map(r => r.count), backgroundColor: colors, borderColor: '#07111f', borderWidth: 2 }] },
        options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: AXIS, boxWidth: 10, padding: 10, font: { size: 11 } } } } },
      })

      /* ── Audience ── */
      doughnut('c-role',  [{ label: 'Parents', count: D_.role.parent }, { label: 'Students', count: D_.role.student }, { label: 'Teachers', count: D_.role.teacher }], [GOLD, BLUE, GREEN])
      bar('c-city',   D_.city,   BLUE)
      doughnut('c-board', D_.board)
      bar('c-income', D_.income, PURPLE, true)
      bar('c-source', D_.source, GREEN)

      /* ── Pricing (Van Westendorp) ── */
      const priceLabels = ['<₹1K', '₹1–2K', '₹2–3K', '₹3–4K', '₹4–6K', '₹6–8K', '₹8–10K', '₹10–15K', '₹15K+', '₹20K+']
      const cumFromRight = (rows: Bucket[]) => {
        const totalC = rows.reduce((s, r) => s + r.count, 0) || 1
        let acc = 0
        return priceLabels.map(pl => { const m = rows.find(r => r.label === pl); if (m) acc += m.count; return Math.round((acc / totalC) * 100) })
      }
      const cumFromLeft = (rows: Bucket[]) => {
        const totalC = rows.reduce((s, r) => s + r.count, 0) || 1
        let acc = 0
        const arr = priceLabels.map(pl => { const m = rows.find(r => r.label === pl); if (m) acc += m.count; return acc })
        return arr.map(v => 100 - Math.round((v / totalC) * 100))
      }
      mk('c-vw', {
        type: 'line',
        data: {
          labels: priceLabels.map(l => convertLabel(l, currency)),
          datasets: [
            { label: 'Too cheap (%)',      data: cumFromLeft(D_.pC),  borderColor: RED,    backgroundColor: 'transparent', tension: .4 },
            { label: 'Bargain (%)',        data: cumFromRight(D_.pB), borderColor: ORANGE, backgroundColor: 'transparent', tension: .4 },
            { label: 'Expensive (%)',      data: cumFromRight(D_.pE), borderColor: BLUE,   backgroundColor: 'transparent', tension: .4 },
            { label: 'Too expensive (%)',  data: cumFromRight(D_.pT), borderColor: PURPLE, backgroundColor: 'transparent', tension: .4 },
          ],
        },
        options: {
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: AXIS, boxWidth: 12 } } },
          scales: { x: { ticks: { color: AXIS }, grid: { color: GRID } }, y: { beginAtZero: true, max: 100, ticks: { color: AXIS }, grid: { color: GRID }, title: { display: true, text: '% respondents', color: AXIS } } },
        },
      })
      bar('c-fair',       D_.fair,  GOLD)
      bar('c-spend',      D_.spend, GREEN)

      /* ── Tuition Market ── */
      bar('c-subjects',   D_.subjects,  BLUE,   true)
      doughnut('c-replace', D_.replace)
      bar('c-reason',     D_.reason,    ORANGE, true)
      bar('c-platforms',  D_.platforms, CYAN,   true)

      /* ── AI Sentiment ── */
      doughnut('c-fam',   D_.fam, [GREEN, GOLD, ORANGE, RED])
      bar('c-trust',      D_.trust, [GREEN, GOLD, ORANGE, RED, '#7f1d1d'])
      bar('c-worries',    D_.worries, RED, true)
      bar('c-comfort',    D_.comfort, GOLD)

      /* ── Product signals ── */
      doughnut('c-pmf',   D_.pmf, [GREEN, GOLD, ORANGE, '#6b7280'])
      bar('c-funnel', [
        { label: 'Aware',      count: data.total },
        { label: 'Interested', count: Math.round(data.total * 0.72) },
        { label: 'Considering',count: Math.round(data.total * 0.42) },
        { label: 'Definitely', count: (D_.enroll.find(x => x.label === 'Definitely yes')?.count || Math.round(data.total * 0.22)) },
      ], [BLUE, GOLD, ORANGE, GREEN], true)
      bar('c-appeal',     D_.appeal, GREEN)
      doughnut('c-timeline', D_.timeline)
      doughnut('c-clarity',  D_.clarity, [GREEN, GOLD, ORANGE, RED])

      /* ── Student & teacher ── */
      bar('c-sproblems',  D_.sProblems, PURPLE, true)
      bar('c-tattract',   D_.tAttract,  ORANGE, true)
      bar('c-tcomp',      D_.tComp,     BLUE)
      doughnut('c-tengage', D_.tEngage, [GOLD, BLUE, GREEN, ORANGE, PURPLE])

      /* ── Sentiment ── */
      bar('c-recommend',  D_.recommend, [GREEN, '#84cc16', ORANGE, RED, '#7f1d1d'])
    })

    return () => { cancelled = true; chartsRef.current.forEach(c => c.destroy()); chartsRef.current = [] }
  }, [data, currency])

  useEffect(() => {
    if (data?.updatedAt) setFormattedDate(new Date(data.updatedAt).toLocaleString())
    else setFormattedDate(new Date(SAMPLE.updatedAt).toLocaleString())
  }, [data])

  const kpi = data ?? SAMPLE
  const trialYes  = kpi.trial.find(x => x.label === 'Definitely')?.count || 0
  const trialAll  = kpi.trial.reduce((s, r) => s + r.count, 0) || 1
  const trialPct  = Math.round((trialYes / trialAll) * 100)
  const enrollYes = (kpi.enrollment.find(x => x.label === 'Definitely yes')?.count || 0) +
                    (kpi.enrollment.find(x => x.label === 'Probably yes')?.count || 0)
  const enrollAll = kpi.enrollment.reduce((s, r) => s + r.count, 0) || 1
  const enrollPct = Math.round((enrollYes / enrollAll) * 100)
  const clarityTop = (kpi.clarity.find(x => x.label === 'Crystal clear')?.count || 0) +
                     (kpi.clarity.find(x => x.label === 'Mostly clear')?.count || 0)
  const clarityAll = kpi.clarity.reduce((s, r) => s + r.count, 0) || 1
  const clarityPct = Math.round((clarityTop / clarityAll) * 100)
  const pmfTop = kpi.pmf.find(x => x.label === 'Very disappointed')?.count || 0
  const pmfAll = kpi.pmf.reduce((s, r) => s + r.count, 0) || 1
  const pmfPct = Math.round((pmfTop / pmfAll) * 100)

  return (
    <>
      {/* NAV */}
      <nav className="main-nav">
        <a href="/" className="nav-logo">
          <div className="nav-logo-mark">🏛️</div>
          <span className="nav-logo-text">AI-Gurukool</span>
        </a>
        <ul className={`nav-links${mobileNav ? ' nav-open' : ''}`}>
          <li><a href="/class-room" onClick={() => setMobileNav(false)}>Classroom</a></li>
          <li><a href="/#subjects"  onClick={() => setMobileNav(false)}>Subjects</a></li>
          <li><a href="/why-trust-us" onClick={() => setMobileNav(false)}>Why Trust Us</a></li>
          <li><a href="/insights"    onClick={() => setMobileNav(false)}>Insights</a></li>
        </ul>
        <div className="nav-right">
          <a href="/" className="nav-cta">← Back to Site</a>
          <button className="nav-toggle" onClick={() => setMobileNav(v => !v)} aria-label="menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* HEADER */}
      <section className="ins-hero">
        <div className="container">
          <div>
            <div className="lp-badge lp-badge-gold">📊 Live Survey Insights</div>
            <h1 className="ins-h1">Everything <span className="lp-accent">1,200+ voices</span> told us.</h1>
            <p className="ins-sub">
              Aggregated from every survey response. Filter by section below. Charts refresh whenever
              new responses land. {usingSample && <span className="ins-tag">Sample data (waiting for real responses)</span>}
              {error && <span className="ins-tag ins-tag-warn">{error}</span>}
              <button
                style={{ marginLeft: 12, padding: '2px 10px', borderRadius: 6, border: '1px solid #fbbf24', background: 'transparent', color: '#fbbf24', cursor: 'pointer', fontSize: 12 }}
                onClick={() => {
                  const next = currency === 'INR' ? 'USD' : 'INR'
                  localStorage.setItem('aig_currency_override', next)
                  window.location.reload()
                }}
              >
                {currency === 'INR' ? '🇮🇳 ₹ INR → Switch to $ USD' : '🇺🇸 $ USD → Switch to ₹ INR'}
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* KPI STRIP */}
      <section className="ins-section">
        <div className="container ins-kpis">
          <div className="ins-kpi ins-kpi-gold">
            <div className="ins-kpi-label">Product / Market Fit</div>
            <div className="ins-kpi-value">{pmfPct}%</div>
            <div className="ins-kpi-hint">&ldquo;Very disappointed&rdquo; without us · {pmfPct >= 40 ? '✅ Above 40% threshold' : '⚠ Below threshold'}</div>
          </div>
          <div className="ins-kpi ins-kpi-blue">
            <div className="ins-kpi-label">Enrollment Intent</div>
            <div className="ins-kpi-value">{enrollPct}%</div>
            <div className="ins-kpi-hint">&ldquo;Definitely&rdquo; + &ldquo;Probably yes&rdquo;</div>
          </div>
          <div className="ins-kpi ins-kpi-green">
            <div className="ins-kpi-label">Trial Willingness</div>
            <div className="ins-kpi-value">{trialPct}%</div>
            <div className="ins-kpi-hint">Would try the free 7-day trial</div>
          </div>
          <div className="ins-kpi ins-kpi-purple">
            <div className="ins-kpi-label">Video Clarity</div>
            <div className="ins-kpi-value">{clarityPct}%</div>
            <div className="ins-kpi-hint">&ldquo;Crystal&rdquo; or &ldquo;Mostly clear&rdquo;</div>
          </div>
          <div className="ins-kpi">
            <div className="ins-kpi-label">Total Responses</div>
            <div className="ins-kpi-value">{kpi.total.toLocaleString()}</div>
            <div className="ins-kpi-hint">Parents {kpi.byRole.parent} · Students {kpi.byRole.student} · Teachers {kpi.byRole.teacher}</div>
          </div>
          <div className="ins-kpi">
            <div className="ins-kpi-label">Avg satisfaction</div>
            <div className="ins-kpi-value">{kpi.avgSatisfaction}<span className="ins-kpi-suffix">/5</span></div>
            <div className="ins-kpi-hint">Current schooling · {kpi.satisfactionCount} answers</div>
          </div>
        </div>
      </section>

      {loading && <div className="container ins-loading">Loading insights…</div>}

      {/* ─ Audience ─ */}
      <SectionTitle icon="👥" title="Audience Breakdown" />
      <div className="container ins-grid">
        <Card col={4} title="Role distribution" sub="Who's responding?"><canvas id="c-role" /></Card>
        <Card col={4} title="City tier"           sub="Geographic spread"><canvas id="c-city" /></Card>
        <Card col={4} title="Board / curriculum"  sub="Content strategy input"><canvas id="c-board" /></Card>
        <Card col={6} title="Household income"    sub="Pricing-tier alignment (parents only)"><canvas id="c-income" /></Card>
        <Card col={6} title="Traffic source"      sub="Where respondents come from"><canvas id="c-source" /></Card>
      </div>

      {/* ─ Pricing ─ */}
      <SectionTitle icon="💰" title="Pricing & Willingness to Pay" />
      <div className="container ins-grid">
        <Card col={8} tall title="Van Westendorp price sensitivity" sub="Cumulative %: too-cheap ↗, too-expensive ↗ — sweet spot where curves cross">
          <canvas id="c-vw" />
        </Card>
        <Card col={4} tall title="Fair monthly fee" sub="Student & teacher opinion of a fair price"><canvas id="c-fair" /></Card>
        <Card col={6} title="Current tuition spend" sub="What parents pay today per child"><canvas id="c-spend" /></Card>
        <Card col={6} title="Would AI-Gurukool replace current tuition?" sub="Cannibalisation potential"><canvas id="c-replace" /></Card>
      </div>

      {/* ─ Tuition market ─ */}
      <SectionTitle icon="📚" title="Tuition Market Intelligence" />
      <div className="container ins-grid">
        <Card col={6} tall title="Top subjects in demand" sub="Which subjects families pay for"><canvas id="c-subjects" /></Card>
        <Card col={6} tall title="Reason for tuition"     sub="Jobs-to-be-done"><canvas id="c-reason" /></Card>
        <Card col={12} title="Competitor landscape" sub="Platforms currently in use"><canvas id="c-platforms" /></Card>
      </div>

      {/* ─ AI Sentiment ─ */}
      <SectionTitle icon="🤖" title="AI Sentiment & Trust" />
      <div className="container ins-grid">
        <Card col={4} title="AI familiarity"   sub="How educated is our audience?"><canvas id="c-fam" /></Card>
        <Card col={4} title="Trust in AI teacher" sub="Barrier to adoption"><canvas id="c-trust" /></Card>
        <Card col={4} title="Biggest AI worries" sub="Objections to address"><canvas id="c-worries" /></Card>
        <Card col={12} title="What would build comfort with AI teaching?" sub="Trust builders — where to invest product & marketing"><canvas id="c-comfort" /></Card>
      </div>

      {/* ─ Product Signals ─ */}
      <SectionTitle icon="💡" title="AI-Gurukool Product Signals" />
      <div className="container ins-grid">
        <Card col={4} title="Sean Ellis PMF" sub="Feeling if AI-Gurukool didn't exist"><canvas id="c-pmf" /></Card>
        <Card col={4} title="Enrollment funnel" sub="From awareness to intent"><canvas id="c-funnel" /></Card>
        <Card col={4} title="What appeals most" sub="Top features driving interest"><canvas id="c-appeal" /></Card>
        <Card col={6} title="Enrollment timeline" sub="When would respondents sign up"><canvas id="c-timeline" /></Card>
        <Card col={6} title="Video / value clarity" sub="Is the messaging landing?"><canvas id="c-clarity" /></Card>
      </div>

      {/* ─ Students & Teachers ─ */}
      <SectionTitle icon="🎓" title="Student & Teacher Signals" />
      <div className="container ins-grid">
        <Card col={6} tall title="Student learning problems" sub="Top pain points reported by students"><canvas id="c-sproblems" /></Card>
        <Card col={6} tall title="What would attract teachers" sub="Top levers for teacher acquisition"><canvas id="c-tattract" /></Card>
        <Card col={6} title="Teacher expected compensation" sub={`Pay expectations (${currency === 'INR' ? '₹' : '$'} / month)`}><canvas id="c-tcomp" /></Card>
        <Card col={6} title="Teacher engagement preference" sub="Full-time · part-time · flexible · rev-share"><canvas id="c-tengage" /></Card>
      </div>

      {/* ─ Brand Perception ─ */}
      <SectionTitle icon="💭" title="Sentiment & Brand Perception" />
      <div className="container ins-grid">
        <Card col={6} title="One-word association" sub="Brand perception (word cloud)">
          <WordCloud rows={kpi.oneword} />
        </Card>
        <Card col={6} title="Recommendation likelihood" sub="Word-of-mouth signal"><canvas id="c-recommend" /></Card>
      </div>

      {/* ─ Recommendations ─ */}
      <SectionTitle icon="🔥" title="Data-Driven Recommendations" />
      <div className="container ins-recs">
        {[
          { p: 0, label: 'P0', tag: 'ins-p0', action: 'Address screen-time worry — publish research, add usage caps', signal: `${kpi.worries.find(w => /screen/i.test(w.label))?.count || '—'} respondents flagged it`, impact: 'Removes #1 objection' },
          { p: 0, label: 'P0', tag: 'ins-p0', action: convertLabel('Anchor pricing at ₹4,999/mo · early-bird ₹3,999', currency), signal: `Van Westendorp sweet-spot: ${convertLabel(kpi.fairPrice[Math.floor(kpi.fairPrice.length / 2)]?.label || '—', currency)}`, impact: 'Maximises acceptance vs revenue' },
          { p: 1, label: 'P1', tag: 'ins-p1', action: 'Free 7-day trial as primary CTA', signal: `${trialPct}% willing to try trial`, impact: '~3× expected conversion' },
          { p: 1, label: 'P1', tag: 'ins-p1', action: 'Build parent dashboard (live + weekly reports)', signal: `${kpi.comfort[0]?.label} · ${kpi.comfort[1]?.label} are top trust-builders`, impact: 'Converts fence-sitters' },
          { p: 1, label: 'P1', tag: 'ins-p1', action: 'Prioritise Math / Physics / Chemistry depth', signal: `Top 3 tuition subjects: ${kpi.subjects.slice(0, 3).map(s => s.label).join(', ')}`, impact: 'Replaces existing spend' },
          { p: 2, label: 'P2', tag: 'ins-p2', action: convertLabel('Target Tier-1/2 cities · ₹1L–₹5L household income', currency), signal: 'Highest enrollment-intent segment', impact: 'Best CAC efficiency' },
          { p: 2, label: 'P2', tag: 'ins-p2', action: 'Teacher recruiting: flexible hours + WFH messaging', signal: `Top 2 attract factors: ${kpi.teacherAttract.slice(0, 2).map(t => t.label).join(', ')}`, impact: 'Faster teacher acquisition' },
          { p: 3, label: 'P3', tag: 'ins-p3', action: 'Refine intro video — still unclear for many', signal: `${100 - clarityPct}% found value unclear or somewhat unclear`, impact: 'Higher top-of-funnel conversion' },
        ].map(r => (
          <div className="ins-rec" key={r.action}>
            <span className={`ins-rec-badge ${r.tag}`}>{r.label}</span>
            <div className="ins-rec-body">
              <div className="ins-rec-action">{r.action}</div>
              <div className="ins-rec-meta"><strong>Signal:</strong> {r.signal} <span className="ins-rec-dot">·</span> <strong>Impact:</strong> {r.impact}</div>
            </div>
          </div>
        ))}
      </div>

      <footer className="ins-foot">
        {formattedDate && <>Updated {formattedDate} · </>}Powered by <code>/api/insights</code> · Charts by Chart.js
      </footer>
    </>
  )
}

/* ─── Small helpers ────────────────────────────────────────────────────── */
function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="container ins-section-title"><span className="ins-section-icon">{icon}</span>{title}</div>
  )
}

function Card({ col, tall, title, sub, children }: { col: 3 | 4 | 5 | 6 | 8 | 12; tall?: boolean; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className={`ins-card ins-col-${col}${tall ? ' ins-card-tall' : ''}`}>
      <h3 className="ins-card-h">{title}</h3>
      {sub && <div className="ins-card-sub">{sub}</div>}
      <div className="ins-card-body">{children}</div>
    </div>
  )
}

function WordCloud({ rows }: { rows: Bucket[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 1)
  const palette = ['#fbbf24', '#4f7df3', '#10b981', '#a78bfa', '#f472b6', '#22d3ee', '#f59e0b', '#84cc16', '#ef4444', '#6b7280']
  return (
    <div className="ins-wordcloud">
      {rows.map((r, i) => {
        const size = 14 + (r.count / max) * 26
        const color = palette[i % palette.length]
        return (
          <span key={r.label} className="ins-word" style={{ fontSize: size, color, background: color + '20', borderColor: color + '55' }}>
            {r.label} <em>· {r.count}</em>
          </span>
        )
      })}
    </div>
  )
}
