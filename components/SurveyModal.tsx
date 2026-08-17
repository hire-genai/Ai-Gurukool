'use client'
import { useEffect, useState, useCallback } from 'react'

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Role = 'parent' | 'student' | 'teacher'
type AnswerValue = string | string[]
type Answers = Record<string, AnswerValue>
interface Contact { name: string; email: string; phone: string }

interface QuestionBase {
  key: string
  label: string
  required?: boolean
}
interface SelectQ extends QuestionBase { type: 'select'; options: string[] }
interface MultiQ  extends QuestionBase { type: 'multi';  options: string[] }
interface TextQ   extends QuestionBase { type: 'text';   placeholder?: string }
type Question = SelectQ | MultiQ | TextQ

interface Section { title: string; questions: Question[] }

/* ─── Question Data ──────────────────────────────────────────────────────── */
const SCALE_OPTIONS = ['1','2','3','4','5','6','7','8','9','10']
const PRICE_OPTIONS = ['₹2000–₹4000','₹4000–₹6000','₹6000–₹8000','₹8000–₹10000','₹10000+']

const parentSections: Section[] = [
  {
    title: 'About You',
    questions: [
      { key:'p_relation',    type:'select', label:'What is your relationship to the child?', required:true,
        options:['Mother','Father','Guardian','Other'] },
      { key:'p_childAge',    type:'select', label:"What is your child's age group?", required:true,
        options:['5-8','9-12','13-15','16-18','18+'] },
      { key:'p_location',    type:'text',   label:'Where are you based? (optional)', placeholder:'e.g. Mumbai, India' },
      { key:'p_eduConcern',  type:'multi',  label:'What are your biggest education concerns? (select all that apply)', required:true,
        options:['Lack of personal attention','Slow syllabus','Rote learning','No real-time feedback','High costs','Lack of engagement','No career guidance'] },
    ],
  },
  {
    title: 'Challenges',
    questions: [
      { key:'p_satisfaction', type:'select', label:'How satisfied are you with your child\'s current schooling? (1 = Very dissatisfied, 10 = Very satisfied)', required:true,
        options: SCALE_OPTIONS },
      { key:'p_painPoints',   type:'multi',  label:'What are the biggest pain points? (select all that apply)', required:true,
        options:['No personal attention','Teacher doesn\'t explain well','Too much homework','Child is bored','No progress tracking','Too expensive'] },
      { key:'p_changeNeeded', type:'text',   label:'What single change would make the biggest difference? (optional)', placeholder:'e.g. More personalised learning...' },
    ],
  },
  {
    title: 'AI & The Future',
    questions: [
      { key:'p_aiFamiliarity', type:'select', label:'How familiar are you with AI in education?', required:true,
        options:['Very familiar','Somewhat familiar','Not familiar'] },
      { key:'p_trustAI',       type:'select', label:'Would you trust an AI teacher for your child?', required:true,
        options:['Yes completely','Yes with human oversight','Maybe or Not sure','No I don\'t trust AI'] },
      { key:'p_aiComfort',     type:'multi',  label:'What would make you more comfortable with AI teaching? (select all that apply)', required:true,
        options:['Live parent portal','Weekly progress reports','Human moderator present','Data privacy assurance','Session recordings'] },
      { key:'p_enroll',        type:'select', label:'Would you enroll your child in AI-Gurukool?', required:true,
        options:['Definitely yes','Probably yes','Not sure','Probably not'] },
      { key:'p_reason',        type:'multi',  label:'What appeals most to you? (select all that apply)', required:true,
        options:['Personalised attention','Critical thinking focus','Faster syllabus','Live parent visibility','Hybrid flexibility','Weekly reports','20+ subjects'] },
      { key:'p_concerns',      type:'text',   label:'Any concerns about AI-Gurukool? (optional)', placeholder:'e.g. Cost, screen time...' },
    ],
  },
  {
    title: 'Your Vision',
    questions: [
      { key:'p_price',     type:'select', label:'What monthly fee would you consider fair?', required:true,
        options: PRICE_OPTIONS },
      { key:'p_value',     type:'select', label:'How does that compare to your current spend?', required:true,
        options:['Better value','About the same','More expensive'] },
      { key:'p_vision',    type:'text',   label:'What is your vision for your child\'s education? (optional)', placeholder:'e.g. Make learning fun, build confidence...' },
      { key:'p_recommend', type:'select', label:'Would you recommend AI-Gurukool to other parents?', required:true,
        options:['Definitely','Maybe','Not sure'] },
      { key:'p_feedback',  type:'text',   label:'Any other thoughts or suggestions? (optional)', placeholder:'We\'re all ears!' },
    ],
  },
]

