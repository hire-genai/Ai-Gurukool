'use client'

import { useState, useEffect } from 'react'

/* ── Types ── */
interface Task {
  id: string
  label: string
  detail?: string
  owner: string
  time: string
  prereq: string
  success: string
}

interface Activity {
  id: string
  title: string
  owner: string
  time: string
  segment: 'green' | 'yellow' | 'blue' | 'purple'
  tasks: Task[]
}

/* ── Data ── */
const ACTIVITIES: Activity[] = [
  {
    id: '0-7', title: 'Conduct 20 In-Person / Zoom Focus Groups with Parents',
    owner: 'UX Researcher', time: '~26 hrs', segment: 'green',
    tasks: [
      { id: '0-7-1', label: 'Create a 15-question focus group discussion guide', detail: 'probe: trust in AI, screen time fears, current tuition costs, desired features', owner: 'UX Researcher', time: '3 hrs', prereq: 'None', success: 'Guide approved by PM' },
      { id: '0-7-2', label: 'Design a 2-min "Teaser Video" showing the AI teaching a 5th-grade math problem', detail: 'voice + ink drawing using a simple screen recording', owner: 'UX Researcher + Designer', time: '4 hrs', prereq: 'None', success: 'Video is <50 MB and plays on Zoom / WhatsApp' },
      { id: '0-7-3', label: 'Recruit 20 parents via local school PTAs, Facebook Parenting Groups, and personal networks', detail: 'Offer $10 Amazon voucher for participation', owner: 'BD Lead', time: '5 days', prereq: '0.7.1', success: '20 parents confirmed and scheduled' },
      { id: '0-7-4', label: 'Schedule and conduct 4 focus groups (5 parents each, 60 mins each) over Zoom. Record sessions (with consent)', detail: undefined, owner: 'UX Researcher', time: '1 week', prereq: '0.7.3', success: 'All 4 sessions recorded and transcribed' },
      { id: '0-7-5', label: 'Transcribe audio using Otter.ai and perform thematic analysis', detail: 'tagging: "Trust," "Cost," "Fear," "Excitement"', owner: 'UX Researcher', time: '6 hrs', prereq: '0.7.4', success: 'Thematic tag cloud generated' },
      { id: '0-7-6', label: 'Write a 5-page "Parent Sentiment Report" summarizing top 3 fears and top 3 desired features', detail: undefined, owner: 'UX Researcher', time: '4 hrs', prereq: '0.7.5', success: 'Report shared with PM & Architects' },
    ]
  },
  {
    id: '0-8', title: 'Run 3 "Shadow Testing" Sessions with Parents',
    owner: 'UX Researcher + Data Analyst', time: '~20 hrs', segment: 'green',
    tasks: [
      { id: '0-8-1', label: 'Build a simple 10-min interactive prototype in Figma showing the full student journey', detail: 'AI asks question → Student speaks → AI draws answer on board', owner: 'UX Researcher', time: '8 hrs', prereq: '0.7.2', success: 'Clickable Figma prototype URL shared' },
      { id: '0-8-2', label: 'Create a 1-page "Scorecard" with 10 metrics', detail: 'Clarity 1–10, Trust 1–10, Willingness to Pay $0–$100, Likeliness to Recommend', owner: 'PM', time: '2 hrs', prereq: 'None', success: 'Scorecard printed / PDF ready' },
      { id: '0-8-3', label: 'Invite the same 20 parents to a 30-min "Shadow Test" session', detail: 'split into 3 batches of 6–7 parents', owner: 'BD Lead', time: '2 days', prereq: '0.8.1, 0.8.2', success: '18 parents confirmed (90% attendance)' },
      { id: '0-8-4', label: 'Facilitate 3 shadow test sessions: show prototype, let parents click through, then fill out the scorecard', detail: undefined, owner: 'UX Researcher', time: '1.5 hrs', prereq: '0.8.3', success: '18 filled scorecards collected' },
      { id: '0-8-5', label: 'Aggregate scores into an Excel sheet. Calculate average, median, and standard deviation for each metric', detail: undefined, owner: 'Data Analyst', time: '2 hrs', prereq: '0.8.4', success: 'Aggregated scorecard Excel file' },
      { id: '0-8-6', label: 'Identify "Price Elasticity": plot a graph of Willingness-to-Pay vs. Age of Child', detail: undefined, owner: 'Data Analyst', time: '1 hr', prereq: '0.8.5', success: 'Graph shows optimal pricing point' },
    ]
  },
  {
    id: '0-9', title: 'Interview 15 Primary / Secondary Students Directly',
    owner: 'UX Researcher', time: '~16 hrs', segment: 'green',
    tasks: [
      { id: '0-9-1', label: 'Create a child-friendly "Conversation Starter" card deck', detail: '10 questions with emojis: "What makes you 😴 in class?" "Would you like a robot that 👀 watches you?"', owner: 'UX Researcher', time: '3 hrs', prereq: 'None', success: 'Card deck PDF approved by child psychologist (optional)' },
      { id: '0-9-2', label: 'Partner with 1 local tuition center to allow 15-min 1-on-1 interviews with 15 students during their break', detail: 'with parental consent forms', owner: 'BD Lead', time: '3 days', prereq: '0.9.1', success: 'Consent forms signed by parents of 15 students' },
      { id: '0-9-3', label: 'Conduct 15 student interviews (15 mins each) in person or via Zoom.', detail: 'Record audio only (no video to reduce anxiety)', owner: 'UX Researcher', time: '4 hrs', prereq: '0.9.2', success: '15 audio recordings' },
      { id: '0-9-4', label: 'Transcribe interviews and code responses into 3 categories:', detail: '"Engagement Triggers," "Boredom Triggers," "AI Fears"', owner: 'UX Researcher', time: '4 hrs', prereq: '0.9.3', success: 'Coded transcript document' },
      { id: '0-9-5', label: 'Create a "Student Persona" poster', detail: '"Alex, Age 12, loves when teachers draw diagrams, hates when teachers repeat the same thing twice"', owner: 'UX Researcher + Designer', time: '2 hrs', prereq: '0.9.4', success: '1 visual persona poster shared with the team' },
    ]
  },
  {
    id: '0-10', title: 'Interview 10 Competitive Exam Coaching Center Owners',
    owner: 'BD Lead', time: '~17 hrs', segment: 'yellow',
    tasks: [
      { id: '0-10-1', label: 'Create a list of 50 coaching centers', detail: 'Allen, Byju\'s, Khan Academy, local "Champion" institutes with contact emails / phones', owner: 'BD Lead', time: '3 hrs', prereq: 'None', success: '50-contact CRM list created' },
      { id: '0-10-2', label: 'Draft a cold-email script + LinkedIn InMail template focused on "Operational Cost Reduction" (not "cool AI")', detail: undefined, owner: 'BD Lead', time: '2 hrs', prereq: '0.10.1', success: 'Templates approved by PM' },
      { id: '0-10-3', label: 'Send emails / LinkedIn messages to 50 centers. Follow up twice', detail: 'Day 3 and Day 7', owner: 'BD Lead', time: '10 days', prereq: '0.10.2', success: '10 centers agree to a 30-min Zoom call' },
      { id: '0-10-4', label: 'Conduct 10 Zoom calls. Ask structured questions:', detail: '"Student-to-teacher ratio?" "Cost per teacher?" "Biggest bottleneck?"', owner: 'BD Lead', time: '5 hrs', prereq: '0.10.3', success: '10 call recordings' },
      { id: '0-10-5', label: 'Transcribe calls and build a "Pain-Point Matrix"', detail: 'X-axis: Pain Severity, Y-axis: Willingness to try AI', owner: 'BD Lead + Data Analyst', time: '4 hrs', prereq: '0.10.4', success: 'Pain-Point Matrix visual' },
    ]
  },
  {
    id: '0-11', title: 'Survey 50 Competitive Exam Aspirants',
    owner: 'Data Analyst', time: '~9 hrs', segment: 'yellow',
    tasks: [
      { id: '0-11-1', label: 'Design a 10-question Google Form with MCQ + Likert scale', detail: 'e.g., "I study alone 0–5 hrs/day," "I prefer recorded lectures over live classes"', owner: 'Data Analyst', time: '2 hrs', prereq: 'None', success: 'Google Form URL generated' },
      { id: '0-11-2', label: 'Post the survey link in 5 Reddit communities and 5 Telegram / Discord groups', detail: 'r/JEE, r/NEET, r/SAT, r/GetStudying', owner: 'BD Lead', time: '2 hrs', prereq: '0.11.1', success: 'Link posted in 10 channels' },
      { id: '0-11-3', label: 'Incentivize: offer a $5 Amazon voucher to 10 randomly selected respondents', detail: undefined, owner: 'PM', time: '1 hr', prereq: '0.11.2', success: 'Voucher budget approved' },
      { id: '0-11-4', label: 'Close survey after 50 responses. Export CSV to Excel', detail: undefined, owner: 'Data Analyst', time: '1 hr', prereq: '0.11.3', success: 'CSV file with 50 rows' },
      { id: '0-11-5', label: 'Analyze: cross-tabulate "Hours Studied Alone" vs. "Interest in AI Tutor." Generate pivot tables', detail: undefined, owner: 'Data Analyst', time: '3 hrs', prereq: '0.11.4', success: '5-slide PowerPoint with key insights' },
    ]
  },
  {
    id: '0-12', title: 'Build "Chapter Completion Speed" Prototype',
    owner: 'AI Engineer', time: '~8 hrs', segment: 'yellow',
    tasks: [
      { id: '0-12-1', label: 'Pick 1 dense chapter from a standard JEE prep book. Convert it into a raw text script', detail: 'e.g., "Quadratic Equations"', owner: 'AI Engineer', time: '1 hr', prereq: '0.2', success: 'Raw script text file' },
      { id: '0-12-2', label: 'Use GPT-4 to compress the chapter into a "Speed Script"', detail: 'eliminate fluff, use bullet points, 50% shorter than human teacher script', owner: 'AI Engineer', time: '2 hrs', prereq: '0.12.1', success: 'Speed Script generated' },
      { id: '0-12-3', label: 'Use TTS (Azure) to generate audio for the Speed Script. Time the audio length', detail: 'target: 15 mins', owner: 'AI Engineer', time: '1 hr', prereq: '0.12.2', success: 'MP3 file with duration noted' },
      { id: '0-12-4', label: 'Record a human teacher teaching the same chapter (from YouTube or a real lecture). Measure its duration', detail: undefined, owner: 'AI Engineer', time: '1 hr', prereq: 'None', success: 'YouTube link with timestamp' },
      { id: '0-12-5', label: 'Create an infographic comparing: "AI Speed (15 mins) vs. Human Speed (60 mins)." Add a "Syllabus Completion Calculator"', detail: undefined, owner: 'Designer', time: '3 hrs', prereq: '0.12.3, 0.12.4', success: 'Infographic PDF ready for marketing' },
    ]
  },
  {
    id: '0-13', title: 'Interview 10 Working Professionals (Age 22–35)',
    owner: 'BD Lead', time: '~13.5 hrs', segment: 'blue',
    tasks: [
      { id: '0-13-1', label: 'Define target job exam personas', detail: 'e.g., UPSC aspirant, GRE aspirant, AWS Certified Developer', owner: 'PM', time: '1 hr', prereq: 'None', success: '3 Persona definitions documented' },
      { id: '0-13-2', label: 'Source 10 professionals via LinkedIn Sales Navigator', detail: 'filter by "Open to Work" + "Certification" keywords', owner: 'BD Lead', time: '3 hrs', prereq: '0.13.1', success: '10 relevant profiles shortlisted' },
      { id: '0-13-3', label: 'Send personalized LinkedIn DMs offering a $20 Starbucks card for a 20-min "Education Tech" chat', detail: undefined, owner: 'BD Lead', time: '2 days', prereq: '0.13.2', success: '10 professionals booked' },
      { id: '0-13-4', label: 'Conduct 10 calls. Ask: "When do you study? (Commute, Night). What frustrates you about self-study? Would you pay for an AI that teaches while you commute?"', detail: undefined, owner: 'BD Lead', time: '3.5 hrs', prereq: '0.13.3', success: '10 call notes' },
      { id: '0-13-5', label: 'Synthesize notes into a "Professional Learner Persona Doc"', detail: '"Riya, 28, studies on the train, hates reading long PDFs, will pay $50/mo for audio lessons"', owner: 'BD Lead + PM', time: '3 hrs', prereq: '0.13.4', success: '3-page Persona Doc' },
    ]
  },
  {
    id: '0-14', title: 'Launch Waitlist Landing Page & Run $200 Ads',
    owner: 'Growth Marketer', time: '~11 hrs + 10 days', segment: 'blue',
    tasks: [
      { id: '0-14-1', label: 'Build a simple 1-page landing page on Carrd / Webflow. Headline: "AI Teacher That Completes Your Syllabus 2x Faster." Add an email sign-up field', detail: undefined, owner: 'Growth Marketer', time: '3 hrs', prereq: '0.12.5', success: 'Landing page URL live' },
      { id: '0-14-2', label: 'Install Facebook Pixel and Google Analytics on the landing page for conversion tracking', detail: undefined, owner: 'Growth Marketer', time: '1 hr', prereq: '0.14.1', success: 'Pixel fires on page load and sign-up' },
      { id: '0-14-3', label: 'Create 3 ad creatives: (1) Infographic (from 0.12.5), (2) 30-sec voiceover video, (3) Testimonial quote (placeholder)', detail: undefined, owner: 'Growth Marketer + Designer', time: '4 hrs', prereq: '0.14.1', success: '3 ad sets ready' },
      { id: '0-14-4', label: 'Launch Facebook + LinkedIn ads with a total daily budget of $20/day for 10 days ($200 total).', detail: 'Target: "Job Aspirants" + "Certification Seekers"', owner: 'Growth Marketer', time: '10 days', prereq: '0.14.3', success: 'Ads running' },
      { id: '0-14-5', label: 'Monitor dashboard daily: track Click-Through Rate (CTR) and Cost-Per-Signup (CPS). Pause underperforming ads', detail: undefined, owner: 'Growth Marketer', time: '10 min/day', prereq: '0.14.4', success: 'Daily performance screenshots' },
      { id: '0-14-6', label: 'At the end of 10 days, generate a report: Total sign-ups, CTR%, CPS, and best-performing creative', detail: undefined, owner: 'Growth Marketer', time: '2 hrs', prereq: '0.14.5', success: '5-slide Ads Report' },
    ]
  },
  {
    id: '0-15', title: 'Consolidate Findings into "Go / No-Go" Decision Matrix',
    owner: 'PM', time: '~10 hrs', segment: 'purple',
    tasks: [
      { id: '0-15-1', label: 'Create a master Excel sheet with 4 columns:', detail: 'Segment, Trust Score (0.8.5), Willingness-to-Pay (0.8.5), Market Size (from 0.10/0.13), Tech Feasibility (1–10 from Architect)', owner: 'PM', time: '2 hrs', prereq: '0.8.5, 0.10.5, 0.13.5', success: 'Master Excel file created' },
      { id: '0-15-2', label: 'Assign weights to each criterion', detail: 'e.g., Trust=40%, WTP=30%, Market Size=20%, Feasibility=10%', owner: 'PM + Lead Architect', time: '1 hr', prereq: '0.15.1', success: 'Weighted scoring model built' },
      { id: '0-15-3', label: 'Calculate a final "Go Score" for each of the 3 segments (Tuition, Competitive Exams, Job Entrance)', detail: undefined, owner: 'Data Analyst', time: '2 hrs', prereq: '0.15.2', success: 'Scores calculated' },
      { id: '0-15-4', label: 'Host a 2-hour "Go/No-Go" team meeting. Present the matrix, Student Persona (0.9.5), Ads Report (0.14.6), and Competitive Speed Infographic (0.12.5)', detail: undefined, owner: 'PM', time: '2 hrs', prereq: '0.15.3', success: 'Team votes recorded' },
      { id: '0-15-5', label: 'Formally document the decision in a 1-page "Segment Prioritization Memo" signed off by PM and Lead Architect', detail: 'e.g., "MVP = Competitive Exams"', owner: 'PM', time: '1 hr', prereq: '0.15.4', success: 'Signed Memo completed' },
      { id: '0-15-6', label: 'Archive all raw data (recordings, CSVs, transcripts) in a shared Google Drive folder for future reference', detail: undefined, owner: 'PM + All', time: '1 hr', prereq: 'All above', success: 'Drive folder organized and shared' },
    ]
  },
]

