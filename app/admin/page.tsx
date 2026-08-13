'use client'
import { useEffect, useState, useCallback } from 'react'

const STORE_KEY = 'aig_phase0_v2'
const PW_KEY    = 'aig_admin_pw'
const DEFAULT_PW = 'gurukool2026'

// ── localStorage helpers ──
function loadData(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { return {} }
}
function saveData(d: Record<string, unknown>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d))
}
function getData(path: string, def: unknown = null): unknown {
  const d = loadData()
  const parts = path.split('.')
  let cur: unknown = d
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return def
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur ?? def
}
function setData(path: string, val: unknown) {
  const d = loadData()
  const parts = path.split('.')
  let cur = d as Record<string, unknown>
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {}
    cur = cur[parts[i]] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = val
  saveData(d)
}

// ── Task definitions ──
const TASK_DEFS: Record<string, { id: string; text: string; owner: string; time: string }[]> = {
  s07: [
    { id:'0.7.1', text:'Create a 15-question focus group discussion guide (probe: trust in AI, screen time fears, current tuition costs, desired features)', owner:'UX Researcher', time:'3 hrs' },
    { id:'0.7.2', text:'Design a 2-min "Teaser Video" showing the AI teaching a 5th-grade math problem using a simple screen recording', owner:'UX Researcher + Designer', time:'4 hrs' },
    { id:'0.7.3', text:'Recruit 20 parents via local school PTAs, Facebook Parenting Groups, and personal networks. Offer ₹800 voucher for participation', owner:'BD Lead', time:'5 days' },
    { id:'0.7.4', text:'Schedule and conduct 4 focus groups (5 parents each, 60 mins each) over Zoom. Record sessions (with consent)', owner:'UX Researcher', time:'1 week' },
    { id:'0.7.5', text:'Transcribe audio using Otter.ai and perform thematic analysis (tagging: "Trust", "Cost", "Fear", "Excitement")', owner:'UX Researcher', time:'6 hrs' },
    { id:'0.7.6', text:'Write a 5-page "Parent Sentiment Report" summarizing top 3 fears and top 3 desired features', owner:'UX Researcher', time:'4 hrs' },
  ],
  s08: [
    { id:'0.8.1', text:'Build a simple 10-min interactive prototype in Figma showing the full student journey (AI asks question → Student speaks → AI draws answer on board)', owner:'UX Researcher', time:'8 hrs' },
    { id:'0.8.2', text:'Create a 1-page "Scorecard" with 10 metrics (Clarity 1–10, Trust 1–10, Willingness to Pay ₹0–₹5,000, Likeliness to Recommend)', owner:'PM', time:'2 hrs' },
    { id:'0.8.3', text:'Invite the same 20 parents to a 30-min "Shadow Test" session (split into 3 batches of 6–7 parents)', owner:'BD Lead', time:'2 days' },
    { id:'0.8.4', text:'Facilitate 3 shadow test sessions: Show prototype, let parents click through, then fill out the scorecard', owner:'UX Researcher', time:'1.5 hrs' },
    { id:'0.8.5', text:'Aggregate scores into an Excel sheet. Calculate average, median, and standard deviation for each metric', owner:'Data Analyst', time:'2 hrs' },
    { id:'0.8.6', text:'Identify "Price Elasticity": Plot a graph of Willingness-to-Pay vs. Age of Child', owner:'Data Analyst', time:'1 hr' },
  ],
  s09: [
    { id:'0.9.1', text:'Create a child-friendly "Conversation Starter" card deck (10 questions with emojis)', owner:'UX Researcher', time:'3 hrs' },
    { id:'0.9.2', text:'Partner with 1 local tuition center to allow 15-min 1-on-1 interviews with 15 students during their break (with parental consent forms)', owner:'BD Lead', time:'3 days' },
    { id:'0.9.3', text:'Conduct 15 student interviews (15 mins each) in person or via Zoom. Record audio only (no video to reduce anxiety)', owner:'UX Researcher', time:'4 hrs' },
    { id:'0.9.4', text:'Transcribe interviews and code responses into 3 categories: "Engagement Triggers", "Boredom Triggers", "AI Fears"', owner:'UX Researcher', time:'4 hrs' },
    { id:'0.9.5', text:'Create a "Student Persona" poster for use in go/no-go meeting and investor presentations', owner:'UX Researcher + Designer', time:'2 hrs' },
  ],
  s10: [
    { id:'0.10.1', text:'Create a list of 50 coaching centers with contact emails/phones', owner:'BD Lead', time:'3 hrs' },
    { id:'0.10.2', text:'Draft a cold-email script + LinkedIn InMail template focused on "Operational Cost Reduction"', owner:'BD Lead', time:'2 hrs' },
    { id:'0.10.3', text:'Send emails/LinkedIn messages to 50 centers. Follow up twice (Day 3 and Day 7)', owner:'BD Lead', time:'10 days' },
    { id:'0.10.4', text:'Conduct 10 Zoom calls. Ask structured questions: "Student-to-teacher ratio?" "Cost per teacher?" "Biggest bottleneck?"', owner:'BD Lead', time:'5 hrs' },
    { id:'0.10.5', text:'Transcribe calls and build a "Pain-Point Matrix" (X-axis: Pain Severity, Y-axis: Willingness to try AI)', owner:'BD Lead + Data Analyst', time:'4 hrs' },
  ],
  s11: [
    { id:'0.11.1', text:'Design a 10-question Google Form with MCQ + Likert scale targeting competitive exam aspirants', owner:'Data Analyst', time:'2 hrs' },
    { id:'0.11.2', text:'Post the survey link in 5 Reddit communities (r/JEE, r/NEET, r/SAT) and 5 Telegram/Discord groups', owner:'BD Lead', time:'2 hrs' },
    { id:'0.11.3', text:'Incentivize: Offer a ₹400 Amazon voucher to 10 randomly selected respondents', owner:'PM', time:'1 hr' },
    { id:'0.11.4', text:'Close survey after 50 responses. Export CSV to Excel', owner:'Data Analyst', time:'1 hr' },
    { id:'0.11.5', text:'Analyze: Cross-tabulate "Hours Studied Alone" vs. "Interest in AI Tutor." Generate pivot tables and 5-slide PowerPoint', owner:'Data Analyst', time:'3 hrs' },
  ],
  s12: [
    { id:'0.12.1', text:'Pick 1 dense chapter (e.g., "Quadratic Equations") from a standard JEE prep book. Convert it into a raw text script', owner:'AI Engineer', time:'1 hr' },
    { id:'0.12.2', text:'Use GPT-4 to compress the chapter into a "Speed Script" (50% shorter than human teacher script)', owner:'AI Engineer', time:'2 hrs' },
    { id:'0.12.3', text:'Use TTS (Azure) to generate audio for the Speed Script. Time the audio length (target: 15 mins)', owner:'AI Engineer', time:'1 hr' },
    { id:'0.12.4', text:'Record a human teacher teaching the same chapter (from YouTube or a real lecture). Measure its duration', owner:'AI Engineer', time:'1 hr' },
    { id:'0.12.5', text:'Create an infographic comparing: "AI Speed (15 mins) vs. Human Speed (60 mins)." Add a "Syllabus Completion Calculator"', owner:'Designer', time:'3 hrs' },
  ],
  s13: [
    { id:'0.13.1', text:'Define target job exam personas (e.g., UPSC aspirant, GRE aspirant, AWS Certified Developer)', owner:'PM', time:'1 hr' },
    { id:'0.13.2', text:'Source 10 professionals via LinkedIn Sales Navigator', owner:'BD Lead', time:'3 hrs' },
    { id:'0.13.3', text:'Send personalized LinkedIn DMs offering a ₹1,600 Starbucks card for a 20-min "Education Tech" chat', owner:'BD Lead', time:'2 days' },
    { id:'0.13.4', text:'Conduct 10 calls. Ask: "When do you study? What frustrates you about self-study?"', owner:'BD Lead', time:'3.5 hrs' },
    { id:'0.13.5', text:'Synthesize notes into a "Professional Learner Persona Doc" (3-page document)', owner:'BD Lead + PM', time:'3 hrs' },
  ],
  s14: [
    { id:'0.14.1', text:'Build a simple 1-page landing page. Headline: "AI Teacher That Completes Your Syllabus 2× Faster." Add email sign-up', owner:'Growth Marketer', time:'3 hrs' },
    { id:'0.14.2', text:'Install Facebook Pixel and Google Analytics on the landing page for conversion tracking', owner:'Growth Marketer', time:'1 hr' },
    { id:'0.14.3', text:'Create 3 ad creatives: (1) Infographic, (2) 30-sec voiceover video, (3) Testimonial quote', owner:'Growth Marketer + Designer', time:'4 hrs' },
    { id:'0.14.4', text:'Launch Facebook + LinkedIn ads with a total daily budget of ₹1,600/day for 10 days (total ₹16,000)', owner:'Growth Marketer', time:'10 days' },
    { id:'0.14.5', text:'Monitor dashboard daily: Track Click-Through Rate (CTR) and Cost-Per-Signup (CPS). Pause underperforming ads', owner:'Growth Marketer', time:'10 mins/day' },
    { id:'0.14.6', text:'At the end of 10 days, generate a report: Total sign-ups, CTR%, CPS, and best-performing creative', owner:'Growth Marketer', time:'2 hrs' },
  ],
  s15: [
    { id:'0.15.1', text:'Create a master Excel sheet with 4 columns: Segment, Trust Score, Willingness-to-Pay, Market Size, Tech Feasibility', owner:'PM', time:'2 hrs' },
    { id:'0.15.2', text:'Assign weights to each criterion (Trust=40%, WTP=30%, Market Size=20%, Feasibility=10%)', owner:'PM + Lead Architect', time:'1 hr' },
    { id:'0.15.3', text:'Calculate a final "Go Score" for each of the 3 segments (Tuition, Competitive Exams, Job Entrance)', owner:'Data Analyst', time:'2 hrs' },
    { id:'0.15.4', text:'Host a 2-hour "Go/No-Go" team meeting. Present the matrix, Student Persona, Ads Report, and Speed Infographic', owner:'PM', time:'2 hrs' },
    { id:'0.15.5', text:'Formally document the decision in a 1-page "Segment Prioritization Memo" signed off by PM and Lead Architect', owner:'PM', time:'1 hr' },
    { id:'0.15.6', text:'Archive all raw data (recordings, CSVs, transcripts) in a shared Google Drive folder for future reference', owner:'PM + All', time:'1 hr' },
  ],
}

