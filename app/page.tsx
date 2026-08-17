'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import SurveyModal from '@/components/SurveyModal'

/* ── IMAGE MAP ── */
const IMG = {
  roundtable:  '/roundtable.png',
  math:        '/math.png',
  biology:     '/biology.png',
  english:     '/English.png',
  history:     '/History.png',
  computer:    '/computer.png',
  geography:   '/geography.png',
  arts:        '/arts.png',
  music:       '/music.png',
  commerce:    '/commerce.png',
  competitive: '/competitive exam.png',
  grammar:     '/English Grammer.png',
  polsci:      '/political science.png',
  env:         '/Enviornment studies.png',
  heroBg:      '/hero-bg.png',
  roundOne:    '/round one.png',
  roundTwo:    '/round two.png',
  roundThree:  '/round three.png',
}

/* ── CAROUSEL DATA ── */
const SUBJECTS = [
  { src: IMG.math,        label: 'Mathematics',        sub: 'Numbers that explain the real world — not just the textbook.' },
  { src: IMG.biology,     label: 'Biology',            sub: 'Life under the microscope — dissected with dialogue.' },
  { src: IMG.english,     label: 'English',            sub: 'Voice, clarity, and the confidence to speak up.' },
  { src: IMG.history,     label: 'History',            sub: 'Debates across centuries — students argue both sides.' },
  { src: IMG.computer,    label: 'Computer Science',   sub: 'Build, break and rebuild — code as a creative act.' },
  { src: IMG.geography,   label: 'Geography',          sub: 'The planet as a living classroom.' },
  { src: IMG.arts,        label: 'Arts & Design',      sub: 'Ideas made visible — creativity with structure.' },
  { src: IMG.music,       label: 'Music',              sub: 'Rhythm, theory & soul — heard and understood.' },
  { src: IMG.commerce,    label: 'Commerce',           sub: 'Economy, markets, and real decisions.' },
  { src: IMG.competitive, label: 'JEE · NEET · CLAT', sub: 'Entrance prep in focused 1:10 dialogue pods.' },
  { src: IMG.grammar,     label: 'English Grammar',    sub: 'Precision in every sentence — spoken and written.' },
  { src: IMG.polsci,      label: 'Political Science',  sub: 'Power, policy, and why it all matters.' },
  { src: IMG.env,         label: 'Environment',        sub: 'Our planet — understood, not just memorised.' },
]

/* ── SKILLS (report card) ── */
const SKILLS = [
  { name: 'Talking with friends', icon: '👥', score: 3, prev: 2, evidence: 'Spoke to Zain during group work — plays alone at break' },
  { name: 'Asking questions',     icon: '✋', score: 2, prev: 2, evidence: 'Stuck on a math sum — did not raise hand for 5 min' },
  { name: 'Being kind',           icon: '❤️', score: 4, prev: 4, evidence: 'Shared crayons with Sara, said "Good job!" to Ali' },
  { name: 'Trying new things',    icon: '💡', score: 3, prev: 3, evidence: 'Finished worksheet but skipped the Challenge Star' },
  { name: 'Not giving up',        icon: '🚀', score: 3, prev: 2, evidence: 'BIG WIN — erased & tried again twice, no crumpled paper!' },
]

/* ── HOW IT WORKS — with lightbox ── */
const HOW_CARDS = [
  {
    n: '01', img: IMG.roundOne, delay: '0s',
    title: 'A round table, not rows',
    body: "Students sit in a circle — every child can see every other child. No hiding at the back. The AI notices who hasn't spoken and gently draws them in.",
  },
  {
    n: '02', img: IMG.roundTwo, delay: '0.5s',
    title: 'Questions, not lectures',
    body: "The AI never just explains — it asks. \"What do you think happens next?\" Real understanding comes from answering, not just listening.",
  },
  {
    n: '03', img: IMG.roundThree, delay: '1s',
    title: 'Reports that mean something',
    body: 'Every Friday, parents get a Vitality Report — not just scores, but how their child thinks, speaks, and grows. With a personalised plan for next week.',
  },
]