const TOTAL_TASKS = 49
const STORAGE_KEY = 'aig_phase0_tasks'

const SEGMENT_LABELS: Record<string, string> = {
  green: '🟢 Segment A: Parent & Student Validation (Tuition Market)',
  yellow: '🟡 Segment B: Competitive Exam Segment (JEE / NEET / SAT / Olympiads)',
  blue: '🔵 Segment C: Job Entrance Exams (Banking / Civil Services / IT Certifications)',
  purple: '🟣 Final Decision Phase',
}

export default function Phase0Page() {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<Set<string>>(new Set(['0-7']))

  /* Load from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setDone(new Set(JSON.parse(saved)))
    } catch {}
  }, [])

  /* Save to localStorage on every change */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(done)))
  }, [done])

  function toggleTask(taskId: string) {
    setDone(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function toggleActivity(actId: string) {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(actId)) next.delete(actId)
      else next.add(actId)
      return next
    })
  }

  function expandAll() { setOpen(new Set<string>(ACTIVITIES.map(a => a.id))) }
  function collapseAll() { setOpen(new Set()) }
  function resetAll() {
    if (!confirm('Reset all task progress? This cannot be undone.')) return
    setDone(new Set())
  }

  const totalDone = done.size
  const masterPct = Math.round((totalDone / TOTAL_TASKS) * 100)

  function activityDone(act: Activity) {
    return act.tasks.filter(t => done.has(t.id)).length
  }

  /* Render segment headings — track which we've shown */
  let lastSegment = ''

  return (
    <div className="p0-wrap">
      {/* Hero */}
      <div className="p0-hero">
        <div className="p0-badge">Phase 0 · Discovery &amp; Validation</div>
        <h1 className="p0-title">AI Classroom – Discovery &amp; Validation</h1>
        <p className="p0-sub">Detailed Checkbox Task List · Activities 0.7 to 0.15 · 49 Sub-Tasks · ~130.5 hrs total</p>
      </div>

      <div className="p0-main">
        {/* Master progress */}
        <div className="p0-master">
          <div className="p0-master-header">
            <strong>Overall Phase 0 Progress</strong>
            <span>{totalDone} / {TOTAL_TASKS} tasks</span>
          </div>
          <div className="p0-bar-track">
            <div className="p0-bar-fill" style={{ width: `${masterPct}%` }} />
          </div>
          <div className="p0-stats">
            <span>Tasks Done: <strong>{totalDone}</strong></span>
            <span>Remaining: <strong>{TOTAL_TASKS - totalDone}</strong></span>
            <span>Total Hours: <strong>~130.5 hrs</strong></span>
            <span>Total Sub-Tasks: <strong>49</strong></span>
          </div>
        </div>

        {/* Activities */}
        {ACTIVITIES.map(act => {
          const showSegment = act.segment !== lastSegment
          if (showSegment) lastSegment = act.segment
          const aDone = activityDone(act)
          const aTotal = act.tasks.length
          const aPct = Math.round((aDone / aTotal) * 100)
          const isOpen = open.has(act.id)

          return (
            <div key={act.id}>
              {showSegment && (
                <div className={`p0-seg-heading p0-seg-${act.segment}`}>
                  {SEGMENT_LABELS[act.segment]}
                </div>
              )}

              <div className="p0-activity">
                <div className="p0-act-header" onClick={() => toggleActivity(act.id)}>
                  <span className="p0-act-id">{act.id.replace(/-/g, '.')}</span>
                  <span className="p0-act-title">{act.title}</span>
                  <div className="p0-act-meta">
                    <span className="p0-chip p0-chip-owner">{act.owner}</span>
                    <span className="p0-chip p0-chip-time">{act.time}</span>
                    <span className="p0-chip p0-chip-count">{aDone} / {aTotal}</span>
                  </div>
                  <span className={`p0-toggle${isOpen ? ' open' : ''}`}>▾</span>
                </div>

                <div className="p0-mini-track">
                  <div className="p0-mini-fill" style={{ width: `${aPct}%` }} />
                </div>

                {isOpen && (
                  <div className="p0-task-body">
                    <table className="p0-table">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}></th>
                          <th style={{ width: 60 }}>#</th>
                          <th>Task</th>
                          <th style={{ width: 140 }}>Owner</th>
                          <th style={{ width: 110 }}>Est. Time</th>
                          <th style={{ width: 110 }}>Prerequisites</th>
                          <th>Success Criteria</th>
                        </tr>
                      </thead>
                      <tbody>
                        {act.tasks.map(task => {
                          const isDone = done.has(task.id)
                          return (
                            <tr key={task.id} className={isDone ? 'p0-done' : ''}>
                              <td className="p0-check-cell">
                                <input
                                  type="checkbox"
                                  className="p0-check"
                                  checked={isDone}
                                  onChange={() => toggleTask(task.id)}
                                />
                              </td>
                              <td className="p0-task-id">{task.id.replace(/-/g, '.')}</td>
                              <td>
                                <span className="p0-task-label">
                                  {task.label}
                                  {task.detail && <em> ({task.detail})</em>}
                                </span>
                              </td>
                              <td className="p0-owner-val">{task.owner}</td>
                              <td className="p0-time-val">{task.time}</td>
                              <td className="p0-prereq-val">{task.prereq}</td>
                              <td className="p0-success-val">{task.success}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Dashboard */}
        <hr className="p0-divider" />
        <div className="p0-dashboard">
          <div className="p0-dash-title">📊 Phase 0 Summary Dashboard</div>
          <table className="p0-dash-table">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Activity</th>
                <th>Owner</th>
                <th>Est. Hours</th>
                <th>Sub-Tasks</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITIES.map(act => {
                const aDone = activityDone(act)
                const aPct = Math.round((aDone / act.tasks.length) * 100)
                return (
                  <tr key={act.id}>
                    <td>{act.title.split(' ').slice(0, 3).join(' ')}…</td>
                    <td>{act.id.replace(/-/g, '.')}</td>
                    <td className="p0-owner-val" style={{ fontSize: 12 }}>{act.owner}</td>
                    <td className="p0-time-val">{act.time}</td>
                    <td>{act.tasks.length}</td>
                    <td>
                      <div className="p0-dash-bar">
                        <div className="p0-dash-track">
                          <div className="p0-dash-fill" style={{ width: `${aPct}%` }} />
                        </div>
                        <span className="p0-dash-pct">{aPct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              <tr className="p0-dash-total">
                <td>TOTAL</td>
                <td>0.7 – 0.15</td>
                <td className="p0-owner-val" style={{ fontSize: 12 }}>All Roles</td>
                <td className="p0-time-val">~130.5 hrs</td>
                <td>49</td>
                <td>
                  <div className="p0-dash-bar">
                    <div className="p0-dash-track">
                      <div className="p0-dash-fill" style={{ width: `${masterPct}%` }} />
                    </div>
                    <span className="p0-dash-pct">{masterPct}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Info cards */}
        <div className="p0-info-grid">
          <div className="p0-info-card">
            <h3>⚠️ Critical Dependencies</h3>
            <ul>
              <li><code>0.7.2</code> Teaser Video must complete before <code>0.8.1</code> Figma Prototype</li>
              <li><code>0.12.5</code> Infographic must complete before <code>0.14.1</code> Landing Page</li>
              <li><code>0.8.5</code> and <code>0.10.5</code> must complete before <code>0.15.1</code> Master Matrix</li>
            </ul>
          </div>
          <div className="p0-info-card">
            <h3>🛠️ Tools Needed</h3>
            <ul>
              <li>Zoom / Google Meet — focus groups and interviews</li>
              <li>Otter.ai — transcription</li>
              <li>Figma — clickable prototype</li>
              <li>Google Forms + Excel — surveys &amp; analysis</li>
              <li>Carrd / Webflow — landing page</li>
              <li>Facebook Ads Manager + LinkedIn Campaign Manager</li>
            </ul>
          </div>
          <div className="p0-info-card">
            <h3>🛡️ Risk Mitigation</h3>
            <ul>
              <li>If parent recruitment is slow (0.7.3) → expand to Nextdoor app and local community centers</li>
              <li>If coaching centers don&apos;t respond (0.10.3) → offer a free 1-month trial as incentive</li>
              <li>If ad performance is poor (0.14.4) → pause and re-target with a different creative within 48 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAB controls */}
      <div className="p0-fab-group">
        <button className="p0-fab" onClick={expandAll}>⊞ Expand All</button>
        <button className="p0-fab" onClick={collapseAll}>⊟ Collapse All</button>
        <button className="p0-fab p0-fab-reset" onClick={resetAll}>↺ Reset Progress</button>
      </div>
    </div>
  )
}
