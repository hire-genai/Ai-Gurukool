'use client'
import { useEffect, useState } from 'react'
import SurveyModal from '@/components/SurveyModal'
import { useCurrency, convertLabel } from '@/lib/currency'

/* ─── Content (mirrors useful text from ai-gurukool-landing.html) ────── */

const PROOF_STATS = [
  { num: '78%', label: 'of parents said yes to a free trial' },
  { num: '64%', label: 'plan to enroll their child' },
  { num: '20+', label: 'subjects across all major boards' },
]

const PROOF_STRIP = [
  { icon: '👨‍👩‍👧', text: 'Trusted by families across', em: 'Metro, Tier 1 & Tier 2 cities' },
  { icon: '📚',      text: 'Aligned to',                 em: 'CBSE, ICSE, State Board & IB' },
  { icon: '🤖',      text: 'Powered by',                 em: 'AI with human oversight' },
  { icon: '⭐',      text: 'Average recommendation',     em: '4.1 / 5' },
]

const PROBLEMS = [
  { emoji: '😴', h: 'Boring, one-pace lectures',   p: 'Students sit through the same lesson whether they already know it or are completely lost.',                    stat: '#1 student complaint' },
  { emoji: '🙋', h: 'No personal attention',       p: 'With 40+ students per class, most children never get the individual explanation they need to truly understand.', stat: 'Cited by 68% of parents' },
  { emoji: '💸', h: 'Tuition is expensive',        p: 'Families spend ₹5,000 – ₹20,000 a month on private coaching — and it is still not enough for many children.',    stat: 'Average ₹8,400 / month' },
  { emoji: '📖', h: 'Rote learning, not thinking', p: 'Students memorise answers for exams but lack the critical thinking and real-world application they need for life.', stat: 'Concern for 62% of parents' },
]

const TRUST_PILLARS = [
  { icon: '👁️',  h: 'Live parent portal',            p: "Watch your child's learning in real time — every session, every concept, every score. No surprises.", badge: 'Most requested trust-builder' },
  { icon: '📋',  h: 'Weekly progress reports',       p: 'A jargon-free weekly summary of what was covered, what improved, and what needs more attention.',    badge: '2nd most requested feature' },
  { icon: '🛡️',  h: 'Data privacy & child safety',   p: "Your child's data is encrypted, never sold, and fully under your control. Delete any time.",         badge: 'Addresses 54% of trust concerns' },
  { icon: '🧑‍🏫', h: 'Human teacher oversight',       p: 'Every AI session is backed by qualified educators who review content and step in when needed.',     badge: 'Backed by real educators' },
  { icon: '🎬',  h: 'Session recordings',            p: 'Replay any lesson — great for revision, and for parents who want to stay involved on their schedule.', badge: 'Full transparency' },
  { icon: '🧠',  h: 'Critical thinking, not rote',   p: 'Questions and explanations build understanding, not memorisation — so your child can apply, not just recall.', badge: 'Vision of 68% of parents' },
]

const SURVEY_INSIGHTS = [
  { num: '78%', title: 'Free trial willingness',    desc: 'of families would try a free 7-day trial — before seeing any pricing.' },
  { num: '64%', title: 'Intent to enroll',           desc: 'of parents said "Definitely" or "Probably yes" to enrolling their child.' },
  { num: '71%', title: 'Value clarity',              desc: 'said AI-Gurukool\'s value was "Crystal" or "Mostly" clear after just one video.' },
  { num: '4.1', title: 'Recommendation score',       desc: 'out of 5 — the average when parents were asked if they would recommend us.' },
]