function HowItWorks() {
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section id="how" className="lp-how">
      <div className="container">
        <div className="lp-how-head reveal">
          <span className="lp-eyebrow">How It Works</span>
          <h2 className="lp-h2">Three things that make<br /><span className="lp-gold">every class different.</span></h2>
        </div>
        <div className="lp-how-grid">
          {HOW_CARDS.map((c, i) => (
            <div key={c.n} className="lp-how-card reveal" style={{ transitionDelay: `${i * 0.12}s` }}>
              <div
                className="lp-how-img-wrap"
                style={{ animationDelay: c.delay }}
                onClick={() => setLightbox(c.img)}
                role="button"
                tabIndex={0}
                aria-label={`View full image: ${c.title}`}
                onKeyDown={e => e.key === 'Enter' && setLightbox(c.img)}
              >
                <img
                  src={c.img}
                  alt={c.title}
                  className="lp-how-img"
                  draggable={false}
                />
              </div>
              <div className="lp-how-title-row">
                <div className="lp-how-n">{c.n}</div>
                <h3 className="lp-how-card-title">{c.title}</h3>
              </div>
              <p className="lp-how-card-desc">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="lp-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <div className="lp-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button
              className="lp-lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="Close lightbox"
            >✕</button>
            <img src={lightbox} alt="Expanded classroom view" className="lp-lightbox-img" />
          </div>
        </div>
      )}
    </section>
  )
}

/* ── CAROUSEL ── */
function Carousel() {
  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState(false)
  const sx = useRef(0)
  const n = SUBJECTS.length
  const prev = useCallback(() => setIdx(i => (i - 1 + n) % n), [n])
  const next = useCallback(() => setIdx(i => (i + 1) % n), [n])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [prev, next])

  const ts = (e: React.TouchEvent) => { sx.current = e.touches[0].clientX }
  const te = (e: React.TouchEvent) => { const d = sx.current - e.changedTouches[0].clientX; if (Math.abs(d) > 40) d > 0 ? next() : prev() }
  const md = (e: React.MouseEvent) => { setDrag(true); sx.current = e.clientX }
  const mu = (e: React.MouseEvent) => { if (!drag) return; setDrag(false); const d = sx.current - e.clientX; if (Math.abs(d) > 40) d > 0 ? next() : prev() }

  const cur = SUBJECTS[idx]
  const p   = SUBJECTS[(idx - 1 + n) % n]
  const nx  = SUBJECTS[(idx + 1) % n]

  return (
    <section id="subjects" className="cr-section">
      <div className="container">
        <div className="cr-header reveal">
          <span className="cr-eyebrow">What We Teach</span>
          <h2 className="cr-title">20+ Subjects.<br /><span className="cr-gold">Every Curiosity, Covered.</span></h2>
          <p className="cr-desc">From foundational Maths to JEE, NEET and CLAT prep — every subject taught through Socratic dialogue. Swipe or drag to explore.</p>
        </div>
        <div className="cr-stage" onTouchStart={ts} onTouchEnd={te} onMouseDown={md} onMouseUp={mu} style={{ cursor: drag ? 'grabbing' : 'grab' }}>
          <div className="cr-peek cr-peek-l" onClick={prev}>
            <img src={p.src} alt={p.label} draggable={false} />
            <div className="cr-pf cr-pf-l" />
            <span className="cr-plabel">{p.label}</span>
          </div>
          <div className="cr-main">
            <img key={idx} src={cur.src} alt={cur.label} draggable={false} className="cr-main-img" />
            <div className="cr-overlay">
              <span className="cr-count">{idx + 1} / {n}</span>
              <div className="cr-main-label">{cur.label}</div>
              <div className="cr-main-sub">{cur.sub}</div>
            </div>
          </div>
          <div className="cr-peek cr-peek-r" onClick={next}>
            <img src={nx.src} alt={nx.label} draggable={false} />
            <div className="cr-pf cr-pf-r" />
            <span className="cr-plabel">{nx.label}</span>
          </div>
        </div>
        <div className="cr-bar">
          <button className="cr-arr" onClick={prev}>←</button>
          <div className="cr-dots">{SUBJECTS.map((_, i) => <button key={i} className={`cr-dot${i === idx ? ' on' : ''}`} onClick={() => setIdx(i)} />)}</div>
          <button className="cr-arr" onClick={next}>→</button>
        </div>
      </div>
    </section>
  )
}