const studentSections: Section[] = [
  {
    title: 'About You',
    questions: [
      { key:'s_age',      type:'select', label:'What is your age group?', required:true,
        options:['5-8','9-12','13-15','16-18','19-22','23-25','25+'] },
      { key:'s_grade',    type:'select', label:'What grade or year are you in?', required:true,
        options:['Kindergarten','1st-2nd','3rd-5th','6th-8th','9th-10th','11th-12th','College Year 1','College Year 2','College Year 3+','Other'] },
      { key:'s_location', type:'text',   label:'Where are you based? (optional)' },
      { key:'s_subjects', type:'multi',  label:'Which subjects do you study? (select all that apply)', required:true,
        options:['Mathematics','Science','History','Languages','Computer Science','Commerce','Art','Music','Physical Education','Other'] },
    ],
  },
  {
    title: 'Challenges',
    questions: [
      { key:'s_satisfaction', type:'select', label:'How satisfied are you with your current schooling? (1 = Very dissatisfied, 10 = Very satisfied)', required:true,
        options: SCALE_OPTIONS },
      { key:'s_painPoints',   type:'multi',  label:'What are the biggest problems with how you learn now? (select all that apply)', required:true,
        options:['Boring lectures','Too much memorisation','No personal attention','Can\'t ask questions freely','Slow syllabus','Too much pressure','Lack of real-world application','Not enough practical learning'] },
      { key:'s_idealClass',   type:'text',   label:'Describe your ideal class in one sentence. (optional)', placeholder:'e.g. Interactive, personalised, engaging' },
    ],
  },
  {
    title: 'AI & The Future',
    questions: [
      { key:'s_aiFamiliarity', type:'select', label:'Have you used AI tools for learning?', required:true,
        options:['Yes regularly','Yes a few times','No but I want to','No not interested'] },
      { key:'s_trustAI',       type:'select', label:'Would you be comfortable with an AI teacher?', required:true,
        options:['Yes I\'d love that','Yes with human support','Maybe','No I prefer human teachers'] },
      { key:'s_aiBenefits',    type:'multi',  label:'What would you most want AI to help with? (select all that apply)', required:true,
        options:['Explaining difficult concepts','Practice questions','Personalised study plans','Instant feedback','Career guidance','Making learning fun'] },
      { key:'s_enroll',        type:'select', label:'Would you want to learn at AI-Gurukool?', required:true,
        options:['Definitely yes','Probably yes','Not sure','Probably not'] },
      { key:'s_concerns',      type:'text',   label:'Any concerns or questions? (optional)', placeholder:'e.g. I might miss human interaction...' },
    ],
  },
  {
    title: 'Your Vision',
    questions: [
      { key:'s_price',     type:'select', label:'What monthly fee seems fair to you?', required:true,
        options: PRICE_OPTIONS },
      { key:'s_vision',    type:'text',   label:'What would your ideal learning experience look like? (optional)', placeholder:'e.g. More interactive learning...' },
      { key:'s_recommend', type:'select', label:'Would you recommend AI-Gurukool to friends?', required:true,
        options:['Definitely','Maybe','Not sure'] },
      { key:'s_feedback',  type:'text',   label:'Any other thoughts? (optional)' },
    ],
  },
]