const SUBJECTS = [
  { tier: 'hot',   label: 'Mathematics',   note: 'Highest demand' },
  { tier: 'hot',   label: 'Physics',       note: 'High demand' },
  { tier: 'hot',   label: 'Chemistry',     note: 'High demand' },
  { tier: 'warm',  label: 'Biology' },
  { tier: 'warm',  label: 'English' },
  { tier: 'warm',  label: 'JEE / NEET Prep' },
  { tier: 'cool',  label: 'Computer Science' },
  { tier: 'cool',  label: 'Commerce & Accounts' },
  { tier: 'cool',  label: 'Economics' },
  { tier: 'mint',  label: 'Social Studies' },
  { tier: 'mint',  label: 'Hindi & Regional' },
  { tier: 'mint',  label: 'Foreign Languages' },
]

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function WhyTrustUsPage() {
  const [mobileNav, setMobileNav] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)
  const currency = useCurrency()

  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal, .reveal-l, .reveal-r').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      {/* NAV — same as main site */}
      <nav className="main-nav">
        <a href="/" className="nav-logo">
          <div className="nav-logo-mark">🏛️</div>
          <span className="nav-logo-text">AI-Gurukool</span>
        </a>
        <ul className={`nav-links${mobileNav ? ' nav-open' : ''}`}>
          <li><a href="/class-room" onClick={() => setMobileNav(false)}>Classroom</a></li>
          <li><a href="/#subjects"  onClick={() => setMobileNav(false)}>Subjects</a></li>
          <li><a href="/#report"    onClick={() => setMobileNav(false)}>Reports</a></li>
          <li><a href="/why-trust-us" onClick={() => setMobileNav(false)}>Why Trust Us</a></li>
          <li><a href="/insights"    onClick={() => setMobileNav(false)}>Insights</a></li>
        </ul>
        <div className="nav-right">
          <button className="nav-cta" onClick={() => setShowSurvey(true)}>Survey</button>
          <button className="nav-toggle" onClick={() => setMobileNav(v => !v)} aria-label="menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="wtu2-hero">
        <div className="container wtu2-hero-inner">
          <div className="lp-badge lp-badge-gold reveal">🎓 Backed by 1,200+ parent, student & teacher responses</div>
          <h1 className="wtu2-h1 reveal">
            Parents asked.<br />
            <span className="lp-accent">We built it — around trust.</span>
          </h1>
          <p className="wtu2-sub reveal">
            Before writing a single line of code, we spoke with 1,200+ families across India.
            Trust was their #1 concern. Every commitment on this page exists to answer a
            specific worry they raised.
          </p>
          <div className="wtu2-hero-cta reveal">
            <button className="lp-btn-gold lp-btn-lg" onClick={() => setShowSurvey(true)}>Take the Survey</button>
            <a href="#pillars" className="lp-btn-ghost">See what we built ↓</a>
          </div>

          <div className="wtu2-proof-row">
            {PROOF_STATS.map((s, i) => (
              <div className="wtu2-proof-stat reveal" key={s.label} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="wtu2-proof-num">{s.num}</div>
                <div className="wtu2-proof-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF STRIP ═══ */}
      <div className="wtu2-strip">
        <div className="container wtu2-strip-inner">
          {PROOF_STRIP.map(p => (
            <div className="wtu2-strip-item" key={p.em}>
              <span className="wtu2-strip-icon">{p.icon}</span>
              <span className="wtu2-strip-text">{p.text} <strong>{p.em}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ THE PROBLEM ═══ */}
      <section className="wtu2-section">
        <div className="container">
          <div className="wtu2-section-head">
            <span className="lp-eyebrow reveal">Why families told us they were losing trust</span>
            <h2 className="lp-h2 reveal">Every child is different.<br />Most schools treat them the same.</h2>
            <p className="wtu2-sub reveal">
              We surveyed 1,200+ parents, students and teachers. These are the four pain points they raised most often.
            </p>
          </div>

          <div className="wtu2-problems">
            {PROBLEMS.map((p, i) => (
              <div className={`wtu2-problem ${i % 2 === 0 ? 'reveal-l' : 'reveal-r'}`} key={p.h}>
                <div className="wtu2-problem-emoji">{p.emoji}</div>
                <div className="wtu2-problem-body">
                  <h3>{p.h}</h3>
                  <p>{convertLabel(p.p, currency)}</p>
                  <span className="wtu2-problem-stat">{convertLabel(p.stat, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST PILLARS ═══ */}
      <section className="wtu2-section wtu2-section-alt" id="pillars">
        <div className="container">
          <div className="wtu2-section-head">
            <span className="lp-eyebrow lp-eyebrow-lite reveal">Our Six Trust Pillars</span>
            <h2 className="lp-h2 reveal">Every feature answers a real family concern.</h2>
            <p className="wtu2-sub reveal">
              These are not marketing bullet points — each pillar maps directly to a worry parents,
              students or teachers raised in our research.
            </p>
          </div>

          <div className="wtu2-pillars">
            {TRUST_PILLARS.map((t, i) => (
              <article className="wtu2-pillar reveal" key={t.h} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="wtu2-pillar-icon">{t.icon}</div>
                <h3 className="wtu2-pillar-title">{t.h}</h3>
                <p className="wtu2-pillar-body">{t.p}</p>
                <span className="wtu2-pillar-badge">✓ {t.badge}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SIGNATURE STAT + QUOTE ═══ */}
      <section className="wtu2-section wtu2-signature-section">
        <div className="container wtu2-signature">
          <div className="wtu2-signature-stat reveal-l">
            <div className="lp-eyebrow lp-eyebrow-lite">Product / Market Fit Signal</div>
            <div className="wtu2-big-num">42%</div>
            <p className="wtu2-big-label">
              of surveyed parents said they would be <strong>&ldquo;Very Disappointed&rdquo;</strong> if
              AI-Gurukool did not exist. This is the threshold Sean Ellis calls the strongest
              validation of true product-market fit.
            </p>
          </div>

          <blockquote className="wtu2-quote reveal-r">
            <div className="wtu2-quote-mark">&ldquo;</div>
            <p>
              Finally something that treats my child as an individual, not just a seat in a
              classroom. The live dashboard alone is worth it.
            </p>
            <footer>
              <strong>Parent</strong> · Tier 1 city · Child in Class 9
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ═══ SURVEY INSIGHTS ═══ */}
      <section className="wtu2-section wtu2-section-alt">
        <div className="container">
          <div className="wtu2-section-head wtu2-section-head-center">
            <span className="lp-eyebrow reveal">Survey Insights</span>
            <h2 className="lp-h2 reveal">What 1,200+ families told us</h2>
            <p className="wtu2-sub reveal">
              The numbers behind our decisions — what we chose to build, and what we deliberately did not.
            </p>
          </div>

          <div className="wtu2-insights">
            {SURVEY_INSIGHTS.map((s, i) => (
              <div className="wtu2-insight reveal" key={s.title} style={{ transitionDelay: `${i * 70}ms` }}>
                <div className="wtu2-insight-num">{s.num}</div>
                <div className="wtu2-insight-title">{s.title}</div>
                <p className="wtu2-insight-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SUBJECTS ═══ */}
      <section className="wtu2-section">
        <div className="container">
          <div className="wtu2-section-head">
            <span className="lp-eyebrow reveal">Subjects Families Asked For</span>
            <h2 className="lp-h2 reveal">Starting with what families need most.</h2>
            <p className="wtu2-sub reveal">
              We mapped tuition demand across 1,200 families and built our depth around what
              students actually struggle with. Warmer tags = more families currently paying for
              private tuition in that subject.
            </p>
          </div>

          <div className="wtu2-tags reveal">
            {SUBJECTS.map(s => (
              <span className={`wtu2-tag wtu2-tag-${s.tier}`} key={s.label}>
                {s.label}
                {s.note && <em className="wtu2-tag-note">· {s.note}</em>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="wtu2-cta">
        <div className="container wtu2-cta-inner">
          <h2 className="wtu2-cta-h reveal">Help shape what we build next.</h2>
          <p className="wtu2-cta-p reveal">
            Take our 5-minute survey. Your answers directly influence the features, pricing and
            teachers we invest in for the next 1,000 families.
          </p>
          <div className="wtu2-cta-actions reveal">
            <button className="lp-btn-gold lp-btn-lg" onClick={() => setShowSurvey(true)}>Take the Survey</button>
            <a href="/" className="lp-btn-ghost">← Back to Home</a>
          </div>
          <div className="wtu2-cta-note">🔒 5 minutes · Anonymous · No card or sign-up required</div>
        </div>
      </section>

      <SurveyModal isOpen={showSurvey} onClose={() => setShowSurvey(false)} />
    </>
  )
}