/* ── REPORT CARD ── */
function ReportCard() {
  return (
    <section id="report" className="rp-section">
      <div className="container rp-wrap">
        {/* LEFT — intro */}
        <div className="rp-intro reveal-l">
          <span className="rp-eyebrow">Weekly Vitality Report</span>
          <h2 className="rp-title">Every Friday —<br />A Real Window<br /><span className="rp-blue">into Your Child&apos;s Growth.</span></h2>
          <p className="rp-desc">Not just scores. How your child thinks, speaks, tries, and grows — written by the AI, verified by a human mentor.</p>
          <ul className="rp-intro-list">
            <li>5 social &amp; academic skills tracked every week</li>
            <li>AI-generated focus plan for the next 7 days</li>
            <li>One parent tip — simple, actionable, proven</li>
            <li>Verified by a real teacher before it reaches you</li>
          </ul>
        </div>

        {/* RIGHT — card */}
        <div className="rp-card reveal-r">
          <div className="rp-head">
            <div className="rp-student">
              <div className="rp-ava">A</div>
              <div>
                <div className="rp-name">Alex</div>
                <div className="rp-meta">Grade 2 · Section B · 15 Aug 2026</div>
              </div>
            </div>
            <div className="rp-score-pill">
              <div className="rp-score-n">3.0<span>/5</span></div>
              <div className="rp-score-l">Avg this week</div>
            </div>
          </div>

          <div className="rp-skills">
            {SKILLS.map(s => {
              const up = s.score > s.prev, dn = s.score < s.prev
              return (
                <div key={s.name} className="rp-skill">
                  <span className="rp-sk-icon">{s.icon}</span>
                  <div className="rp-sk-body">
                    <div className="rp-sk-top">
                      <span className="rp-sk-name">{s.name}</span>
                      <span className={`rp-delta ${up ? 'up' : dn ? 'dn' : 'eq'}`}>
                        {up ? '↑ improved' : dn ? '↓ slipped' : '— same'}
                      </span>
                    </div>
                    <div className="rp-bar-wrap"><div className="rp-bar" style={{ width: `${(s.score / 5) * 100}%` }} /></div>
                    <div className="rp-evidence">&ldquo;{s.evidence}&rdquo;</div>
                  </div>
                  <div className="rp-sk-score">{s.score}<span>/5</span></div>
                </div>
              )
            })}
          </div>

          {/* AI plan + parent tip — side by side */}
          <div className="rp-bottom">
            <div className="rp-bot-card rp-ai">
              <div className="rp-bot-icon">🤖</div>
              <div className="rp-bot-label">AI Focus Plan — this week</div>
              <div className="rp-bot-text">Alex avoids asking for help when stuck. The AI will nudge on the tablet after 2 minutes of silence: <em>&ldquo;Alex, let&apos;s ask your teacher together.&rdquo;</em> Goal: raise Asking Questions 2 → 3 by next Friday.</div>
            </div>
            <div className="rp-bot-card rp-tip">
              <div className="rp-bot-icon">💬</div>
              <div className="rp-bot-label">Parent Tip — try tonight</div>
              <div className="rp-bot-text">Ask Alex: <em>&ldquo;What was the hardest part of your day? Show me.&rdquo;</em> This one question builds the habit of speaking up — which is exactly what we&apos;re working on at school.</div>
            </div>
          </div>

          <div className="rp-foot">✓ Checked by Ms. Fatima &nbsp;·&nbsp; AI-Gurukool &nbsp;·&nbsp; Auto-generated report</div>
        </div>
      </div>
    </section>
  )
}