const SEG_INFO = [
  { id:'s07', label:'0.7 Parent Focus Groups', total:6, hours:26 },
  { id:'s08', label:'0.8 Shadow Testing', total:6, hours:20 },
  { id:'s09', label:'0.9 Student Interviews', total:5, hours:16 },
  { id:'s10', label:'0.10 Coaching Center Interviews', total:5, hours:17 },
  { id:'s11', label:'0.11 Aspirant Survey', total:5, hours:9 },
  { id:'s12', label:'0.12 Speed Prototype', total:5, hours:8 },
  { id:'s13', label:'0.13 Professional Interviews', total:5, hours:13.5 },
  { id:'s14', label:'0.14 Ads & Waitlist', total:6, hours:11 },
  { id:'s15', label:'0.15 Go/No-Go Decision', total:6, hours:10 },
]

const RESULT_FIELDS = [
  'r07-recruited','r07-groups','r07-recorded','r07-fears','r07-features','r07-summary',
  'r08-tested','r08-clarity','r08-trust','r08-wtp','r08-nps','r08-price','r08-elasticity',
  'r09-students','r09-age','r09-engage','r09-triggers','r09-boredom','r09-persona',
  'r10-contacted','r10-calls','r10-ratio','r10-pains','r10-willingness',
  'r11-responses','r11-live','r11-recorded','r11-ai-interest','r11-insight',
  'r12-ai','r12-human','r12-factor','r12-chapter','r12-summary',
  'r13-interviewed','r13-hours','r13-wtp','r13-persona','r13-frustrations',
  'r14-signups','r14-ctr','r14-cps','r14-spent','r14-creative','r14-platform','r14-summary',
  'r15-tuition','r15-competitive','r15-job','r15-segment','r15-memo',
  'pub-headline','pub-desc','pub-insight1','pub-insight2','pub-insight3','pub-insight4',
  'pub-parents','pub-students','pub-centers','pub-signups','pub-wtp','pub-trust','pub-survey','pub-ctr',
]
const TOGGLE_FIELDS = ['vis-section','vis-metrics','vis-testi','vis-insights','vis-decision']