const teacherSections: Section[] = [
  {
    title: 'About You',
    questions: [
      { key:'t_experience', type:'select', label:'How many years have you been teaching?', required:true,
        options:['0-2','3-5','6-10','10-15','15+'] },
      { key:'t_level',      type:'select', label:'What level do you teach?', required:true,
        options:['Primary K-5','Middle 6-8','High School 9-12','College or University','Coaching or Tutoring','Special Education'] },
      { key:'t_location',   type:'text',   label:'Where are you based? (optional)' },
      { key:'t_subjects',   type:'multi',  label:'Which subjects do you teach? (select all that apply)', required:true,
        options:['Mathematics','Science','English','History','Computer Science','Languages','Commerce','Art','Music','Physical Education','Other'] },
    ],
  },
  {
    title: 'Challenges',
    questions: [
      { key:'t_satisfaction', type:'select', label:'How satisfied are you with your current teaching environment? (1 = Very dissatisfied, 10 = Very satisfied)', required:true,
        options: SCALE_OPTIONS },
      { key:'t_painPoints',   type:'multi',  label:'What are the biggest challenges you face? (select all that apply)', required:true,
        options:['Large class sizes','Lack of resources','Student disengagement','Administrative burden','Slow curriculum','Parent expectations','Assessment pressure','Lack of professional development'] },
      { key:'t_changeNeeded', type:'text',   label:'What single change would most improve teaching outcomes? (optional)', placeholder:'e.g. Smaller class sizes...' },
    ],
  },
  {
    title: 'AI & The Future',
    questions: [
      { key:'t_aiFamiliarity', type:'select', label:'How familiar are you with AI tools in education?', required:true,
        options:['Very familiar','Somewhat familiar','Not familiar'] },
      { key:'t_trustAI',       type:'select', label:'Would you trust AI as a co-teacher?', required:true,
        options:['Yes as co-teacher','Yes for admin tasks','Maybe','No I don\'t trust AI'] },
      { key:'t_aiUse',         type:'multi',  label:'What would you most want AI to help with in teaching? (select all that apply)', required:true,
        options:['Personalised lesson plans','Auto-grading','Student progress tracking','Generating practice questions','Explaining concepts','Classroom management'] },
      { key:'t_enroll',        type:'select', label:'Would you consider teaching at AI-Gurukool?', required:true,
        options:['Definitely yes','Probably yes','Not sure','Probably not'] },
      { key:'t_concerns',      type:'text',   label:'Any concerns? (optional)', placeholder:'e.g. Job displacement, loss of human touch...' },
    ],
  },
  {
    title: 'Your Vision',
    questions: [
      { key:'t_price',     type:'select', label:'What monthly student fee seems reasonable?', required:true,
        options: PRICE_OPTIONS },
      { key:'t_vision',    type:'text',   label:'What is your vision for the future of education? (optional)', placeholder:'e.g. Personalised learning at scale...' },
      { key:'t_recommend', type:'select', label:'Would you recommend AI-Gurukool to other educators?', required:true,
        options:['Definitely','Maybe','Not sure'] },
      { key:'t_feedback',  type:'text',   label:'Any other thoughts or suggestions? (optional)' },
    ],
  },
]

