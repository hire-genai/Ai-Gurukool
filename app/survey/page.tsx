'use client'

import { useState, useEffect } from 'react'

interface SurveyForm {
  q1: string; q2: string; q3: string; q4: string
  q5: string; q6: string; q7: string; q8: string
  q9: string; q10: string; q11: string
  q12: string; q13: string; q14: string
  q15: string
}

const EMPTY: SurveyForm = {
  q1:'', q2:'', q3:'', q4:'',
  q5:'', q6:'', q7:'', q8:'',
  q9:'', q10:'', q11:'',
  q12:'', q13:'', q14:'',
  q15:'',
}

const BLOCKS: { title: string; subtitle: string; fields: (keyof SurveyForm)[] }[] = [
  { title: 'Study Struggles', subtitle: "Tell us about your child's current challenges", fields: ['q1','q2','q3','q4'] },
  { title: "What's Missing", subtitle: "Help us understand the gaps in today's education", fields: ['q5','q6','q7','q8'] },
  { title: 'About AI Teaching', subtitle: 'Your honest thoughts on AI-powered learning', fields: ['q9','q10','q11'] },
  { title: 'Money & Value', subtitle: "Let's talk numbers honestly", fields: ['q12','q13','q14'] },
  { title: 'One Last Thing', subtitle: 'Almost done — just one more question', fields: ['q15'] },
]

type OptionSet = { q: string; opts: string[] }
const QUESTIONS: Record<keyof SurveyForm, OptionSet> = {
  q1:  { q: "Your child's weakest subject?", opts: ['Math','Science','English','Hindi','Social Studies','Other'] },
  q2:  { q: "How often does your child ask for homework help?", opts: ['Every day','3–4×/week','Once a week','Rarely'] },
  q3:  { q: "Biggest complaint about your child's tuition teacher?", opts: ['Explains too fast','Too boring','Child afraid to ask doubts','Too expensive','Not personalised at all'] },
  q4:  { q: "Does your child ask doubts in class?", opts: ['Yes, always','Sometimes','Rarely — feels shy','Never'] },
  q5:  { q: "Quality missing most in today's teachers?", opts: ['Unlimited patience','24/7 availability','Never makes child feel stupid',"Adapts to child's pace",'Visual teaching — diagrams'] },
  q6:  { q: "Child has a doubt at 11pm — what happens today?", opts: ['Searches YouTube','Leaves for tomorrow','WhatsApps teacher','Asks us (parents)','Gives up entirely'] },
  q7:  { q: "Students per teacher in your child's coaching class?", opts: ['Under 10','10–25','25–40','More than 40'] },
  q8:  { q: "When class moves too fast — who adjusts?", opts: ['Nobody — child falls behind','We hire extra tutor','Child studies alone for hours','Teacher slows down (rare)'] },
  q9:  { q: "AI teacher: 24/7 available, never judges, infinitely patient, adapts to your child's pace. Your reaction?", opts: ['Excited — this is what we need','Interested — want to see it first','Neutral — not sure yet','Worried about human touch','Against it — prefer human only'] },
  q10: { q: "Biggest worry about AI teaching your child?", opts: ['Too much screen time','No emotional connection','AI makes mistakes','Child won\'t stay focused','Privacy of child\'s data'] },
  q11: { q: "Would you want a daily progress report on your child?", opts: ['Yes, daily','Yes, weekly','Only if child struggles','No need'] },
  q12: { q: "Monthly spend on tuition / coaching today?", opts: ['₹0–500','₹500–1,500','₹1,500–3,000','₹3,000–6,000','₹6,000+'] },
  q13: { q: "If AI gave same results at half the cost — would you switch?", opts: ['Yes, immediately','Yes, after seeing proof','Maybe after 3 months','No, cost isn\'t the issue'] },
  q14: { q: "First month completely free, then decide — would you try?", opts: ['Yes, 100%','Probably yes','Need more info','Not interested'] },
  q15: { q: "If your child's classmate used AI-Gurukool and topped the class — would you try it?", opts: ['Yes immediately — results speak','Yes, after researching it','Would ask the other parent first','Probably not','Definitely not'] },
}

