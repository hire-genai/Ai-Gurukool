'use client'
import { useEffect, useRef, useState } from 'react'

const STORE_KEY = 'aig_phase0_v2'

interface BarItem { label: string; pct: number }
interface SurveyStats {
  total: number
  pain: BarItem[]
  fears: BarItem[]
  reaction: BarItem[]
  spend: BarItem[]
  wantTrial: number
}

function getData(path: string, def: unknown = null) {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
    const parts = path.split('.')
    let cur: Record<string, unknown> = d
    for (const p of parts) {
      if (cur == null) return def
      cur = cur[p] as Record<string, unknown>
    }
    return cur ?? def
  } catch { return def }
}

interface Testimonial { id: number; name: string; role: string; loc?: string; quote: string; rating: number }
interface ValData {
  showSection: boolean; showMetrics: boolean; showInsights: boolean; showTesti: boolean; showDecision: boolean
  pct: number; segPills: { label: string; pct: number }[]
  metrics: { n: string; l: string }[]
  insights: { icon: string; text: string }[]
  testimonials: Testimonial[]
  decision: string; decisionMemo: string; headline: string; desc: string
}

export default function HomePage() {
  const heroBgRef = useRef<HTMLDivElement>(null)
  const [valData, setValData] = useState<ValData | null>(null)
  const [counters, setCounters] = useState({ c1: 0, c2: 0, c3: 0 })
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null)

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [valData])

  // Counter animation
  useEffect(() => {
    const targets = [{ key: 'c1', val: 1 }, { key: 'c2', val: 2 }, { key: 'c3', val: 20 }]
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        const target = targets.find(t => e.target.id === `counter-${t.key}`)
        if (!target) return
        const dur = 1400
        const start = performance.now()
        const step = (ts: number) => {
          const p = Math.min((ts - start) / dur, 1)
          setCounters(prev => ({ ...prev, [target.key]: Math.floor(p * target.val) }))
          if (p < 1) requestAnimationFrame(step)
          else setCounters(prev => ({ ...prev, [target.key]: target.val }))
        }
        requestAnimationFrame(step)
        io.unobserve(e.target)
      })
    }, { threshold: 0.5 })
    targets.forEach(t => {
      const el = document.getElementById(`counter-${t.key}`)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  // Hero parallax
  useEffect(() => {
    const onScroll = () => {
      if (heroBgRef.current) heroBgRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hero image load zoom
  useEffect(() => {
    if (heroBgRef.current) heroBgRef.current.classList.add('loaded')
  }, [])

  // Apple-style 3D tilt + spotlight effect on subject cards and glass cards
  useEffect(() => {
    function applyTilt(el: HTMLElement, e: MouseEvent) {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2
      // tilt max 12 degrees
      const rx = ((y - cy) / cy) * -10
      const ry = ((x - cx) / cx) * 10
      const mx = (x / rect.width) * 100
      const my = (y / rect.height) * 100
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.04)`
      el.style.setProperty('--mx', `${mx}%`)
      el.style.setProperty('--my', `${my}%`)
    }

    function resetTilt(el: HTMLElement) {
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)'
      el.style.setProperty('--mx', '50%')
      el.style.setProperty('--my', '50%')
    }

    const cards = document.querySelectorAll<HTMLElement>('.subj-card, .glass-card')
    const handlers: Array<{ el: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = []

    cards.forEach(el => {
      const move = (e: MouseEvent) => applyTilt(el, e)
      const leave = () => resetTilt(el)
      el.addEventListener('mousemove', move)
      el.addEventListener('mouseleave', leave)
      handlers.push({ el, move, leave })
    })

    return () => {
      handlers.forEach(({ el, move, leave }) => {
        el.removeEventListener('mousemove', move)
        el.removeEventListener('mouseleave', leave)
      })
    }
  }, [valData])

  // Read admin data from localStorage
  useEffect(() => {
    const showSection = getData('toggles.vis-section', false) as boolean
    if (!showSection) return

    const SEGS = [
      { id: 's07', label: '0.7 Parent Focus Groups', total: 6 },
      { id: 's08', label: '0.8 Shadow Testing', total: 6 },
      { id: 's09', label: '0.9 Student Interviews', total: 5 },
      { id: 's10', label: '0.10 Coaching Centers', total: 5 },
      { id: 's11', label: '0.11 Aspirant Survey', total: 5 },
      { id: 's12', label: '0.12 Speed Prototype', total: 5 },
      { id: 's13', label: '0.13 Pro Interviews', total: 5 },
      { id: 's14', label: '0.14 Ads & Waitlist', total: 6 },
      { id: 's15', label: '0.15 Go/No-Go', total: 6 },
    ]
    const TASK_IDS: Record<string, string[]> = {
      s07: ['0.7.1','0.7.2','0.7.3','0.7.4','0.7.5','0.7.6'],
      s08: ['0.8.1','0.8.2','0.8.3','0.8.4','0.8.5','0.8.6'],
      s09: ['0.9.1','0.9.2','0.9.3','0.9.4','0.9.5'],
      s10: ['0.10.1','0.10.2','0.10.3','0.10.4','0.10.5'],
      s11: ['0.11.1','0.11.2','0.11.3','0.11.4','0.11.5'],
      s12: ['0.12.1','0.12.2','0.12.3','0.12.4','0.12.5'],
      s13: ['0.13.1','0.13.2','0.13.3','0.13.4','0.13.5'],
      s14: ['0.14.1','0.14.2','0.14.3','0.14.4','0.14.5','0.14.6'],
      s15: ['0.15.1','0.15.2','0.15.3','0.15.4','0.15.5','0.15.6'],
    }

    let total = 0, done = 0
    const segPills = SEGS.map(s => {
      const ids = TASK_IDS[s.id]
      const d = ids.filter(id => getData(`tasks.${id}.done`, false)).length
      total += s.total; done += d
      return { label: s.label, pct: Math.round((d / s.total) * 100) }
    })
    const pct = total ? Math.round((done / total) * 100) : 0

    const metrics: { n: string; l: string }[] = []
    if (getData('toggles.vis-metrics', false)) {
      const parents = getData('results.pub-parents', 0) as number
      const students = getData('results.pub-students', 0) as number
      const centers = getData('results.pub-centers', 0) as number
      const signups = getData('results.pub-signups', 0) as number
      const wtp = getData('results.pub-wtp', 0) as number
      const trust = getData('results.pub-trust', 0) as number
      if (parents) metrics.push({ n: String(parents), l: 'Parents Interviewed' })
      if (students) metrics.push({ n: String(students), l: 'Students Interviewed' })
      if (centers) metrics.push({ n: String(centers), l: 'Coaching Centers' })
      if (signups) metrics.push({ n: String(signups), l: 'Waitlist Signups' })
      if (wtp) metrics.push({ n: `₹${Number(wtp).toLocaleString('en-IN')}`, l: 'Avg. WTP / month' })
      if (trust) metrics.push({ n: `${trust}/10`, l: 'Trust Score' })
    }

    const insights: { icon: string; text: string }[] = []
    if (getData('toggles.vis-insights', false)) {
      const icons = ['💡', '✅', '📊', '⚡']
      ;['pub-insight1','pub-insight2','pub-insight3','pub-insight4'].forEach((k, i) => {
        const v = getData(`results.${k}`, '') as string
        if (v) insights.push({ icon: icons[i], text: v })
      })
    }

    const testimonials: Testimonial[] = getData('testimonials', []) as Testimonial[]

    const decision = getData('results.r15-decision', '') as string
    const decisionMemo = getData('results.r15-memo', '') as string
    const headline = getData('results.pub-headline', 'Built on Real Research. Validated by Real People.') as string
    const desc = getData('results.pub-desc', 'Before building a single line of code, we spoke directly to parents, students, coaching centers, and professionals to validate every assumption.') as string

    setValData({
      showSection: true,
      showMetrics: (getData('toggles.vis-metrics', false) as boolean) && metrics.length > 0,
      showInsights: (getData('toggles.vis-insights', false) as boolean) && insights.length > 0,
      showTesti: (getData('toggles.vis-testi', false) as boolean) && testimonials.length > 0,
      showDecision: (getData('toggles.vis-decision', false) as boolean) && !!decision,
      pct, segPills, metrics, insights, testimonials, decision, decisionMemo, headline, desc
    })
  }, [])

  // Load survey stats from API
  useEffect(() => {
    fetch('/api/survey')
      .then(r => r.json())
      .then(data => {
        if (data.total > 0) setSurveyStats(data)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      {/* NAV */}
      <nav className="main-nav">
        <a href="#" className="nav-logo">
          <div className="nav-logo-mark">🏛️</div>
          <span>AI-Gurukool</span>
        </a>
        <ul className="nav-links">
          <li><a href="#classroom">The Classroom</a></li>
          <li><a href="#subjects">Subjects</a></li>
          <li><a href="#portal">Parent Portal</a></li>
          <li><a href="#reports">Reports</a></li>
          <li><a href="#hybrid">Hybrid</a></li>
        </ul>
        <a href="/survey" className="nav-cta">📋 Take Survey</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div ref={heroBgRef} className="hero-bg" style={{ backgroundImage: "url('/hero-bg.png')" }} />
        <div className="hero-grad" />
        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
        <div className="container">
          <div className="hero-content">
            <div className="hero-chip reveal"><span className="chip-dot" />🏛️ &nbsp;Inspired by the Ancient Gurukul System</div>
            <h1 className="reveal delay-1">
              Ancient Wisdom.<br />
              <span className="grad-text">Future Intelligence.</span><br />
              For Every Child.
            </h1>
            <p className="hero-sub reveal delay-2">10 students. One AI Teacher. Infinite dialogue. The Gurukul spirit of open discussion — now inside a world-class, AI-powered roundtable.</p>
            <div className="hero-btns reveal delay-3">
              <a href="#trial" className="btn-primary">🎯 Book a Roundtable Trial</a>
              <a href="#classroom" className="btn-ghost">▶ See How It Works</a>
            </div>
            <div className="hero-stats reveal delay-4">
              {[['1:10','Teacher–\nStudent Ratio'],['2×','Faster\nSyllabus'],['20+','Subjects\nCovered'],['100%','Parent\nVisibility']].map(([n,l]) => (
                <div key={n} className="hstat-pill">
                  <div className="hstat-n">{n}</div>
                  <div className="hstat-l">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="scroll-ind"><span>Scroll</span><div className="scroll-arrow" /></div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {['Socratic Dialogue AI','1:10 Teacher Ratio','Live Parent Portal','Weekly Vitality Report','Hybrid via Teams & Zoom','24/7 Knowledge Vault','Ink-Based AI Board','Critical Thinking First','20+ Subjects Covered',
            'Socratic Dialogue AI','1:10 Teacher Ratio','Live Parent Portal','Weekly Vitality Report','Hybrid via Teams & Zoom','24/7 Knowledge Vault','Ink-Based AI Board','Critical Thinking First','20+ Subjects Covered'
          ].map((t, i) => (
            <div key={i} className="mitem"><span>{t}</span><span className="mdot" /></div>
          ))}
        </div>
      </div>

      {/* MARKET VALIDATION — only shown when admin enables it */}
      {valData?.showSection && (
        <section className="pad bg-dark3">
          <div className="container">
            <div className="reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
              <div className="section-eyebrow">Market Research &amp; Validation</div>
              <h2 className="section-title section-title-white">{valData.headline}</h2>
              <p className="section-sub section-sub-white" style={{ margin: '14px auto 0' }}>{valData.desc}</p>
            </div>
            <div className="card reveal" style={{ background: 'rgba(245,166,35,.05)', borderColor: 'rgba(245,166,35,.2)', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Phase 0 — Discovery &amp; Validation</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{valData.pct < 100 ? 'Research in progress…' : 'Phase 0 Complete!'}</div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--gold)' }}>{valData.pct}%</div>
              </div>
              <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${valData.pct}%` }} /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                {valData.segPills.map(s => (
                  <span key={s.label} style={{ fontSize: '.68rem', fontWeight: 600, padding: '4px 12px', borderRadius: 40, background: s.pct === 100 ? 'rgba(34,197,94,.12)' : s.pct > 0 ? 'rgba(245,166,35,.12)' : 'rgba(255,255,255,.06)', color: s.pct === 100 ? '#4ade80' : s.pct > 0 ? 'var(--gold)' : 'var(--muted)', border: '1px solid currentColor' }}>
                    {s.label} {s.pct}%
                  </span>
                ))}
              </div>
            </div>
            {valData.showMetrics && (
              <div className="val-metric-grid">
                {valData.metrics.map(m => (
                  <div key={m.l} className="val-metric-card">
                    <div className="val-metric-n">{m.n}</div>
                    <div className="val-metric-l">{m.l}</div>
                  </div>
                ))}
              </div>
            )}
            {valData.showInsights && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 18 }}>📌 Key Research Insights</h3>
                <div className="val-insight-grid">
                  {valData.insights.map((ins, i) => (
                    <div key={i} className="val-insight-card">
                      <span style={{ fontSize: '1.2rem', marginRight: 10 }}>{ins.icon}</span>
                      <span style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.75)' }}>{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {valData.showTesti && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 18 }}>💬 What People Said in Our Focus Groups</h3>
                <div className="val-testi-grid">
                  {valData.testimonials.map(t => (
                    <div key={t.id} className="val-testi-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div className="testi-avatar">👤</div>
                        <div><div className="testi-name">{t.name}</div><div className="testi-role">{t.role}{t.loc ? ` · ${t.loc}` : ''}</div></div>
                      </div>
                      <p style={{ fontSize: '.88rem', color: 'rgba(255,255,255,.8)', fontStyle: 'italic' }}>&quot;{t.quote}&quot;</p>
                      <div style={{ marginTop: 10 }}>{'⭐'.repeat(t.rating)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {valData.showDecision && (
              <div style={{ borderRadius: 18, padding: 32, textAlign: 'center', background: valData.decision === 'go' ? 'rgba(34,197,94,.08)' : valData.decision === 'nogo' ? 'rgba(239,68,68,.08)' : 'rgba(245,158,11,.08)', border: `1px solid ${valData.decision === 'go' ? 'rgba(34,197,94,.3)' : valData.decision === 'nogo' ? 'rgba(239,68,68,.3)' : 'rgba(245,158,11,.3)'}` }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{valData.decision === 'go' ? '✅' : valData.decision === 'nogo' ? '❌' : '⚠️'}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8, color: valData.decision === 'go' ? '#4ade80' : valData.decision === 'nogo' ? '#f87171' : 'var(--amber)' }}>
                  {valData.decision === 'go' ? 'GO — Building the MVP' : valData.decision === 'nogo' ? 'NO-GO — Pivoting' : 'CONDITIONAL — More Validation Needed'}
                </div>
                {valData.decisionMemo && <p style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.65)', maxWidth: 600, margin: '0 auto' }}>{valData.decisionMemo}</p>}
              </div>
            )}
            <div className="reveal" style={{ marginTop: 40, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: 36, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 10 }}>Be Part of the Research</div>
              <p style={{ fontSize: '.93rem', color: 'var(--muted)', marginBottom: 24, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>We are actively speaking to parents, students, and educators. Join our focus group or take a 5-minute survey — your input shapes what we build.</p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#trial" className="btn-primary" style={{ fontSize: '.9rem', padding: '12px 26px' }}>🎯 Join a Focus Group</a>
                <a href="/survey" className="btn-ghost" style={{ fontSize: '.9rem', padding: '12px 26px' }}>📋 Take the Survey</a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="pad bg-dark2">
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-eyebrow">What Makes Us Different</div>
            <h2 className="section-title section-title-white">This Isn&apos;t Just Schooling.<br />This Is Mentorship at Scale.</h2>
            <p className="section-sub section-sub-white" style={{ margin: '14px auto 0' }}>Gone are the days of one-way lectures. Every student is seen, heard, challenged, and tracked — by an AI that never loses patience.</p>
          </div>
          <div className="feat-grid">
            {[
              ['🔄','Roundtable Learning','No front-of-class hierarchy. Students sit in a circle — the AI moderates, every voice gets equal time.'],
              ['🤖','Socratic AI Dialogue','Correct answer? AI asks "Why?" Wrong answer? AI guides with questions — never just corrects.'],
              ['👁️','Real-Time Comprehension','AI detects confusion the moment it happens and rephrases before the student falls behind.'],
              ['📱','Glass Classroom Portal','Parents livestream their child\'s session from anywhere via secure login — watch them think, live.'],
              ['📊','Weekly Vitality Report','Academic scores, participation levels, critical thinking index — every week, not once a year.'],
              ['🌐','Seamless Hybrid','Join from home via Teams or Zoom with identical engagement, AI participation, and session recording.'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="glass-card feat-card reveal">
                <div className="feat-icon-wrap">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROUNDTABLE */}
      <section id="classroom" className="pad bg-dark">
        <div className="container">
          <div className="two-col">
            <div className="photo-frame reveal-left" style={{ height: 500 }}>
              <img src="/roundtable.png" alt="Students at AI roundtable" style={{ height: '100%', objectFit: 'cover' }} />
              <div className="photo-badge"><span className="live-dot" /> Live — Class 7B · Science</div>
            </div>
            <div className="reveal-right">
              <div className="section-eyebrow">Section A — The Roundtable</div>
              <h2 className="section-title section-title-white">From Chalk &amp; Talk<br />to Dialogue &amp; Discovery</h2>
              <div className="divider" />
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.95rem' }}>We have eliminated the &quot;front of the classroom.&quot; By placing students in a roundtable setup, we remove hierarchy and fear. The AI Teacher acts as a moderator — ensuring every voice is heard.</p>
              <ul className="checklist">
                <li><div className="ck">✓</div>Students learn to look each other in the eye and <b>debate solutions</b></li>
                <li><div className="ck">✓</div>Ink-based digital board draws <b>live alongside</b> the student&apos;s thinking</li>
                <li><div className="ck">✓</div>Ceiling-mounted audio-video captures every moment for the vault</li>
                <li><div className="ck">✓</div>Real-world application questions replace rote memorisation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-band">
        <div className="container">
          <div className="stats-inner">
            <div className="stat-cell reveal"><div className="stat-n"><span id="counter-c1">{counters.c1}</span><span className="stat-u">:10</span></div><div className="stat-l">Golden Teacher Ratio</div></div>
            <div className="stat-cell reveal delay-1"><div className="stat-n"><span id="counter-c2">{counters.c2}</span><span className="stat-u">×</span></div><div className="stat-l">Faster Syllabus Completion</div></div>
            <div className="stat-cell reveal delay-2"><div className="stat-n"><span id="counter-c3">{counters.c3}</span><span className="stat-u">+</span></div><div className="stat-l">Subjects Covered</div></div>
            <div className="stat-cell reveal delay-3"><div className="stat-n">0</div><div className="stat-l">Students Left Behind</div></div>
          </div>
        </div>
      </div>

      {/* SUBJECTS */}
      <section id="subjects" className="pad subjects-section">
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center' }}>
            <div className="section-eyebrow">What We Teach</div>
            <h2 className="section-title section-title-white">20+ Subjects. One Roundtable.<br /><span className="grad-text">Infinite Curiosity.</span></h2>
            <p className="section-sub section-sub-white" style={{ margin: '14px auto 0' }}>From foundational Mathematics to JEE, NEET, and CLAT entrance prep — every subject taught through real-world Socratic dialogue.</p>
          </div>
          <div className="subjects-grid">
            {[
              ['01_Math.png','Mathematics'],
              ['02_English.png','English'],
              ['03_Science.png','Science'],
              ['04_Computer_Science.png','Computer Science'],
              ['05_AI_Artificial_Intelligence.png','Artificial Intelligence'],
              ['06_Physics.png','Physics'],
              ['07_Chemistry.png','Chemistry'],
              ['08_Biology.png','Biology'],
              ['09_History.png','History'],
              ['10_Geography.png','Geography'],
              ['11_Hindi.png','Hindi'],
              ['12_Local_Language_Tamil.png','Local Language (Tamil)'],
              ['13_Commerce.png','Commerce'],
              ['14_Business_Studies.png','Business Studies'],
              ['15_Competitive_Exams.png','Competitive Exams'],
              ['16_Job_Entrance_Exam.png','Job Entrance Exams'],
              ['17_Engineering_Entrance_JEE.png','Engineering — JEE'],
            ].map(([file, name], i) => (
              <div
                key={file}
                className="subj-card reveal"
                style={{ transitionDelay: `${(i % 5) * 0.07}s` }}
              >
                <img src={`/subjects/${file}`} alt={name} loading="lazy" />
                <div className="subj-label"><span className="subj-name">{name}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCENARIOS */}
      <section className="scenario-section pad">
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center' }}>
            <div className="section-eyebrow">The AI-Gurukool Experience</div>
            <h2 className="section-title section-title-white">Every Classroom. Every Level.<br />Every Learning Style.</h2>
            <p className="section-sub section-sub-white" style={{ margin: '14px auto 0' }}>From Elementary to High School, Online Hybrid to Science Lab — our AI Teacher adapts to every scenario, every age group, and every topic.</p>
          </div>
          <div className="reveal delay-1" style={{ marginTop: 52, borderRadius: 24, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.7)', border: '1px solid rgba(255,255,255,.07)' }}>
            <img src="/scenarios.png" alt="AI classroom scenarios" style={{ width: '100%', display: 'block' }} />
          </div>
        </div>
      </section>

      {/* AI CO-PILOT */}
      <section id="aiteacher" className="pad bg-dark">
        <div className="container">
          <div className="two-col flip">
            <div className="photo-frame reveal-right" style={{ height: 480 }}>
              <img src="/math.png" alt="Math Applications at roundtable" style={{ height: '100%', objectFit: 'cover' }} />
              <div className="photo-badge">📐 Math Applications — Real-World Problems</div>
            </div>
            <div className="reveal-left">
              <div className="section-eyebrow">Section B — The AI Co-Pilot</div>
              <h2 className="section-title section-title-white">Subject Mastery Through<br />Application, Not Memorisation</h2>
              <div className="divider" />
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.95rem' }}>Our AI doesn&apos;t just display text. It projects real-world applications and challenges students to think beyond the textbook — in every subject, every day.</p>
              <ul className="checklist">
                <li><div className="ck">✓</div><b>&quot;How would you use this formula to build a bridge?&quot;</b></li>
                <li><div className="ck">✓</div><b>&quot;What would you have done differently in this war?&quot;</b></li>
                <li><div className="ck">✓</div>Questions adapt in real-time to each student&apos;s level</li>
                <li><div className="ck">✓</div>AI draws diagrams live on the ink-based board as students answer</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 1:10 RATIO */}
      <section id="ratio" className="pad bg-dark2">
        <div className="container">
          <div className="two-col">
            <div className="reveal-left">
              <div className="section-eyebrow">Section C — The Golden Rule</div>
              <h2 className="section-title section-title-white">Maximum Attention.<br />Maximum Understanding.</h2>
              <div className="divider" />
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.95rem' }}>The teacher-student ratio is strictly 1:10. This allows our AI and human moderators to track the engagement of every student — not as a group, but as individuals.</p>
              <ul className="checklist">
                <li><div className="ck">✓</div>AI identifies confusion in real-time and <b>rephrases immediately</b></li>
                <li><div className="ck">✓</div>No student moves forward until <b>mastery is confirmed</b></li>
                <li><div className="ck">✓</div>Every contribution logged and weighted in the weekly report</li>
                <li><div className="ck">✓</div>Human moderator alongside AI for emotional support</li>
              </ul>
            </div>
            <div className="photo-frame reveal-right" style={{ height: 460 }}>
              <img src="/ratio.png" alt="Multiple classroom learning scenarios" style={{ height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              <div className="photo-badge">🎯 Personalised to every student in the room</div>
            </div>
          </div>
        </div>
      </section>

      {/* GLASS CLASSROOM */}
      <section id="portal" className="pad bg-dark">
        <div className="container">
          <div className="two-col flip">
            <div className="portal-card reveal-right">
              <div className="portal-topbar">
                <div className="pbar-dot" style={{ background: '#ef4444' }} /><div className="pbar-dot" style={{ background: '#f59e0b' }} /><div className="pbar-dot" style={{ background: '#22c55e' }} />
                <span className="portal-title">Parent Portal — AI-Gurukool</span>
              </div>
              <div className="portal-body">
                <div className="live-chip"><span className="live-red" /> Live Now — Room 4B · Science</div>
                <div className="portal-thumb"><img src="/hero-bg.png" alt="Live classroom" /></div>
                <div className="portal-metrics">
                  <div className="pm"><div className="pm-n">9/10</div><div className="pm-l">Engagement</div></div>
                  <div className="pm"><div className="pm-n">4</div><div className="pm-l">Contributions</div></div>
                  <div className="pm"><div className="pm-n">A+</div><div className="pm-l">This Week</div></div>
                </div>
              </div>
            </div>
            <div className="reveal-left">
              <div className="section-eyebrow">Section D — Glass Classroom</div>
              <h2 className="section-title section-title-white">Watch Them Grow, Live.</h2>
              <div className="divider" />
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.95rem' }}>Why wait for a yearly parent-teacher meeting? Our portal allows parents to livestream their child&apos;s roundtable discussion from anywhere in the world via secure login.</p>
              <ul className="checklist">
                <li><div className="ck">✓</div>You don&apos;t just see their grades — you <b>see how they think</b></li>
                <li><div className="ck">✓</div>Watch your child debate, contribute, and collaborate in real-time</li>
                <li><div className="ck">✓</div>Secure, encrypted stream — verified parents only</li>
                <li><div className="ck">✓</div>Rewatch any session from the Knowledge Vault within 24 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* VITALITY REPORT */}
      <section id="reports" className="pad bg-dark2">
        <div className="container">
          <div className="two-col">
            <div className="report-card reveal-left">
              <div className="rc-head">
                <div><div className="rc-title">📋 Weekly Vitality Report</div><div className="rc-sub">Arjun Sharma · Class 8B · AI-Gurukool</div></div>
                <div className="rc-week">Week 24</div>
              </div>
              <div className="rc-body">
                <div className="rc-scores">
                  <div className="rc-s"><div className="rc-s-n">87</div><div className="rc-s-l">Academic Score</div><div className="badge bg-g">↑ +5 pts</div></div>
                  <div className="rc-s"><div className="rc-s-n">9.2</div><div className="rc-s-l">Participation</div><div className="badge bg-b">Excellent</div></div>
                  <div className="rc-s"><div className="rc-s-n">7.8</div><div className="rc-s-l">Critical Thinking</div><div className="badge bg-a">Growing</div></div>
                </div>
                <div className="rc-insights">
                  <div className="ri"><span className="ri-ic">✅</span>Correctly answered 3 Socratic follow-up questions in Physics this week</div>
                  <div className="ri"><span className="ri-ic">💡</span>Proposed an original solution during History roundtable — flagged for gifted programme</div>
                  <div className="ri"><span className="ri-ic">📌</span>Focus area: algebraic word problems — AI has scheduled extra dialogue sessions</div>
                  <div className="ri"><span className="ri-ic">🎯</span>Next week: Chapter 9 · Quadratic Equations · Estimated mastery in 2 sessions</div>
                </div>
              </div>
            </div>
            <div className="reveal-right">
              <div className="section-eyebrow">Section E — Vitality Report</div>
              <h2 className="section-title section-title-white">Real-Time Feedback,<br />Not Yearly Surprises.</h2>
              <div className="divider" />
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.95rem' }}>Forget the annual report card stress. Parents receive a comprehensive, AI-generated Vitality Report every week — covering not just scores, but how your child thinks.</p>
              <ul className="checklist">
                <li><div className="ck">✓</div>Academic scores across all subjects, every week</li>
                <li><div className="ck">✓</div>Participation levels and quality of contributions</li>
                <li><div className="ck">✓</div>Critical thinking index — tracked and trended over time</li>
                <li><div className="ck">✓</div>AI recommendations personalised per child, per week</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HYBRID */}
      <section id="hybrid" className="pad bg-dark">
        <div className="container">
          <div className="two-col flip">
            <div className="photo-frame reveal-right" style={{ height: 460 }}>
              <img src="/hybrid.png" alt="Hybrid class" style={{ height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
              <div className="photo-badge">🌐 Hybrid — Remote &amp; In-Person Together</div>
            </div>
            <div className="reveal-left">
              <div className="section-eyebrow">Section F — Hybrid Learning</div>
              <h2 className="section-title section-title-white">Never Miss a Day.<br />Join from Anywhere.</h2>
              <div className="divider" />
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.95rem' }}>Sick day? Family vacation? No problem. Students join the live roundtable via Teams or Zoom. The AI seamlessly integrates remote students — same engagement, same report.</p>
              <ul className="checklist">
                <li><div className="ck">✓</div>Remote student&apos;s voice <b>projected to the full roundtable</b> in real-time</li>
                <li><div className="ck">✓</div>AI calls on remote students equally to in-person participants</li>
                <li><div className="ck">✓</div>No penalty to participation score for hybrid attendance</li>
                <li><div className="ck">✓</div>Works on any device — laptop, tablet, or phone</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* KNOWLEDGE VAULT */}
      <section id="vault" className="pad bg-dark2">
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
            <div className="section-eyebrow">Section G — Knowledge Vault</div>
            <h2 className="section-title section-title-white">Learn. Revise. <span className="grad-text">Replay.</span></h2>
            <p className="section-sub section-sub-white" style={{ margin: '14px auto 0' }}>Every lesson, every AI interaction, and every whiteboard scribble is recorded and available 24/7 for revision at your own pace.</p>
          </div>
          <div className="feat-grid">
            {[
              ['🎥','Full Session Recordings','Multi-camera audio-video of every roundtable, auto-tagged by topic and timestamp.'],
              ['📝','AI Session Transcripts','Full searchable text of every question asked, every answer given, every AI response.'],
              ['🖊️','Whiteboard Saves','Every ink diagram saved as high-resolution with the AI\'s annotation alongside.'],
              ['📚','AI Study Notes','Auto-generated concise revision notes from each session — bullet-pointed, exam-ready.'],
              ['🧪','Personalised Q-Bank','AI generates 10 follow-up questions per session based on each student\'s weak areas.'],
              ['🏆','Progress Timeline','Visual map of every topic mastered over the year — students and parents see the full journey.'],
            ].map(([icon,title,desc],i) => (
              <div key={title} className={`glass-card feat-card reveal delay-${(i%3)+1}`}>
                <div className="feat-icon-wrap">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCRATIC DIALOGUE */}
      <section className="socratic-section pad">
        <div className="container socratic-grid">
          <div className="reveal-left">
            <div className="section-eyebrow">Our Unique Approach</div>
            <h2 className="section-title section-title-white">The AI Doesn&apos;t Just Answer.<br />It Asks <span className="grad-text">&quot;Why?&quot;</span></h2>
            <div className="divider" />
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.95rem' }}>Unlike ChatGPT where you type and get an answer, our AI is programmed for Socratic Dialogue. It teaches resilience and logic — not dependency on answers.</p>
            <ul className="checklist" style={{ marginTop: 22 }}>
              <li><div className="ck">✓</div>Correct answer? AI asks a <b>harder &quot;Why?&quot;</b> to the next student</li>
              <li><div className="ck">✓</div>Wrong answer? AI asks leading questions to guide — never corrects directly</li>
              <li><div className="ck">✓</div>Silence? AI invites, never shames — <b>confidence is built over time</b></li>
              <li><div className="ck">✓</div>Every dialogue logged to track intellectual growth over the year</li>
            </ul>
          </div>
          <div className="chat-wrap reveal-right">
            <div className="bubble b-ai"><strong>AI Teacher</strong>Arjun, you said &quot;F = ma&quot;. Correct! Now — Priya, can you tell me why a heavier truck takes longer to stop than a car at the same speed?</div>
            <div className="bubble b-student"><strong>Priya</strong>Because... it has more mass? So it needs more force to slow down?</div>
            <div className="bubble b-ai"><strong>AI Teacher</strong>Great start, Priya! But what if the truck has much bigger brakes — does that change your answer? Ravi, what do you think?</div>
            <div className="bubble b-student"><strong>Ravi</strong>The brakes give more force... but the mass is still bigger, so it still needs more stopping distance?</div>
            <div className="bubble b-ai"><strong>AI Teacher</strong>Now you&apos;re thinking like a physicist! 🎯 If mass doubles and force doubles too — what happens to acceleration? Class?</div>
          </div>
        </div>
      </section>

      {/* TRIAL CTA */}
      <section id="trial" className="cta-section">
        <div className="cta-inner">
          <div className="reveal">
            <div style={{ display: 'inline-block', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(245,166,35,.12)', border: '1px solid rgba(245,166,35,.3)', padding: '6px 16px', borderRadius: 40, marginBottom: 20 }}>Limited Seats Available</div>
            <h2>Experience the Roundtable — <span className="grad-text">Live.</span></h2>
            <p>Book a free 20-minute trial session. Sit your child at the roundtable, watch the AI in action, and feel the difference before you decide.</p>
            <a href="/survey" className="btn-primary" style={{ fontSize: '1rem', padding: '17px 38px' }}>📋 &nbsp;Take the Parent Survey</a>
          </div>
        </div>
      </section>

      {/* SURVEY STATS */}
      {surveyStats && surveyStats.total > 0 && (
        <section className="sv-stats-section">
          <div className="container">
            <div className="reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
              <div className="section-eyebrow">Live Research Data</div>
              <h2 className="section-title section-title-white">What {surveyStats.total} Parents Told Us</h2>
              <p className="section-sub section-sub-white">Real insights collected directly from parents. Every bar below represents actual responses — shaping every product decision we make.</p>
            </div>

            {/* 4 chart cards */}
            <div className="sv-chart-grid reveal">

              {/* Pain Points */}
              <div className="sv-chart-card">
                <div className="sv-chart-header">
                  <span className="sv-chart-icon">😤</span>
                  <div>
                    <div className="sv-chart-title">Biggest Pain with Tuition</div>
                    <div className="sv-chart-sub">Q3 · {surveyStats.total} responses</div>
                  </div>
                </div>
                <div className="sv-bars">
                  {surveyStats.pain.map((item, i) => (
                    <div key={i} className="sv-bar-row">
                      <div className="sv-bar-label">{item.label}</div>
                      <div className="sv-bar-track">
                        <div className="sv-bar-fill" style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />
                      </div>
                      <div className="sv-bar-pct">{item.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Reaction */}
              <div className="sv-chart-card">
                <div className="sv-chart-header">
                  <span className="sv-chart-icon">🤖</span>
                  <div>
                    <div className="sv-chart-title">Reaction to AI Teaching</div>
                    <div className="sv-chart-sub">Q9 · {surveyStats.total} responses</div>
                  </div>
                </div>
                <div className="sv-bars">
                  {surveyStats.reaction.map((item, i) => (
                    <div key={i} className="sv-bar-row">
                      <div className="sv-bar-label">{item.label}</div>
                      <div className="sv-bar-track">
                        <div className="sv-bar-fill" style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg,#f5a623,#fbbf24)' }} />
                      </div>
                      <div className="sv-bar-pct">{item.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Fears */}
              <div className="sv-chart-card">
                <div className="sv-chart-header">
                  <span className="sv-chart-icon">😨</span>
                  <div>
                    <div className="sv-chart-title">Biggest AI Concerns</div>
                    <div className="sv-chart-sub">Q10 · {surveyStats.total} responses</div>
                  </div>
                </div>
                <div className="sv-bars">
                  {surveyStats.fears.map((item, i) => (
                    <div key={i} className="sv-bar-row">
                      <div className="sv-bar-label">{item.label}</div>
                      <div className="sv-bar-track">
                        <div className="sv-bar-fill" style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg,#a855f7,#6366f1)' }} />
                      </div>
                      <div className="sv-bar-pct">{item.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spend + Trial */}
              <div className="sv-chart-card">
                <div className="sv-chart-header">
                  <span className="sv-chart-icon">💰</span>
                  <div>
                    <div className="sv-chart-title">Monthly Tuition Spend</div>
                    <div className="sv-chart-sub">Q12 · {surveyStats.total} responses</div>
                  </div>
                </div>
                <div className="sv-bars">
                  {surveyStats.spend.map((item, i) => (
                    <div key={i} className="sv-bar-row">
                      <div className="sv-bar-label">{item.label}</div>
                      <div className="sv-bar-track">
                        <div className="sv-bar-fill" style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg,#22c55e,#10b981)' }} />
                      </div>
                      <div className="sv-bar-pct">{item.pct}%</div>
                    </div>
                  ))}
                </div>
                <div className="sv-trial-pill">✅ {surveyStats.wantTrial}% would try a free trial</div>
              </div>

            </div>

            <div className="reveal sv-stats-cta">
              <p>Add your voice to the data →</p>
              <a href="/survey" className="btn-primary" style={{ fontSize: '.9rem', padding: '12px 28px' }}>Take the Survey (3 min)</a>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <a href="#" className="nav-logo"><div className="nav-logo-mark">🏛️</div>AI-<span>Gurukool</span></a>
              <p className="footer-desc">Reviving the ancient Gurukul spirit of open dialogue — powered by AI, designed for every child.</p>
            </div>
            <div className="footer-col">
              <h5>Experience</h5>
              <ul><li><a href="#classroom">The Roundtable</a></li><li><a href="#aiteacher">AI Co-Pilot</a></li><li><a href="#ratio">1:10 Ratio</a></li><li><a href="#hybrid">Hybrid Learning</a></li></ul>
            </div>
            <div className="footer-col">
              <h5>For Parents</h5>
              <ul><li><a href="#portal">Glass Classroom</a></li><li><a href="#reports">Vitality Report</a></li><li><a href="#vault">Knowledge Vault</a></li><li><a href="#trial">Book a Trial</a></li></ul>
            </div>
            <div className="footer-col">
              <h5>Contact</h5>
              <ul><li><a href="mailto:hello@ai-gurukool.com">hello@ai-gurukool.com</a></li><li><a href="#">WhatsApp Us</a></li><li><a href="#">Schedule a Call</a></li></ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 AI-Gurukool. All rights reserved.</p>
            <p>Ancient Wisdom · Future Intelligence · Personalized for Every Child</p>
            <a href="/admin" style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.1)' }}>⚙</a>
          </div>
        </div>
      </footer>

      {/* MOBILE STICKY */}
      <div className="mobile-cta">
        <span className="mobile-cta-txt">Ready to see AI-Gurukool live?</span>
        <a href="#trial" className="btn-primary" style={{ padding: '10px 22px', fontSize: '.82rem' }}>Book Trial</a>
      </div>
    </>
  )
}