/* ── PAGE ── */
export default function HomePage() {
  const [mobileNav, setMobileNav] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)

  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-l, .reveal-r')
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) } })
    }, { threshold: 0.08 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      {/* NAV */}
      <nav className="main-nav">
        <a href="#" className="nav-logo">
          <div className="nav-logo-mark">🏛️</div>
          <span className="nav-logo-text">AI-Gurukool</span>
        </a>
        <ul className={`nav-links${mobileNav ? ' nav-open' : ''}`}>
          <li><a href="#classroom" onClick={() => setMobileNav(false)}>Classroom</a></li>
          <li><a href="#subjects"  onClick={() => setMobileNav(false)}>Subjects</a></li>
          <li><a href="#report"    onClick={() => setMobileNav(false)}>Reports</a></li>
        </ul>
        <div className="nav-right">
          <button className="nav-cta" onClick={() => setShowSurvey(true)}>Book a Class</button>
          <button className="nav-toggle" onClick={() => setMobileNav(v => !v)} aria-label="menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ══ HERO — Enviornment studies.png as background ══ */}
      <section className="lp-hero">
        <div className="lp-hero-fullimg">
          {/* lp-hero-over is first in DOM → flows above image on mobile */}
          <div className="lp-hero-over container">
            <div className="lp-badge">🏛 Ancient Gurukul · Reimagined with AI</div>
            <h1 className="lp-h1">One AI Teacher.<br />Ten Curious Minds.<br /><span className="lp-accent">The Gurukul, Reimagined.</span></h1>
            <p className="lp-hero-sub lp-hero-sub-desktop">10 students. 1 AI teacher. A round table. Every child speaks, debates, and builds real understanding — no rote learning, ever.</p>
          </div>
          {/* image second in DOM → flows below heading on mobile */}
          <img src={IMG.env} alt="AI Gurukool live classroom" className="lp-hero-img" />
          <div className="lp-hero-veil" />
          {/* mobile-only description, sits AFTER image */}
          <p className="lp-hero-sub-mobile">10 students. 1 AI teacher. A round table. Every child speaks, debates, and builds real understanding — no rote learning, ever.</p>
          <div className="lp-hero-corner-tag">
            <span className="lp-live-dot" />Live · Class 7B · Science
          </div>
        </div>
        <div className="lp-statbar">
          {[['1:10','Teacher–student ratio'],['2×','Faster syllabus'],['20+','Subjects covered'],['100%','Parent visibility']].map(([n,l]) => (
            <div key={n} className="lp-stat">
              <span className="lp-stat-n">{n}</span>
              <span className="lp-stat-l">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS — with floating images + lightbox ══ */}
      <HowItWorks />

      {/* ══ FEATURE — Biology ══ */}
      <section id="classroom" className="lp-feature">
        <div className="container lp-feat-grid reveal-l">
          <div className="lp-feat-img-big">
            <img src={IMG.biology} alt="Biology classroom" />
            <div className="lp-feat-tag">🧬 Biology · Live Dialogue Session</div>
          </div>
          <div className="lp-feat-body reveal-r">
            <span className="lp-eyebrow">Inside the Classroom</span>
            <h2 className="lp-h2-sm">Real subjects.<br /><span className="lp-gold">Real curiosity.</span></h2>
            <p>Students don&apos;t just read about photosynthesis — they argue about it. The AI draws the process live on the ink board as the class figures it out together.</p>
            <ul className="lp-list">
              <li>Every diagram drawn <strong>live</strong> alongside student thinking</li>
              <li>Questions connect textbooks to <strong>the real world</strong></li>
              <li>No student moves on until <strong>mastery is confirmed</strong></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══ WIDE — Computer Science ══ */}
      <section className="lp-wide">
        <div className="lp-wide-img-wrap">
          <img src={IMG.computer} alt="Computer Science classroom" className="lp-wide-img" />
          <div className="lp-wide-veil" />
          <div className="container lp-wide-content reveal">
            <span className="lp-eyebrow lp-eyebrow-lite">Computer Science</span>
            <h2 className="lp-h2 lp-h2-white">Build. Break.<br /><span className="lp-accent">Rebuild better.</span></h2>
            <p className="lp-wide-p">From Grade 4 onwards — students write real code, design real products, and present to the class. The AI asks: <em>&ldquo;Why did you choose that approach?&rdquo;</em></p>
            <ul className="lp-wide-bullets">
              <li>Code as a creative act — not a memorisation exercise</li>
              <li>AI moderates project work in focused 1:10 groups</li>
              <li>Real portfolios built, not empty grades awarded</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══ FEATURE — History ══ */}
      <section className="lp-feature lp-feature-alt">
        <div className="container lp-feat-grid lp-feat-flip reveal-r">
          <div className="lp-feat-body reveal-l">
            <span className="lp-eyebrow">History</span>
            <h2 className="lp-h2-sm">Not a story to memorise.<br /><span className="lp-gold">A debate to win.</span></h2>
            <p>Students argue both sides of a historical event. Mock trials. &ldquo;What would <em>you</em> have done differently?&rdquo; — and they have to defend their answer to the room.</p>
            <ul className="lp-list">
              <li>Roleplays, mock trials, debates — every lesson</li>
              <li>AI calls on quiet students — no one disappears</li>
              <li>Critical thinking tracked and reported weekly</li>
            </ul>
          </div>
          <div className="lp-feat-img-big">
            <img src={IMG.history} alt="History debate classroom" />
            <div className="lp-feat-tag">🏛 History · Debate Session</div>
          </div>
        </div>
      </section>

      {/* ══ CORE SUBJECTS — Math + English Grammar ══ */}
      <section className="lp-duo-section">
        <div className="container">
          <div className="lp-duo-head reveal">
            <span className="lp-eyebrow">Core Subjects</span>
            <h2 className="lp-h2">The subjects that<br /><span className="lp-gold">build every other subject.</span></h2>
          </div>
          <div className="lp-duo-grid">
            {/* Card 1 — Mathematics (math.png) */}
            <div className="lp-duo-card reveal-l">
              <div className="lp-duo-img"><img src={IMG.math} alt="Mathematics classroom" /></div>
              <div className="lp-duo-body">
                <h3>Mathematics</h3>
                <p>Numbers taught as logic — not formulas to memorise. Students ask <em>&ldquo;why does this work?&rdquo;</em> before they calculate the answer.</p>
                <ul className="lp-list lp-list-sm">
                  <li>Real-world problem solving every session</li>
                  <li>Peer explanation — teaching each other cements understanding</li>
                </ul>
              </div>
            </div>
            {/* Card 2 — English Grammar (English Grammer.png) */}
            <div className="lp-duo-card reveal-r">
              <div className="lp-duo-img"><img src={IMG.grammar} alt="English Grammar classroom" /></div>
              <div className="lp-duo-body">
                <h3>English Grammar</h3>
                <p>Grammar becomes a tool for expression — not rules to memorise. Students build sentences, spot patterns, and learn how language works through conversation and practice.</p>
                <ul className="lp-list lp-list-sm">
                  <li>Sentence building through real examples</li>
                  <li>Students explain why a sentence works — speaking and writing confidence</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ WIDE — Competitive Exams ══ */}
      <section className="lp-wide">
        <div className="lp-wide-img-wrap">
          <img src={IMG.competitive} alt="Competitive Exam Prep" className="lp-wide-img" />
          <div className="lp-wide-veil" />
          <div className="container lp-wide-content reveal">
            <span className="lp-eyebrow lp-eyebrow-lite">JEE · NEET · CLAT</span>
            <h2 className="lp-h2 lp-h2-white">The exam isn&apos;t the goal.<br /><span className="lp-accent">Understanding is.</span></h2>
            <p className="lp-wide-p">Students who understand deeply score better than students who practice blindly. Our 1:10 pods build real comprehension — the marks follow on their own.</p>
            <ul className="lp-wide-bullets">
              <li>Dedicated entrance exam pods — 1:10 ratio always maintained</li>
              <li>Doubt sessions closed-loop same day by AI</li>
              <li>Past papers argued, not just solved</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══ CAROUSEL ══ */}
      <Carousel />

      {/* ══ REPORT CARD ══ */}
      <ReportCard />

      {/* ══ CTA ══ */}
      <section id="survey-cta" className="lp-cta">
        <div className="lp-cta-glow" />
        <div className="container lp-cta-inner reveal">
          <div className="lp-badge lp-badge-gold">📋 2-minute Parent Survey — Open Now</div>
          <h2 className="lp-h2 lp-h2-white">Help us build the school<br /><span className="lp-accent">your child actually deserves.</span></h2>
          <p className="lp-cta-p">We&apos;re speaking to parents, students and teachers before building anything. Your answers shape what gets built. Under 2 minutes, no sign-up needed.</p>
          <button className="lp-btn-gold lp-btn-lg" onClick={() => setShowSurvey(true)}>Start the Survey →</button>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="lp-footer">
        <div className="container lp-footer-grid">
          <div className="lp-footer-brand">
            <div className="nav-logo" style={{ marginBottom: 16 }}>
              <div className="nav-logo-mark">🏛️</div>
              <span className="nav-logo-text">AI-Gurukool</span>
            </div>
            <p className="lp-footer-tagline">Reviving the ancient Gurukul spirit of open dialogue — powered by AI, designed for every child.</p>
            <p className="lp-footer-phase">Phase 0 · Discovery &amp; Validation · 2026</p>
          </div>
          <div className="lp-footer-col">
            <h5>The Experience</h5>
            <ul>
              <li><a href="#classroom">The Classroom</a></li>
              <li><a href="#how">How It Works</a></li>
              <li><a href="#subjects">All Subjects</a></li>
              <li><a href="#report">Weekly Reports</a></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>For Parents</h5>
            <ul>
              <li><a href="#report">Vitality Report</a></li>
              <li><a href="#survey-cta">Take the Survey</a></li>
              <li><a href="#" onClick={e => e.preventDefault()}>Book a Trial Class</a></li>
              <li><a href="#" onClick={e => e.preventDefault()}>Parent Portal (coming)</a></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h5>Contact</h5>
            <ul>
              <li><a href="mailto:hello@ai-gurukool.com">hello@ai-gurukool.com</a></li>
              <li><a href="#">WhatsApp Us</a></li>
              <li><a href="#">Schedule a Call</a></li>
              <li><a href="#">Instagram</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <div className="container lp-footer-bottom-row">
            <p>© 2026 AI-Gurukool. All rights reserved.</p>
            <p>AI Teacher · 1:10 Ratio · Socratic Dialogue · Gurukul Spirit</p>
            <a href="/admin" style={{ opacity: .1, fontSize: '.7rem', color: 'inherit' }}>⚙</a>
          </div>
        </div>
      </footer>

      <SurveyModal isOpen={showSurvey} onClose={() => setShowSurvey(false)} />
    </>
  )
}