interface Testimonial { id: number; name: string; role: string; loc: string; quote: string; rating: number; seg: string }

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [activePage, setActivePage] = useState('overview')
  const [saveMsg, setSaveMsg] = useState(false)
  const [notif, setNotif] = useState('')
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  // Form state
  const [fields, setFields] = useState<Record<string, string>>({})
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [decision, setDecisionState] = useState('')
  const [newTesti, setNewTesti] = useState({ name:'', role:'', loc:'', quote:'', rating:5, seg:'parent' })
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  const showNotif = (msg: string) => {
    setNotif(msg); setTimeout(() => setNotif(''), 2500)
  }
  const showSave = () => {
    setSaveMsg(true); setTimeout(() => setSaveMsg(false), 2000)
  }

  const loadAll = useCallback(() => {
    const f: Record<string, string> = {}
    RESULT_FIELDS.forEach(id => { f[id] = String(getData(`results.${id}`, '') || '') })
    setFields(f)
    const t: Record<string, boolean> = {}
    TOGGLE_FIELDS.forEach(id => { t[id] = Boolean(getData(`toggles.${id}`, false)) })
    setToggles(t)
    setTestimonials((getData('testimonials', []) as Testimonial[]) || [])
    setDecisionState(String(getData('results.r15-decision', '') || ''))
  }, [])

  useEffect(() => { if (loggedIn) loadAll() }, [loggedIn, loadAll])

  function doLogin() {
    const stored = localStorage.getItem(PW_KEY) || DEFAULT_PW
    if (pw === stored) { setLoggedIn(true); setPwErr('') }
    else setPwErr('Incorrect password. Try: gurukool2026')
  }

  function updateField(id: string, val: string) {
    setFields(prev => ({ ...prev, [id]: val }))
    setData(`results.${id}`, val)
    showSave()
  }
  function updateToggle(id: string, val: boolean) {
    setToggles(prev => ({ ...prev, [id]: val }))
    setData(`toggles.${id}`, val)
    showSave()
  }
  function toggleTask(taskId: string) {
    const cur = Boolean(getData(`tasks.${taskId}.done`, false))
    setData(`tasks.${taskId}.done`, !cur)
    refresh()
    showSave()
  }
  function updateTaskNote(taskId: string, val: string) {
    setData(`tasks.${taskId}.notes`, val)
  }
  function setDecision(val: string) {
    setDecisionState(val)
    setData('results.r15-decision', val)
    showSave()
  }
  function addTestimonial() {
    if (!newTesti.name || !newTesti.quote) { alert('Name and quote are required.'); return }
    const t = { ...newTesti, id: Date.now() }
    const list = [...testimonials, t]
    setTestimonials(list)
    setData('testimonials', list)
    setNewTesti({ name:'', role:'', loc:'', quote:'', rating:5, seg:'parent' })
    showNotif('✓ Testimonial added')
  }
  function deleteTestimonial(id: number) {
    if (!confirm('Delete this testimonial?')) return
    const list = testimonials.filter(t => t.id !== id)
    setTestimonials(list)
    setData('testimonials', list)
  }
  function changePassword() {
    if (!newPw) { setPwMsg('Password cannot be empty.'); return }
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match.'); return }
    localStorage.setItem(PW_KEY, newPw)
    setPwMsg('✓ Password updated!')
    setNewPw(''); setConfirmPw('')
  }
  function resetData() {
    if (!confirm('This will delete ALL data. Are you absolutely sure?')) return
    localStorage.removeItem(STORE_KEY)
    window.location.reload()
  }

  // Overview calculations
  function getOverviewStats() {
    let total = 0, done = 0
    Object.values(TASK_DEFS).forEach(tasks => {
      total += tasks.length
      tasks.forEach(t => { if (getData(`tasks.${t.id}.done`, false)) done++ })
    })
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }
  function getSegStats(segId: string) {
    const tasks = TASK_DEFS[segId]
    const done = tasks.filter(t => Boolean(getData(`tasks.${t.id}.done`, false))).length
    return { done, total: tasks.length }
  }
  function getBadge(segId: string) {
    const { done, total } = getSegStats(segId)
    return `${done}/${total}`
  }

  const navItems = [
    { id:'overview', icon:'📊', label:'Overview', section:'Dashboard' },
    { id:'s07', icon:'👨‍👩‍👧', label:'0.7 Focus Groups', section:'🟢 Segment A — Parents', badge: true },
    { id:'s08', icon:'🔬', label:'0.8 Shadow Testing', section:null, badge: true },
    { id:'s09', icon:'🧒', label:'0.9 Student Interviews', section:null, badge: true },
    { id:'s10', icon:'🏫', label:'0.10 Center Interviews', section:'🟡 Segment B — Coaching', badge: true },
    { id:'s11', icon:'📋', label:'0.11 Aspirant Survey', section:null, badge: true },
    { id:'s12', icon:'⚡', label:'0.12 Speed Prototype', section:null, badge: true },
    { id:'s13', icon:'💼', label:'0.13 Pro Interviews', section:'🔵 Segment C — Professionals', badge: true },
    { id:'s14', icon:'📣', label:'0.14 Ads & Waitlist', section:null, badge: true },
    { id:'s15', icon:'🎯', label:'0.15 Go / No-Go', section:'🟣 Decision', badge: true },
    { id:'public', icon:'🌐', label:'Public Content', section:'Public' },
    { id:'testimonials', icon:'💬', label:'Testimonials', section:null },
    { id:'settings', icon:'⚙️', label:'Settings', section:null },
  ]

  if (!loggedIn) {
    return (
      <div id="login-screen">
        <div className="login-card">
          <div className="login-logo">🏛️</div>
          <div className="login-title">AI-Gurukool Admin</div>
          <div className="login-sub">Phase 0 — Discovery &amp; Validation Dashboard</div>
          <label className="login-label">Admin Password</label>
          <input type="password" className="login-input" placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
          <button className="login-btn" onClick={doLogin}>Access Admin Panel</button>
          <div className="login-err">{pwErr}</div>
          <div className="login-hint">Default password: <code>gurukool2026</code></div>
        </div>
      </div>
    )
  }

  const stats = getOverviewStats()

  function TaskList({ segId }: { segId: string }) {
    const tasks = TASK_DEFS[segId]
    return (
      <div>
        {tasks.map(t => {
          const done = Boolean(getData(`tasks.${t.id}.done`, false))
          const notes = String(getData(`tasks.${t.id}.notes`, '') || '')
          return (
            <div key={t.id} className={`task-item${done ? ' done' : ''}`}>
              <div className={`task-check${done ? ' checked' : ''}`} onClick={() => toggleTask(t.id)}>{done ? '✓' : ''}</div>
              <div className="task-content">
                <div className="task-id">{t.id}</div>
                <div className="task-text">{t.text}</div>
                <div className="task-meta">
                  <span className="task-meta-pill">👤 {t.owner}</span>
                  <span className="task-meta-pill">⏱ {t.time}</span>
                </div>
                <input className="task-notes-input" defaultValue={notes} placeholder="Add notes / results here..." onChange={e => updateTaskNote(t.id, e.target.value)} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function SegResultFields({ prefix, fields: fieldDefs }: { prefix: string; fields: { id: string; label: string; type?: string; rows?: boolean }[] }) {
    return (
      <div className="result-input-wrap">
        <div className="result-input-title">📊 Segment Results — Enter after completion</div>
        {fieldDefs.map(f => (
          <div key={f.id}>
            <div className="field-label">{f.label}</div>
            {f.rows ? (
              <textarea className="field-input field-textarea" value={fields[`${prefix}${f.id}`] || ''} onChange={e => updateField(`${prefix}${f.id}`, e.target.value)} />
            ) : (
              <input type={f.type || 'text'} className="field-input" value={fields[`${prefix}${f.id}`] || ''} onChange={e => updateField(`${prefix}${f.id}`, e.target.value)} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="app-topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">🏛️</div>
          AI-<span>Gurukool</span>
          <span className="topbar-badge">Admin</span>
        </div>
        <div className="topbar-right">
          {saveMsg && <div className="save-indicator">✓ Saved</div>}
          <button className="topbar-btn preview-btn" onClick={() => window.open('/', '_blank')}>👁 Preview Site</button>
          <button className="topbar-btn danger" onClick={() => setLoggedIn(false)}>Logout</button>
        </div>
      </div>

      <div className="admin-layout">
        {/* Sidebar */}
        <nav className="sidebar">
          {(() => {
            let lastSection = ''
            return navItems.map(item => {
              const sectionEl = item.section && item.section !== lastSection ? (
                <div key={`sec-${item.section}`} className="sidebar-section-label" style={{ marginTop: lastSection ? 16 : 0 }}>{item.section}</div>
              ) : null
              if (item.section) lastSection = item.section
              return (
                <div key={item.id}>
                  {sectionEl}
                  <button className={`nav-item${activePage === item.id ? ' active' : ''}`} onClick={() => setActivePage(item.id)}>
                    <span className="nav-item-icon">{item.icon}</span>
                    {item.label}
                    {item.badge && TASK_DEFS[item.id] && (
                      <span className="nav-item-badge">{getBadge(item.id)}</span>
                    )}
                  </button>
                </div>
              )
            })
          })()}
        </nav>

        {/* Main */}
        <main className="admin-main">

          {/* OVERVIEW */}
          {activePage === 'overview' && (
            <div>
              <div className="page-title">📊 Phase 0 Overview</div>
              <div className="page-sub">Discovery &amp; Validation — Track all 49 tasks across 9 segments</div>
              <div className="metric-cards">
                <div className="metric-card"><div className="metric-n">{stats.done}</div><div className="metric-l">Tasks Completed</div></div>
                <div className="metric-card"><div className="metric-n">{stats.pct}%</div><div className="metric-l">Phase 0 Progress</div></div>
                <div className="metric-card"><div className="metric-n">{fields['pub-signups'] || 0}</div><div className="metric-l">Waitlist Signups</div></div>
                <div className="metric-card"><div className="metric-n">{fields['pub-wtp'] ? `₹${Number(fields['pub-wtp']).toLocaleString('en-IN')}` : '₹0'}</div><div className="metric-l">Avg. Willingness to Pay</div></div>
              </div>
              <div className="card">
                <div className="card-title">Overall Phase 0 Progress</div>
                <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stats.pct}%` }} /></div>
                <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{stats.done} of {stats.total} tasks completed</div>
              </div>
              <div className="card">
                <div className="card-title">Segment Status</div>
                <table className="seg-table">
                  <thead><tr><th>Segment</th><th>Tasks</th><th>Completed</th><th>Status</th><th>Est. Hours</th></tr></thead>
                  <tbody>
                    {SEG_INFO.map(s => {
                      const { done, total } = getSegStats(s.id)
                      const pct = total ? Math.round((done / total) * 100) : 0
                      const statusClass = done === total ? 'sp-done' : done > 0 ? 'sp-progress' : 'sp-pending'
                      const statusLabel = done === total ? 'Complete' : done > 0 ? 'In Progress' : 'Not Started'
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.label}</td>
                          <td>{total}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 60, height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--gold),var(--gold2))', borderRadius: 5 }} />
                              </div>
                              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{done}/{total}</span>
                            </div>
                          </td>
                          <td><span className={`status-pill ${statusClass}`}><span className="sp-dot" />{statusLabel}</span></td>
                          <td style={{ color: 'var(--muted)' }}>{s.hours} hrs</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEGMENT 0.7 */}
          {activePage === 's07' && (
            <div>
              <div className="page-title">👨‍👩‍👧 0.7 — Parent Focus Groups</div>
              <div className="page-sub">Conduct 20 in-person/Zoom focus groups with parents. Est. ~26 hours.</div>
              <TaskList segId="s07" />
              <SegResultFields prefix="r07-" fields={[
                { id:'recruited', label:'Parents Recruited', type:'number' },
                { id:'groups', label:'Focus Groups Conducted', type:'number' },
                { id:'recorded', label:'Sessions Recorded', type:'number' },
                { id:'fears', label:'Top 3 Parent Fears (one per line)', rows: true },
                { id:'features', label:'Top 3 Desired Features (one per line)', rows: true },
                { id:'summary', label:'Sentiment Report Summary', rows: true },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.8 */}
          {activePage === 's08' && (
            <div>
              <div className="page-title">🔬 0.8 — Shadow Testing</div>
              <div className="page-sub">Run 3 shadow testing sessions with parents using Figma prototype. Est. ~20 hours.</div>
              <TaskList segId="s08" />
              <SegResultFields prefix="r08-" fields={[
                { id:'tested', label:'Parents Tested', type:'number' },
                { id:'clarity', label:'Clarity Score (1–10)', type:'number' },
                { id:'trust', label:'Trust Score (1–10)', type:'number' },
                { id:'wtp', label:'Avg. WTP (₹/month)', type:'number' },
                { id:'nps', label:'Likelihood to Recommend (0–10)', type:'number' },
                { id:'price', label:'Optimal Price Point (₹)', type:'number' },
                { id:'elasticity', label:'Price Elasticity Insight', rows: true },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.9 */}
          {activePage === 's09' && (
            <div>
              <div className="page-title">🧒 0.9 — Student Interviews</div>
              <div className="page-sub">Interview 15 primary/secondary students directly. Est. ~16 hours.</div>
              <TaskList segId="s09" />
              <SegResultFields prefix="r09-" fields={[
                { id:'students', label:'Students Interviewed', type:'number' },
                { id:'age', label:'Avg. Age Group' },
                { id:'engage', label:'Engagement Trigger %', type:'number' },
                { id:'triggers', label:'Top Engagement Triggers', rows: true },
                { id:'boredom', label:'Top Boredom Triggers', rows: true },
                { id:'persona', label:'Student Persona Summary', rows: true },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.10 */}
          {activePage === 's10' && (
            <div>
              <div className="page-title">🏫 0.10 — Coaching Center Interviews</div>
              <div className="page-sub">Interview 10 competitive exam coaching center owners. Est. ~17 hours.</div>
              <TaskList segId="s10" />
              <SegResultFields prefix="r10-" fields={[
                { id:'contacted', label:'Centers Contacted', type:'number' },
                { id:'calls', label:'Calls Completed', type:'number' },
                { id:'ratio', label:'Avg. Student:Teacher Ratio' },
                { id:'pains', label:'Top Pain Points', rows: true },
                { id:'willingness', label:'Willingness to Try AI (0–10 avg)', type:'number' },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.11 */}
          {activePage === 's11' && (
            <div>
              <div className="page-title">📋 0.11 — Aspirant Survey</div>
              <div className="page-sub">Survey 50 competitive exam aspirants via Google Form. Est. ~9 hours.</div>
              <TaskList segId="s11" />
              <SegResultFields prefix="r11-" fields={[
                { id:'responses', label:'Total Responses', type:'number' },
                { id:'live', label:'Prefer Live Class %', type:'number' },
                { id:'recorded', label:'Prefer Recorded %', type:'number' },
                { id:'ai-interest', label:'Interest in AI Tutor %', type:'number' },
                { id:'insight', label:'Key Cross-Tab Insight', rows: true },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.12 */}
          {activePage === 's12' && (
            <div>
              <div className="page-title">⚡ 0.12 — Chapter Completion Speed Prototype</div>
              <div className="page-sub">Build &quot;2× faster syllabus&quot; prototype. Est. ~8 hours.</div>
              <TaskList segId="s12" />
              <SegResultFields prefix="r12-" fields={[
                { id:'ai', label:'AI Duration (mins)', type:'number' },
                { id:'human', label:'Human Duration (mins)', type:'number' },
                { id:'factor', label:'Speed Factor (e.g. 2.4×)' },
                { id:'chapter', label:'Chapter Tested' },
                { id:'summary', label:'Infographic Summary / Key Takeaway', rows: true },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.13 */}
          {activePage === 's13' && (
            <div>
              <div className="page-title">💼 0.13 — Working Professional Interviews</div>
              <div className="page-sub">Interview 10 working professionals (age 22–35). Est. ~13.5 hours.</div>
              <TaskList segId="s13" />
              <SegResultFields prefix="r13-" fields={[
                { id:'interviewed', label:'Professionals Interviewed', type:'number' },
                { id:'hours', label:'Avg. Study Hours/Day', type:'number' },
                { id:'wtp', label:'WTP for AI Audio Lessons (₹/mo)', type:'number' },
                { id:'persona', label:'Professional Persona Summary', rows: true },
                { id:'frustrations', label:'Top Study Frustrations', rows: true },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.14 */}
          {activePage === 's14' && (
            <div>
              <div className="page-title">📣 0.14 — Waitlist Landing Page &amp; Ads</div>
              <div className="page-sub">Build landing page, run ₹16,000 ads, collect waitlist signups. Est. ~11 hours + 10 days.</div>
              <TaskList segId="s14" />
              <SegResultFields prefix="r14-" fields={[
                { id:'signups', label:'Total Signups', type:'number' },
                { id:'ctr', label:'Click-Through Rate (%)', type:'number' },
                { id:'cps', label:'Cost Per Signup (₹)', type:'number' },
                { id:'spent', label:'Budget Spent (₹)', type:'number' },
                { id:'creative', label:'Best Performing Creative' },
                { id:'platform', label:'Best Performing Platform' },
                { id:'summary', label:'Ads Report Summary', rows: true },
              ]} />
            </div>
          )}

          {/* SEGMENT 0.15 */}
          {activePage === 's15' && (
            <div>
              <div className="page-title">🎯 0.15 — Go / No-Go Decision</div>
              <div className="page-sub">Consolidate all findings into the final decision matrix. Est. ~10 hours.</div>
              <TaskList segId="s15" />
              <div className="result-input-wrap">
                <div className="result-input-title">📊 Decision Matrix — Segment Scores</div>
                {['r15-tuition','r15-competitive','r15-job'].map((id, i) => (
                  <div key={id}>
                    <div className="field-label">{['Tuition Segment Go Score (0–100)','Competitive Exams Go Score','Job Entrance Go Score'][i]}</div>
                    <input type="number" className="field-input" value={fields[id] || ''} onChange={e => updateField(id, e.target.value)} />
                  </div>
                ))}
                <div className="field-label">Priority Segment (MVP Target)</div>
                <input type="text" className="field-input" value={fields['r15-segment'] || ''} onChange={e => updateField('r15-segment', e.target.value)} placeholder="e.g. Competitive Exams (JEE/NEET)" />
                <div className="field-label">Final Decision</div>
                <div className="decision-btns">
                  <div className={`decision-opt${decision === 'go' ? ' selected-go' : ''}`} onClick={() => setDecision('go')}><div className="decision-icon">✅</div>GO<div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 400, marginTop: 4 }}>Ready to build MVP</div></div>
                  <div className={`decision-opt${decision === 'conditional' ? ' selected-cond' : ''}`} onClick={() => setDecision('conditional')}><div className="decision-icon">⚠️</div>CONDITIONAL<div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 400, marginTop: 4 }}>More validation needed</div></div>
                  <div className={`decision-opt${decision === 'nogo' ? ' selected-nogo' : ''}`} onClick={() => setDecision('nogo')}><div className="decision-icon">❌</div>NO-GO<div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 400, marginTop: 4 }}>Pivot required</div></div>
                </div>
                <div className="field-label" style={{ marginTop: 14 }}>Decision Rationale / Memo Summary</div>
                <textarea className="field-input field-textarea" value={fields['r15-memo'] || ''} onChange={e => updateField('r15-memo', e.target.value)} />
              </div>
            </div>
          )}

          {/* PUBLIC CONTENT */}
          {activePage === 'public' && (
            <div>
              <div className="page-title">🌐 Public Content Manager</div>
              <div className="page-sub">Control what the public sees in the Market Validation section</div>
              <div className="card">
                <div className="card-title">Visibility Controls</div>
                <div className="card-sub">Toggle which sections appear on the public website</div>
                {[
                  { id:'vis-section', label:'Show Market Validation Section', desc:'Displays the research progress section on the homepage' },
                  { id:'vis-metrics', label:'Show Survey Metrics', desc:'Display numbers: parents interviewed, signups, WTP etc.' },
                  { id:'vis-testi', label:'Show Testimonials', desc:'Display testimonials from focus group participants' },
                  { id:'vis-insights', label:'Show Key Insights', desc:'Display top fears, features validated, and research insights' },
                  { id:'vis-decision', label:'Show Go/No-Go Status', desc:'Display the final decision for investors' },
                ].map(f => (
                  <div key={f.id} className="toggle-wrap">
                    <div className="toggle-info"><div className="toggle-label">{f.label}</div><div className="toggle-desc">{f.desc}</div></div>
                    <label className="toggle">
                      <input type="checkbox" checked={toggles[f.id] || false} onChange={e => updateToggle(f.id, e.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">Public Headline &amp; Description</div>
                {['pub-headline','pub-desc'].map((id, i) => (
                  <div key={id}>
                    <div className="field-label">{['Section Headline','Section Description'][i]}</div>
                    {i === 1 ? <textarea className="field-input field-textarea" value={fields[id] || ''} onChange={e => updateField(id, e.target.value)} /> : <input type="text" className="field-input" value={fields[id] || ''} onChange={e => updateField(id, e.target.value)} />}
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">Key Insights — Public Facing</div>
                {['pub-insight1','pub-insight2','pub-insight3','pub-insight4'].map((id, i) => (
                  <div key={id}>
                    <div className="field-label">{['Insight 1 — Parent Fear Addressed','Insight 2 — Feature Validated','Insight 3 — Market Demand','Insight 4 — Speed Advantage'][i]}</div>
                    <input type="text" className="field-input" value={fields[id] || ''} onChange={e => updateField(id, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">Investor Metrics</div>
                {[
                  ['pub-parents','Parents Interviewed'],['pub-students','Students Interviewed'],['pub-centers','Coaching Centers Talked To'],
                  ['pub-signups','Waitlist Signups'],['pub-wtp','Avg. Willingness to Pay (₹/mo)'],['pub-trust','Trust Score (out of 10)'],
                  ['pub-survey','Survey Responses (aspirants)'],['pub-ctr','Ad Click-Through Rate (%)'],
                ].map(([id, label]) => (
                  <div key={id}>
                    <div className="field-label">{label}</div>
                    <input type="number" className="field-input" value={fields[id] || ''} onChange={e => updateField(id, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="btn-row"><button className="btn-sm gold" onClick={() => showNotif('✓ All changes saved!')}>💾 Save All Changes</button></div>
            </div>
          )}

          {/* TESTIMONIALS */}
          {activePage === 'testimonials' && (
            <div>
              <div className="page-title">💬 Testimonials</div>
              <div className="page-sub">Add quotes from focus group participants — shown on the public homepage</div>
              <div className="card">
                <div className="card-title">Add New Testimonial</div>
                {[['name','Name'],['role','Role'],['loc','Location']].map(([k, l]) => (
                  <div key={k}>
                    <div className="field-label">{l}</div>
                    <input type="text" className="field-input" value={(newTesti as Record<string,unknown>)[k] as string} onChange={e => setNewTesti(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <div className="field-label">Quote</div>
                <textarea className="field-input field-textarea" value={newTesti.quote} onChange={e => setNewTesti(p => ({ ...p, quote: e.target.value }))} />
                <div className="field-label">Rating (1–5)</div>
                <div className="stars">
                  {[1,2,3,4,5].map(v => <span key={v} className="star" onClick={() => setNewTesti(p => ({ ...p, rating: v }))}>{v <= newTesti.rating ? '⭐' : '☆'}</span>)}
                </div>
                <div className="field-label">Segment</div>
                <select className="field-input" value={newTesti.seg} onChange={e => setNewTesti(p => ({ ...p, seg: e.target.value }))}>
                  <option value="parent">Parent (Focus Group)</option>
                  <option value="student">Student (Interview)</option>
                  <option value="teacher">Teacher / Coaching Center</option>
                  <option value="professional">Working Professional</option>
                  <option value="investor">Investor / Advisor</option>
                </select>
                <button className="btn-sm gold" onClick={addTestimonial}>+ Add Testimonial</button>
              </div>
              {testimonials.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>No testimonials yet. Add the first one above.</div>
              ) : testimonials.map(t => (
                <div key={t.id} className="testimonial-card">
                  <div className="testi-actions"><button className="testi-btn del" onClick={() => deleteTestimonial(t.id)}>Delete</button></div>
                  <div className="testi-meta"><div className="testi-avatar">👤</div><div><div className="testi-name">{t.name}</div><div className="testi-role">{t.role}{t.loc ? ` · ${t.loc}` : ''}</div></div></div>
                  <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 8 }}>Segment: {t.seg}</div>
                  <div style={{ fontSize: '.88rem', color: 'rgba(255,255,255,.8)', fontStyle: 'italic' }}>&quot;{t.quote}&quot;</div>
                  <div style={{ marginTop: 10 }}>{'⭐'.repeat(t.rating)}</div>
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS */}
          {activePage === 'settings' && (
            <div>
              <div className="page-title">⚙️ Settings</div>
              <div className="page-sub">Admin panel configuration</div>
              <div className="card">
                <div className="card-title">Change Admin Password</div>
                <div className="field-label">New Password</div>
                <input type="password" className="field-input" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Enter new password" />
                <div className="field-label">Confirm Password</div>
                <input type="password" className="field-input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" />
                <button className="btn-sm gold" onClick={changePassword}>Update Password</button>
                {pwMsg && <div style={{ marginTop: 10, fontSize: '.8rem', color: pwMsg.includes('✓') ? 'var(--green)' : '#f87171' }}>{pwMsg}</div>}
              </div>
              <div className="card">
                <div className="card-title" style={{ color: '#f87171' }}>⚠️ Danger Zone</div>
                <div className="card-sub">These actions cannot be undone</div>
                <div className="btn-row"><button className="btn-sm red" onClick={resetData}>Reset All Data</button></div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Notification */}
      {notif && <div className={`notif show`}>{notif}</div>}
    </div>
  )
}