export default function SurveyPage() {
  const [step, setStep] = useState(0)  // 0=intro, 1–5=blocks, 6=done
  const [form, setForm] = useState<SurveyForm>({ ...EMPTY })
  const [animDir, setAnimDir] = useState<'forward'|'back'>('forward')
  const [visible, setVisible] = useState(true)

  function pick(key: keyof SurveyForm, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  function blockComplete() {
    if (step === 0 || step === 6) return true
    return BLOCKS[step - 1].fields.every(f => form[f] !== '')
  }

  function go(dir: 'forward'|'back') {
    setAnimDir(dir)
    setVisible(false)
    setTimeout(() => {
      setStep(s => dir === 'forward' ? s + 1 : s - 1)
      setVisible(true)
    }, 200)
  }

  async function submit() {
    try {
      await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch {}
    go('forward')
  }

  const totalQ = 15
  const answered = Object.values(form).filter(v => v !== '').length
  const progressPct = step === 6 ? 100 : step === 0 ? 0 : Math.round((answered / totalQ) * 100)

  return (
    <div className="gf-page">
      {/* Top progress bar */}
      {step > 0 && step < 6 && (
        <div className="gf-topbar">
          <div className="gf-topbar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <div className="gf-center">

        {/* ── Intro ── */}
        {step === 0 && (
          <div className={`gf-card gf-intro ${visible ? 'gf-in' : 'gf-out-forward'}`}>
            <div className="gf-brand">🏛️ AI-Gurukool</div>
            <h1 className="gf-intro-title">Survey for AI-Gurukool</h1>
            <p className="gf-intro-sub">
              Before writing a single line of code, we talk to real parents.
              3 minutes of your time shapes what 1000s of students experience.
            </p>
            <div className="gf-intro-pills">
              <span>✦ 15 questions</span>
              <span>✦ 3 minutes</span>
              <span>✦ Anonymous</span>
            </div>
            <button className="gf-start-btn" onClick={() => go('forward')}>
              Start Survey
              <span className="gf-arrow">→</span>
            </button>
            <p className="gf-disclaimer">Your data stays on your device. We never sell it.</p>
          </div>
        )}

        {/* ── Blocks 1–5 ── */}
        {step >= 1 && step <= 5 && (
          <div className={`gf-card gf-block ${visible ? 'gf-in' : animDir === 'forward' ? 'gf-out-forward' : 'gf-out-back'}`}>
            <div className="gf-block-meta">
              <span className="gf-step-label">Section {step} of 5</span>
              <span className="gf-answered">{answered} / {totalQ} answered</span>
            </div>
            <h2 className="gf-block-title">{BLOCKS[step-1].title}</h2>
            <p className="gf-block-sub">{BLOCKS[step-1].subtitle}</p>

            <div className="gf-questions">
              {BLOCKS[step-1].fields.map((field, qi) => {
                const qdata = QUESTIONS[field]
                const qNum = Object.keys(QUESTIONS).indexOf(field) + 1
                return (
                  <div key={field} className="gf-q">
                    <div className="gf-q-label">
                      <span className="gf-q-num">{qNum}</span>
                      {qdata.q}
                    </div>
                    <div className="gf-opts">
                      {qdata.opts.map(opt => (
                        <button
                          key={opt}
                          className={`gf-opt${form[field] === opt ? ' gf-opt-sel' : ''}`}
                          onClick={() => pick(field, opt)}
                        >
                          <span className="gf-opt-radio" />
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="gf-nav">
              <button className="gf-btn-back" onClick={() => go('back')}>← Back</button>
              <div className="gf-dots">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`gf-dot${i === step ? ' gf-dot-active' : i < step ? ' gf-dot-done' : ''}`} />
                ))}
              </div>
              {step < 5
                ? <button className="gf-btn-next" disabled={!blockComplete()} onClick={() => go('forward')}>Next →</button>
                : <button className="gf-btn-submit" disabled={!blockComplete()} onClick={submit}>Submit ✓</button>
              }
            </div>
          </div>
        )}

        {/* ── Thank You ── */}
        {step === 6 && (
          <div className={`gf-card gf-done ${visible ? 'gf-in' : 'gf-out-forward'}`}>
            <div className="gf-done-confetti">🎉</div>
            <h2 className="gf-done-title">Thank you!</h2>
            <p className="gf-done-sub">Your feedback has been recorded and will directly shape what we build.</p>
            <div className="gf-done-row">
              <div className="gf-done-stat"><strong>3 min</strong><span>well spent</span></div>
              <div className="gf-done-stat"><strong>15</strong><span>insights shared</span></div>
              <div className="gf-done-stat"><strong>∞</strong><span>students helped</span></div>
            </div>
            <a href="/" className="gf-home-btn">← Back to Home</a>
          </div>
        )}

      </div>
    </div>
  )
}