const SECTIONS: Record<Role, Section[]> = {
  parent:  parentSections,
  student: studentSections,
  teacher: teacherSections,
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function isScale(q: SelectQ) {
  return q.options.length === 10 && q.options[0] === '1' && q.options[9] === '10'
}

// Steps: 0=role, 1-4=sections, 5=contact, 6=success
function progressPct(step: number): number {
  if (step === 0) return 0
  if (step === 6) return 100
  return Math.round((step / 6) * 100)
}

function isValidEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function ChipSelect({ q, value, onChange }: {
  q: SelectQ
  value: string
  onChange: (v: string) => void
}) {
  if (isScale(q)) {
    return (
      <div>
        <div className="svy-scale">
          {q.options.map(o => (
            <button key={o} type="button"
              className={`svy-scale-chip${value === o ? ' active' : ''}`}
              onClick={() => onChange(o)}
            >{o}</button>
          ))}
        </div>
        <div className="svy-scale-labels">
          <span className="svy-scale-lbl">Very dissatisfied</span>
          <span className="svy-scale-lbl">Very satisfied</span>
        </div>
      </div>
    )
  }
  return (
    <div className="svy-chips">
      {q.options.map(o => (
        <button key={o} type="button"
          className={`svy-chip${value === o ? ' active' : ''}`}
          onClick={() => onChange(o)}
        >{o}</button>
      ))}
    </div>
  )
}

function ChipMulti({ q, value, onChange }: {
  q: MultiQ
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter(x => x !== opt))
    else onChange([...value, opt])
  }
  return (
    <div className="svy-chips">
      {q.options.map(o => (
        <button key={o} type="button"
          className={`svy-chip${value.includes(o) ? ' active' : ''}`}
          onClick={() => toggle(o)}
        >{o}</button>
      ))}
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
interface SurveyModalProps {
  isOpen: boolean
  onClose: () => void
}

const EMPTY_CONTACT: Contact = { name: '', email: '', phone: '' }

export default function SurveyModal({ isOpen, onClose }: SurveyModalProps) {
  const [step, setStep]             = useState(0)
  const [role, setRole]             = useState<Role | null>(null)
  const [answers, setAnswers]       = useState<Answers>({})
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [contact, setContact]       = useState<Contact>(EMPTY_CONTACT)
  const [contactErrors, setContactErrors] = useState<Partial<Contact>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep(0); setRole(null); setAnswers({}); setErrors({})
      setContact(EMPTY_CONTACT); setContactErrors({})
      setSubmitting(false); setSubmitError('')
    }
  }, [isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const sections = role ? SECTIONS[role] : []
  const currentSection: Section | null = step >= 1 && step <= 4 ? sections[step - 1] : null

  function setAnswer(key: string, val: AnswerValue) {
    setAnswers(prev => ({ ...prev, [key]: val }))
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  function setContactField(field: keyof Contact, val: string) {
    setContact(prev => ({ ...prev, [field]: val }))
    setContactErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  function validate(): boolean {
    if (!currentSection) return true
    const errs: Record<string, string> = {}
    for (const q of currentSection.questions) {
      if (!q.required) continue
      const val = answers[q.key]
      if (q.type === 'multi') {
        if (!val || (val as string[]).length === 0) errs[q.key] = 'Please select at least one option.'
      } else if (q.type === 'select') {
        if (!val) errs[q.key] = 'Please select an option.'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateContact(): boolean {
    const errs: Partial<Contact> = {}
    if (!contact.name.trim()) errs.name = 'Name is required.'
    if (!contact.email.trim()) {
      errs.email = 'Email is required.'
    } else if (!isValidEmail(contact.email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }
    setContactErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() {
    if (!validate()) return
    setStep(s => s + 1)
  }

  function handleBack() {
    if (step === 1) { setRole(null); setStep(0) }
    else setStep(s => s - 1)
  }

  async function handleSubmit() {
    if (!validateContact()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, answers, contact }),
      })
      const data = await res.json()
      if (data.ok) {
        setStep(6)
      } else {
        setSubmitError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const sectionTitles: Record<Role, string[]> = {
    parent:  ['About You','Challenges','AI & The Future','Your Vision'],
    student: ['About You','Challenges','AI & The Future','Your Vision'],
    teacher: ['About You','Challenges','AI & The Future','Your Vision'],
  }

  let eyebrow = ''
  let title   = ''
  if (step === 0) { eyebrow = 'Step 1 of 6'; title = 'Who are you?' }
  else if (step >= 1 && step <= 4 && role) { eyebrow = `Step ${step + 1} of 6 — ${sectionTitles[role][step - 1]}`; title = currentSection?.title ?? '' }
  else if (step === 5) { eyebrow = 'Step 6 of 6 — Almost Done!'; title = 'Your Details' }
  else if (step === 6) { eyebrow = 'Complete!'; title = 'Thank You!' }

  return (
    <div className="svy-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`svy-card${step >= 1 ? ' svy-card-full' : ''}`} onClick={e => e.stopPropagation()}>

        {/* Progress bar */}
        <div className="svy-progress">
          <div className="svy-progress-fill" style={{ width: `${progressPct(step)}%` }} />
        </div>

        {/* Header */}
        {step !== 6 && (
          <div className="svy-header">
            <div className="svy-header-text">
              <div className="svy-eyebrow">{eyebrow}</div>
              <div className="svy-title">{title}</div>
            </div>
            <button className="svy-close" onClick={onClose} aria-label="Close survey">✕</button>
          </div>
        )}

        {/* Body */}
        <div className="svy-body">

          {/* Step 0 — Role selection */}
          {step === 0 && (
            <div className="svy-role-grid">
              {([
                { r: 'parent'  as Role, icon: '👨‍👩‍👧', label: 'Parent / Guardian', sub: 'I have a child in school' },
                { r: 'student' as Role, icon: '🎒',      label: 'Student',            sub: 'I am currently studying' },
                { r: 'teacher' as Role, icon: '📚',      label: 'Educator',           sub: 'I teach or tutor students' },
              ]).map(({ r, icon, label, sub }) => (
                <button key={r} className="svy-role-btn" onClick={() => { setRole(r); setStep(1) }}>
                  <span className="svy-role-icon">{icon}</span>
                  <span className="svy-role-label">{label}</span>
                  <span className="svy-role-sub">{sub}</span>
                </button>
              ))}
            </div>
          )}

          {/* Steps 1–4 — Section questions */}
          {step >= 1 && step <= 4 && currentSection && (
            <div>
              {currentSection.questions.map(q => (
                <div key={q.key} className="svy-q">
                  <div className="svy-q-label">
                    {q.label}
                    {q.required ? <span className="svy-required">*</span> : <span className="svy-optional">optional</span>}
                  </div>

                  {q.type === 'select' && (
                    <ChipSelect
                      q={q}
                      value={(answers[q.key] as string) || ''}
                      onChange={v => setAnswer(q.key, v)}
                    />
                  )}

                  {q.type === 'multi' && (
                    <ChipMulti
                      q={q}
                      value={(answers[q.key] as string[]) || []}
                      onChange={v => setAnswer(q.key, v)}
                    />
                  )}

                  {q.type === 'text' && (
                    <textarea
                      className="svy-textarea"
                      rows={3}
                      placeholder={q.placeholder || ''}
                      value={(answers[q.key] as string) || ''}
                      onChange={e => setAnswer(q.key, e.target.value)}
                    />
                  )}

                  {errors[q.key] && <div className="svy-error">{errors[q.key]}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Step 5 — Contact details */}
          {step === 5 && (
            <div className="svy-contact">
              <p className="svy-contact-intro">Almost done! Share your details so we can keep you updated on AI-Gurukool&apos;s launch.</p>

              <div className="svy-q">
                <div className="svy-q-label">Full Name <span className="svy-required">*</span></div>
                <input
                  className="svy-input"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={contact.name}
                  onChange={e => setContactField('name', e.target.value)}
                />
                {contactErrors.name && <div className="svy-error">{contactErrors.name}</div>}
              </div>

              <div className="svy-q">
                <div className="svy-q-label">Email Address <span className="svy-required">*</span></div>
                <input
                  className="svy-input"
                  type="email"
                  placeholder="e.g. priya@gmail.com"
                  value={contact.email}
                  onChange={e => setContactField('email', e.target.value)}
                />
                {contactErrors.email && <div className="svy-error">{contactErrors.email}</div>}
              </div>

              <div className="svy-q">
                <div className="svy-q-label">Phone Number <span className="svy-optional">optional</span></div>
                <input
                  className="svy-input"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={contact.phone}
                  onChange={e => setContactField('phone', e.target.value)}
                />
              </div>

              <p className="svy-privacy-note">🔒 Your details are kept private and never shared with third parties.</p>
            </div>
          )}

          {/* Step 6 — Success */}
          {step === 6 && (
            <div className="svy-success">
              <div className="svy-success-icon">✅</div>
              <h3>Responses Submitted!</h3>
              <p>Thank you for helping shape AI-Gurukool. Your answers directly influence what we build for thousands of students.</p>
              <button className="svy-btn-next" style={{ marginTop: 12 }} onClick={onClose}>Close</button>
            </div>
          )}

        </div>

        {/* Submit error */}
        {submitError && <div className="svy-submit-err">{submitError}</div>}

        {/* Footer — steps 1–5 */}
        {step > 0 && step < 6 && (
          <div className="svy-footer">
            <div className="svy-step-info">
              {role && step <= 4 && `${role.charAt(0).toUpperCase() + role.slice(1)} · Section ${step} of 4`}
              {step === 5 && 'Final step'}
            </div>
            <div className="svy-footer-btns">
              <button className="svy-btn-back" onClick={handleBack}>← Back</button>
              {step < 4
                ? <button className="svy-btn-next" onClick={handleNext}>Next →</button>
                : step === 4
                ? <button className="svy-btn-next" onClick={handleNext}>Next →</button>
                : <button className="svy-btn-next" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit →'}
                  </button>
              }
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
