'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCurrency, convertLabel } from '@/lib/currency'

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Role = 'parent' | 'student' | 'teacher'
type QType = 'radio' | 'checkbox' | 'scale' | 'text'

interface Question {
  cat: string
  id: string
  type: QType
  label: string
  required?: boolean
  options?: string[]
  max?: number
  min?: number
  minLabel?: string
  maxLabel?: string
}

interface Category { name: string; questions: Question[] }

type AnswerValue = string | string[]
type Answers = Record<string, AnswerValue>

/* ─── Question Banks (mirrors ai-gurukool-survey.html) ───────────────────── */
const PARENT: Question[] = [
  { cat: 'About You', id: 'p_relation', type: 'radio', label: 'Relationship to child?', required: true, options: ['Mother', 'Father', 'Guardian', 'Other'] },
  { cat: 'About You', id: 'p_age', type: 'checkbox', label: "Child's age group?", required: true, options: ['5-8', '9-12', '13-15', '16-18', '18+'] },
  { cat: 'About You', id: 'p_numkids', type: 'radio', label: 'Number of school-going children?', required: true, options: ['1', '2', '3+'] },
  { cat: 'About You', id: 'p_board', type: 'radio', label: 'Board/curriculum?', required: true, options: ['CBSE', 'ICSE', 'State Board', 'IB/IGCSE', 'Other', 'Not sure'] },
  { cat: 'About You', id: 'p_country', type: 'text', label: 'Country?', required: true },
  { cat: 'About You', id: 'p_city_name', type: 'text', label: 'City?', required: true },
  { cat: 'About You', id: 'p_income', type: 'radio', label: 'Monthly household income?', required: true, options: ['<₹50K', '₹50K–1L', '₹1L–2L', '₹2L–5L', '₹5L+', 'Prefer not to say'] },
  { cat: 'About You', id: 'p_source', type: 'radio', label: 'How did you hear about AI-Gurukool?', required: true, options: ['Friend/family', 'Social media', 'Google', 'WhatsApp', 'News/blog', 'Other'] },

  { cat: 'Current Schooling', id: 'p_school_type', type: 'radio', label: 'Which type of school does your child attend?', required: true, options: ['Private', 'Public', 'Homeschooling', 'International', 'Other'] },
  { cat: 'Current Schooling', id: 'p_total_spend', type: 'radio', label: 'Total monthly education spend?', required: true, options: ['<₹10K', '₹10–25K', '₹25–50K', '₹50K–1L', '₹1L+'] },
  { cat: 'Current Schooling', id: 'p_concerns', type: 'checkbox', label: 'Biggest education concerns? (pick up to 3)', required: true, max: 3, options: ['Personal attention', 'Slow syllabus', 'Rote learning', 'No feedback', 'High costs', 'Engagement', 'Career guidance', 'Mental health', 'Screen time', 'Teacher quality'] },
  { cat: 'Current Schooling', id: 'p_satisfaction', type: 'scale', label: 'Satisfaction with current schooling?', required: true, min: 1, max: 5, minLabel: 'Very dissatisfied', maxLabel: 'Very satisfied' },

  { cat: 'Tuition & Coaching', id: 'p_tuition', type: 'radio', label: 'Does child take tuition/coaching?', required: true, options: ['1-on-1 tutor', 'Coaching center', 'Online/app', 'Multiple', 'None', 'Planning to'] },
  { cat: 'Tuition & Coaching', id: 'p_tuition_subjects', type: 'checkbox', label: 'Subjects taken for tuition?', required: true, options: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi/Regional', 'Social Studies', 'CS/Coding', 'Commerce', 'Economics', 'Foreign Lang.', 'Art/Music', 'JEE/NEET', 'N/A'] },
  { cat: 'Tuition & Coaching', id: 'p_tuition_spend', type: 'radio', label: 'Monthly tuition spend per child?', required: true, options: ['N/A', '<₹1K', '₹1–3K', '₹3–5K', '₹5–10K', '₹10–20K', '₹20–50K', '₹50K+'] },
  { cat: 'Tuition & Coaching', id: 'p_tuition_hours', type: 'radio', label: 'Weekly tuition hours?', required: true, options: ['N/A', '<2h', '2–5h', '5–10h', '10–15h', '15h+'] },
  { cat: 'Tuition & Coaching', id: 'p_tuition_reason', type: 'checkbox', label: 'Why tuition?', required: true, options: ['Weak subject', 'School insufficient', 'Exam prep', 'Peer pressure', 'Homework help', 'Attention', 'Advanced', 'N/A'] },
  { cat: 'AI in Education', id: 'p_ai_fam', type: 'radio', label: 'Familiarity with AI in education?', required: true, options: ['Very familiar', 'Somewhat', 'Heard about it', 'Not familiar'] },
  { cat: 'AI in Education', id: 'p_ai_trust', type: 'radio', label: 'Trust AI teacher for child?', required: true, options: ['Yes completely', 'With oversight', 'Maybe', 'No', 'Definitely not'] },
  { cat: 'AI in Education', id: 'p_ai_comfort', type: 'checkbox', label: 'What builds comfort with AI teaching?', required: true, options: ['Parent portal', 'Progress reports', 'Human moderator', 'Data privacy', 'Recordings', 'Free trial', 'Reviews', 'Board cert.'] },
  { cat: 'AI in Education', id: 'p_ai_worries', type: 'checkbox', label: 'Biggest worries about AI?', required: true, options: ['No human touch', 'Screen time', 'Privacy', 'Wrong answers', 'Dependency', 'No worries'] },

  { cat: 'About AI-Gurukool', id: 'p_clarity', type: 'radio', label: "How clear is AI-Gurukool's value?", required: true, options: ['Crystal clear', 'Mostly clear', 'Somewhat unclear', 'Very unclear'] },
  { cat: 'About AI-Gurukool', id: 'p_appeal', type: 'checkbox', label: 'What appeals most? (pick up to 3)', required: true, max: 3, options: ['Personalised attention', 'Critical thinking', 'Faster syllabus', 'Parent visibility', 'Hybrid flex', 'Weekly reports', '20+ subjects', 'Cost savings', 'Nothing yet'] },
  { cat: 'About AI-Gurukool', id: 'p_concerns_ag', type: 'checkbox', label: 'Concerns about AI-Gurukool?', required: true, options: ['Cost', 'Screen time', 'AI quality', 'No peers', 'No classroom', 'Not board-cert.', 'Unproven', 'None'] },
  { cat: 'About AI-Gurukool', id: 'p_enroll', type: 'radio', label: 'Would you enroll your child?', required: true, options: ['Definitely yes', 'Probably yes', 'Not sure', 'Probably not', 'Definitely not'] },
  { cat: 'About AI-Gurukool', id: 'p_replace', type: 'radio', label: 'Would it replace current tuition?', required: true, options: ['Fully replace', 'Partially', 'Add on top', 'Not sure', 'No, keep'] },
  { cat: 'About AI-Gurukool', id: 'p_timeline', type: 'radio', label: 'How soon would you enroll?', required: true, options: ['Immediately', '1 month', '3 months', '6 months', 'Just exploring'] },
  { cat: 'About AI-Gurukool', id: 'p_trial', type: 'radio', label: 'Try a FREE 7-day trial?', required: true, options: ['Definitely', 'Probably', 'Not sure', 'No'] },

  { cat: 'Pricing Perception', id: 'p_price_cheap', type: 'radio', label: 'At what monthly price would AI-Gurukool be SO CHEAP that you\'d doubt its quality?', required: true, options: ['₹10K', '₹15K', '₹20K', '₹30K', '₹40K', '₹50K', '₹75K'] },
  { cat: 'Pricing Perception', id: 'p_price_bargain', type: 'radio', label: 'At what monthly price would AI-Gurukool be a BARGAIN — great value for money?', required: true, options: ['₹10K', '₹15K', '₹20K', '₹30K', '₹40K', '₹50K', '₹75K'] },
  { cat: 'Pricing Perception', id: 'p_price_expensive', type: 'radio', label: 'At what monthly price would it feel EXPENSIVE, but still worth considering?', required: true, options: ['₹15K', '₹20K', '₹30K', '₹40K', '₹50K', '₹75K', '₹1L'] },
  { cat: 'Pricing Perception', id: 'p_price_too', type: 'radio', label: 'At what monthly price would it be TOO EXPENSIVE to consider?', required: true, options: ['₹20K', '₹30K', '₹40K', '₹50K', '₹75K', '₹1L', '₹1.5L+'] },
  { cat: 'Pricing Perception', id: 'p_value', type: 'radio', label: 'Vs current tuition spend, AI-Gurukool is:', required: true, options: ['Much better', 'Better', 'Same', 'More expensive', 'Much more'] },

  { cat: 'Your Vision', id: 'p_vision', type: 'checkbox', label: "Vision for child's education? (pick up to 3)", required: true, max: 3, options: ['Confidence', 'Exam success', 'Critical thinking', 'Career prep', 'Creativity', 'Holistic', 'Global exposure', 'Emotional wellbeing'] },
  { cat: 'Your Vision', id: 'p_pmf', type: 'radio', label: "If AI-Gurukool didn't exist for your child?", required: true, options: ['Very disappointed', 'Somewhat', 'Not disappointed', 'N/A'] },
  { cat: 'Your Vision', id: 'p_recommend', type: 'radio', label: 'Recommend to other parents?', required: true, options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not'] },
  { cat: 'Your Vision', id: 'p_oneword', type: 'radio', label: 'One word for AI-Gurukool?', required: true, options: ['Innovative', 'Exciting', 'Promising', 'Interesting', 'Confusing', 'Risky', 'Unclear', 'Not for me'] },
]

const STUDENT: Question[] = [
  { cat: 'About You', id: 's_age', type: 'radio', label: 'Your age group?', required: true, options: ['5-8', '9-12', '13-15', '16-18', '19-22', '23-25', '25+'] },
  { cat: 'About You', id: 's_grade', type: 'radio', label: 'Grade/year?', required: true, options: ['KG', '1-2', '3-5', '6-8', '9-10', '11-12', 'College Y1', 'College Y2', 'College Y3+', 'Other'] },
  { cat: 'About You', id: 's_board', type: 'radio', label: 'Board/curriculum?', required: true, options: ['CBSE', 'ICSE', 'State Board', 'IB/IGCSE', 'College/Univ.', 'Other'] },
  { cat: 'About You', id: 's_country', type: 'text', label: 'Country?', required: true },
  { cat: 'About You', id: 's_city_name', type: 'text', label: 'City?', required: true },
  { cat: 'About You', id: 's_subjects', type: 'checkbox', label: 'Subjects you study?', required: true, options: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Regional', 'Social Studies', 'CS', 'Commerce', 'Economics', 'Art', 'Music', 'PE', 'Other'] },
  { cat: 'About You', id: 's_source', type: 'radio', label: 'How did you hear about us?', required: true, options: ['Friend', 'Parent', 'Teacher', 'Social media', 'Google', 'Other'] },

  { cat: 'Current Learning', id: 's_satisfaction', type: 'scale', label: 'Satisfaction with current schooling?', required: true, min: 1, max: 5, minLabel: 'Very dissatisfied', maxLabel: 'Very satisfied' },
  { cat: 'Current Learning', id: 's_problems', type: 'checkbox', label: 'Biggest problems now? (pick up to 3)', required: true, max: 3, options: ['Boring lectures', 'Memorisation', 'No attention', "Can't ask", 'Slow syllabus', 'Pressure', 'No real-world', 'No practical', 'Distractions', 'Weak teachers'] },
  { cat: 'Current Learning', id: 's_ideal', type: 'radio', label: 'Your ideal class feels like?', required: true, options: ['Interactive/fun', 'Personalised pace', 'Real-world', 'Deep learning', 'Fast-paced', 'Stress-free'] },

  { cat: 'Tuition & Coaching', id: 's_tuition', type: 'radio', label: 'Do you take tuition/coaching?', required: true, options: ['1-on-1 tutor', 'Coaching group', 'Online app', 'Multiple', 'None'] },
  { cat: 'Tuition & Coaching', id: 's_tuition_subjects', type: 'checkbox', label: 'Tuition subjects?', required: true, options: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi/Regional', 'Social Studies', 'CS/Coding', 'Commerce', 'Economics', 'JEE/NEET', 'Olympiad', 'Foreign Lang.', 'N/A'] },
  { cat: 'Tuition & Coaching', id: 's_tuition_spend', type: 'radio', label: 'Monthly tuition paid?', required: true, options: ["Don't know", 'N/A', '<₹1K', '₹1–3K', '₹3–5K', '₹5–10K', '₹10–20K', '₹20K+'] },
  { cat: 'Tuition & Coaching', id: 's_tuition_hours', type: 'radio', label: 'Weekly tuition hours?', required: true, options: ['N/A', '<2h', '2–5h', '5–10h', '10–15h', '15h+'] },
  { cat: 'Tuition & Coaching', id: 's_tuition_sat', type: 'scale', label: 'Tuition satisfaction? (skip if none)', min: 1, max: 5, minLabel: 'Very dissatisfied', maxLabel: 'Very satisfied' },
  { cat: 'Tuition & Coaching', id: 's_tuition_feel', type: 'radio', label: 'How do you feel about your tuition?', required: true, options: ['Love it', 'Somewhat helpful', 'Burden', 'Boring/forced', 'N/A'] },

  { cat: 'AI & Learning', id: 's_ai_used', type: 'radio', label: 'Used AI tools for studies?', required: true, options: ['Yes regularly', 'Yes a few times', 'No but want to', 'Not interested'] },
  { cat: 'AI & Learning', id: 's_ai_comfort', type: 'radio', label: 'Comfortable with AI teacher?', required: true, options: ['Love it', 'With human support', 'Maybe', 'Prefer humans', 'Definitely not'] },
  { cat: 'AI & Learning', id: 's_ai_help', type: 'checkbox', label: 'AI should help with? (pick up to 3)', required: true, max: 3, options: ['Explain concepts', 'Practice Qs', 'Study plan', 'Instant feedback', 'Career', 'Fun learning', 'Homework', 'Exam prep', '24/7 doubts'] },
  { cat: 'AI & Learning', id: 's_ai_worry', type: 'checkbox', label: 'Worries about AI learning?', required: true, options: ['Human interaction', 'Wrong answers', 'Boring', 'Screen fatigue', 'Parent approval', 'No concerns'] },

  { cat: 'About AI-Gurukool', id: 's_clarity', type: 'radio', label: 'How clear is AI-Gurukool?', required: true, options: ['Crystal clear', 'Mostly', 'Somewhat unclear', 'Very unclear'] },
  { cat: 'About AI-Gurukool', id: 's_want', type: 'radio', label: 'Want to learn at AI-Gurukool?', required: true, options: ['Definitely yes', 'Probably yes', 'Not sure', 'Probably not', 'Definitely not'] },
  { cat: 'About AI-Gurukool', id: 's_replace', type: 'radio', label: 'Replace current tuition?', required: true, options: ['Fully', 'Partially', 'Add to it', 'Not sure', 'No'] },
  { cat: 'About AI-Gurukool', id: 's_excites', type: 'checkbox', label: 'Excites you most? (pick up to 3)', required: true, max: 3, options: ['Own pace', 'Ask anytime', 'Personalised', 'Fun', '24/7', 'Multi-subject', 'Save money', 'Nothing'] },
  { cat: 'About AI-Gurukool', id: 's_concern', type: 'radio', label: 'Biggest worry about AI-Gurukool?', required: true, options: ['No humans', 'Screen time', 'AI quality', 'Peer/social', 'Not board-cert.', 'Cost', 'Nothing'] },

  { cat: 'Pricing & Vision', id: 's_price', type: 'radio', label: 'Fair monthly fee?', required: true, options: ['Free only', '<₹1K', '₹1–2K', '₹2–4K', '₹4–6K', '₹6K+'] },
  { cat: 'Pricing & Vision', id: 's_ask_parents', type: 'radio', label: 'Ask parents to pay?', required: true, options: ['Yes definitely', 'If trial impresses', 'Maybe', 'No'] },
  { cat: 'Pricing & Vision', id: 's_recommend', type: 'radio', label: 'Recommend to friends?', required: true, options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not'] },
  { cat: 'Pricing & Vision', id: 's_oneword', type: 'radio', label: 'One word for AI-Gurukool?', required: true, options: ['Cool', 'Fun', 'Innovative', 'Interesting', 'Confusing', 'Boring', 'Not for me'] },
]

const TEACHER: Question[] = [
  { cat: 'About You', id: 't_exp', type: 'radio', label: 'Years teaching?', required: true, options: ['0-2', '3-5', '6-10', '10-15', '15+'] },
  { cat: 'About You', id: 't_level', type: 'radio', label: 'Level you teach?', required: true, options: ['Primary K-5', 'Middle 6-8', 'High 9-12', 'College/Univ.', 'Coaching', 'Special Ed'] },
  { cat: 'About You', id: 't_employment', type: 'radio', label: 'Employment type?', required: true, options: ['Full-time school', 'Coaching faculty', 'Freelance tutor', 'Online tutor', 'Part-time', 'Other'] },
  { cat: 'About You', id: 't_country', type: 'text', label: 'Country?', required: true },
  { cat: 'About You', id: 't_city_name', type: 'text', label: 'City?', required: true },
  { cat: 'About You', id: 't_subjects', type: 'checkbox', label: 'Subjects you teach?', required: true, options: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Regional', 'Social Studies', 'CS', 'Commerce', 'Economics', 'Art', 'Music', 'PE', 'Other'] },
  { cat: 'About You', id: 't_board', type: 'checkbox', label: 'Boards you teach?', required: true, options: ['CBSE', 'ICSE', 'State Board', 'IB/IGCSE', 'University', 'Competitive'] },
  { cat: 'About You', id: 't_source', type: 'radio', label: 'How did you hear about us?', required: true, options: ['Colleague', 'Social media', 'LinkedIn', 'Job portal', 'Google', 'Other'] },

  { cat: 'Teaching Environment', id: 't_satisfaction', type: 'scale', label: 'Satisfaction with current environment?', required: true, min: 1, max: 5, minLabel: 'Very dissatisfied', maxLabel: 'Very satisfied' },
  { cat: 'Teaching Environment', id: 't_challenges', type: 'checkbox', label: 'Biggest challenges? (pick up to 3)', required: true, max: 3, options: ['Class sizes', 'Resources', 'Disengagement', 'Admin work', 'Slow curriculum', 'Parent expect.', 'Assessments', 'No PD', 'Low salary', 'Long hours'] },
  { cat: 'Teaching Environment', id: 't_change', type: 'radio', label: 'Best single change?', required: true, options: ['Smaller class', 'Better tech', 'Curriculum freedom', 'Personalised tools', 'Higher pay', 'Less admin', 'Prof. dev.'] },

  { cat: 'Private Tuition & Income', id: 't_tuition', type: 'radio', label: 'Do you provide private tuition?', required: true, options: ['1-on-1 home', 'Group at home', 'Online', 'Multiple', 'No'] },
  { cat: 'Private Tuition & Income', id: 't_tuition_subjects', type: 'checkbox', label: 'Subjects tutored privately?', required: true, options: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Regional', 'Social Studies', 'CS/Coding', 'Commerce', 'Economics', 'JEE/NEET', 'Olympiad', 'Foreign', 'N/A'] },
  { cat: 'Private Tuition & Income', id: 't_charge', type: 'radio', label: 'Charge per student/month?', required: true, options: ['N/A', '<₹1K', '₹1–3K', '₹3–5K', '₹5–10K', '₹10–20K', '₹20K+'] },
  { cat: 'Private Tuition & Income', id: 't_students', type: 'radio', label: 'Private students count?', required: true, options: ['None', '1–5', '6–10', '11–20', '20+'] },
  { cat: 'Private Tuition & Income', id: 't_hours', type: 'radio', label: 'Hours/week on tuition?', required: true, options: ['N/A', '<5h', '5–10h', '10–20h', '20–30h', '30h+'] },
  { cat: 'Private Tuition & Income', id: 't_income', type: 'radio', label: 'Total monthly income?', required: true, options: ['<₹20K', '₹20–40K', '₹40–75K', '₹75K–1.5L', '₹1.5L+', 'Prefer not'] },

  { cat: 'AI in Teaching', id: 't_ai_fam', type: 'radio', label: 'Familiarity with AI in education?', required: true, options: ['Very familiar', 'Somewhat', 'Heard of it', 'Not familiar'] },
  { cat: 'AI in Teaching', id: 't_ai_trust', type: 'radio', label: 'Trust AI as co-teacher?', required: true, options: ['Yes co-teacher', 'Admin only', 'Maybe', 'No', 'Definitely not'] },
  { cat: 'AI in Teaching', id: 't_ai_help', type: 'checkbox', label: 'AI should help with? (pick up to 3)', required: true, max: 3, options: ['Lesson plans', 'Auto-grading', 'Progress tracking', 'Practice Qs', 'Explaining', 'Class mgmt', 'Paperwork', 'Parent comm.', 'Content'] },
  { cat: 'AI in Teaching', id: 't_ai_concerns', type: 'checkbox', label: 'Concerns about AI in teaching?', required: true, options: ['Job loss', 'No human touch', 'Reduced role', 'Ethics', 'Lazy students', 'Wrong answers', 'No concerns'] },

  { cat: 'About AI-Gurukool', id: 't_clarity', type: 'radio', label: 'How clear is AI-Gurukool?', required: true, options: ['Crystal clear', 'Mostly', 'Somewhat unclear', 'Very unclear'] },
  { cat: 'About AI-Gurukool', id: 't_consider', type: 'radio', label: 'Consider teaching at AI-Gurukool?', required: true, options: ['Definitely yes', 'Probably yes', 'Not sure', 'Probably not', 'Definitely not'] },
  { cat: 'About AI-Gurukool', id: 't_attract', type: 'checkbox', label: 'What attracts you? (pick up to 3)', required: true, max: 3, options: ['Better pay', 'Flexible hours', 'Less admin', 'WFH', 'Innovation', 'Student reach', 'Recognition', 'Prof. dev.', 'Nothing'] },
  { cat: 'About AI-Gurukool', id: 't_concerns_ag', type: 'checkbox', label: 'Concerns about AI-Gurukool?', required: true, options: ['Job security', 'Pay vs current', 'Tech comfort', 'Startup risk', 'Working w/ AI', 'Student quality', 'None'] },

  { cat: 'Compensation & Vision', id: 't_comp', type: 'radio', label: 'Expected monthly compensation?', required: true, options: ['<₹25K', '₹25–50K', '₹50–75K', '₹75K–1L', '₹1–1.5L', '₹1.5L+'] },
  { cat: 'Compensation & Vision', id: 't_engagement', type: 'radio', label: 'Engagement type?', required: true, options: ['Full-time', 'Part-time', 'Hourly', 'Rev share', 'Flexible'] },
  { cat: 'Compensation & Vision', id: 't_fee', type: 'radio', label: 'Reasonable student fee?', required: true, options: ['₹2–4K', '₹4–6K', '₹6–8K', '₹8–10K', '₹10K+'] },
  { cat: 'Compensation & Vision', id: 't_vision', type: 'radio', label: 'Vision for future of education?', required: true, options: ['Personalised at scale', 'Blended AI+human', 'Skill-based', 'Global classes', 'Lifelong', 'Fundamentals'] },
  { cat: 'Compensation & Vision', id: 't_recommend', type: 'radio', label: 'Recommend to educators?', required: true, options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not'] },
  { cat: 'Compensation & Vision', id: 't_oneword', type: 'radio', label: 'One word for AI-Gurukool?', required: true, options: ['Innovative', 'Exciting', 'Promising', 'Threatening', 'Confusing', 'Risky', 'Interesting'] },
]

const BANKS: Record<Role, Question[]> = { parent: PARENT, student: STUDENT, teacher: TEACHER }

const COMPREHENSION_OPTIONS = [
  'AI-powered personalised learning platform',
  'Online school with AI teachers + human oversight',
  'A tuition/coaching alternative using AI',
  'A parent dashboard for tracking learning',
  'Not sure yet',
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function groupByCategory(questions: Question[]): Category[] {
  const map: Record<string, Question[]> = {}
  const order: string[] = []
  questions.forEach(q => {
    if (!map[q.cat]) { map[q.cat] = []; order.push(q.cat) }
    map[q.cat].push(q)
  })
  return order.map(name => ({ name, questions: map[name] }))
}

function isValidEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

function categoryReady(cat: Category, answers: Answers) {
  return cat.questions.every(q => {
    if (!q.required) return true
    const a = answers[q.id]
    if (q.type === 'checkbox') return Array.isArray(a) && a.length > 0
    return a !== undefined && a !== '' && a !== null
  })
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
interface SurveyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SurveyModal({ isOpen, onClose }: SurveyModalProps) {
  // step 0 = welcome, 1 = comprehension, 2 = role, 3..3+N-1 = categories, 3+N = contact, 3+N+1 = success
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role | null>(null)
  const [comprehension, setComprehension] = useState<string>('')
  const [answers, setAnswers] = useState<Answers>({})
  const [contact, setContact] = useState({ name: '', email: '', phone: '', interview: '', message: '' })
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [muted, setMuted] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [copied, setCopied] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const detectedCurrency = useCurrency()

  // Currency: if detected country is not India → USD
  const countryAnswer = String(answers['p_country'] || answers['s_country'] || answers['t_country'] || '')
  const currency = (countryAnswer && countryAnswer.toLowerCase() !== 'india') ? 'USD' : detectedCurrency

  const categories: Category[] = useMemo(
    () => (role ? groupByCategory(BANKS[role]) : []),
    [role]
  )
  const totalSteps = 3 + categories.length + 2 // welcome, comp, role, cats, contact, success

  useEffect(() => {
    if (isOpen) {
      setStep(0); setRole(null); setComprehension(''); setAnswers({})
      setContact({ name: '', email: '', phone: '', interview: '', message: '' })
      setContactErrors({}); setSubmitting(false); setSubmitError(''); setMuted(false)
      setAutoAdvance(true); setCopied(false)
      // Auto-detect country + city via IP geolocation
      setLocationLoading(true)
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then((d: { country_name?: string; city?: string }) => {
          const country = d.country_name || ''
          const city = d.city || ''
          if (country) setAnswers(prev => ({
            ...prev,
            p_country: country, s_country: country, t_country: country,
            p_city_name: city, s_city_name: city, t_city_name: city,
          }))
        })
        .catch(() => {})
        .finally(() => setLocationLoading(false))
    }
  }, [isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])


  // Attempt to play with sound on welcome step; fall back to muted if blocked
  useEffect(() => {
    if (step === 0 && videoRef.current) {
      const v = videoRef.current
      v.muted = false; v.volume = 1
      v.play().catch(() => { v.muted = true; setMuted(true) })
    }
  }, [step])

  // Auto-advance: when current category / step is complete, move forward automatically
  useEffect(() => {
    if (!isOpen || !autoAdvance) return
    // Comprehension step
    if (step === 1 && comprehension) {
      const t = setTimeout(() => setStep(s => (s === 1 ? 2 : s)), 320)
      return () => clearTimeout(t)
    }
    // Category steps
    if (step >= 3 && role) {
      const idx = step - 3
      if (idx >= 0 && idx < categories.length) {
        const cat = categories[idx]
        if (categoryReady(cat, answers)) {
          const t = setTimeout(() => setStep(s => (s === 3 + idx ? s + 1 : s)), 380)
          return () => clearTimeout(t)
        }
      }
    }
  }, [answers, comprehension, step, autoAdvance, isOpen, role, categories])

  if (!isOpen) return null

  const catIdx = step - 3
  const currentCategory: Category | null =
    catIdx >= 0 && catIdx < categories.length ? categories[catIdx] : null
  const isContactStep = role !== null && step === 3 + categories.length
  const isSuccessStep = role !== null && step === 3 + categories.length + 1

  const progressPct = Math.min(100, Math.round((step / Math.max(1, totalSteps - 1)) * 100))

  function setAnswer(id: string, val: AnswerValue) {
    setAnswers(prev => ({ ...prev, [id]: val }))
    setAutoAdvance(true)
  }

  function toggleCheckbox(q: Question, opt: string) {
    const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).slice() : []
    const idx = cur.indexOf(opt)
    if (idx >= 0) cur.splice(idx, 1)
    else {
      if (q.max && cur.length >= q.max) return
      cur.push(opt)
    }
    setAnswer(q.id, cur)
  }

  function goNext() {
    if (step === 1 && !comprehension) return
    if (step === 2 && !role) return
    if (currentCategory && !categoryReady(currentCategory, answers)) return
    setAutoAdvance(false)
    setStep(s => s + 1)
  }

  function goPrev() {
    if (step === 0) return
    setAutoAdvance(false)
    setStep(s => s - 1)
  }

  function selectRole(r: Role) {
    setRole(r)
    setAutoAdvance(true)
    setStep(3)
  }

  function pickComprehension(v: string) {
    setComprehension(v)
    setAutoAdvance(true)
  }

  async function submitSurvey() {
    const errs: Record<string, string> = {}
    if (!contact.email.trim()) errs.email = 'Email is required.'
    else if (!isValidEmail(contact.email.trim())) errs.email = 'Please enter a valid email.'
    if (!contact.interview) errs.interview = 'Please answer this question.'
    setContactErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true); setSubmitError('')
    try {
      const payload = {
        role,
        comprehension,
        answers,
        contact: {
          name: contact.name.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          interview: contact.interview,
          message: contact.message.trim(),
        },
      }
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.ok) setStep(3 + categories.length + 1)
      else setSubmitError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── Renderers ──────────────────────────────────────────────────────── */
  let eyebrow = ''
  let title = ''
  if (step === 0) { eyebrow = 'Step 1'; title = 'Watch the intro' }
  else if (step === 1) { eyebrow = 'Quick check'; title = 'What is AI-Gurukool?' }
  else if (step === 2) { eyebrow = 'Choose your role'; title = 'I am a…' }
  else if (currentCategory) { eyebrow = `Section ${catIdx + 1} of ${categories.length}`; title = currentCategory.name }
  else if (isContactStep) { eyebrow = 'Almost done 🎉'; title = 'Your contact details' }
  else if (isSuccessStep) { eyebrow = 'Complete'; title = 'Thank you!' }

  return (
    <div className="svy-overlay">
      <div className={`svy-card${step >= 1 && !isSuccessStep ? ' svy-card-full' : ''}`} onClick={e => e.stopPropagation()}>

        <div className="svy-progress">
          <div className="svy-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {!isSuccessStep && (
          <div className="svy-header">
            <div className="svy-header-text">
              <div className="svy-eyebrow">{eyebrow}</div>
              <div className="svy-title">{title}</div>
            </div>
            <button className="svy-close" onClick={onClose} aria-label="Close survey">✕</button>
          </div>
        )}

        <div className="svy-body">
          {/* Welcome + video */}
          {step === 0 && (
            <div>
              <div className="svy-q-label" style={{ textAlign: 'center', marginBottom: 10 }}>
                Please watch this short video about AI-Gurukool 🙏
              </div>
              <div className="svy-video-wrap">
                <video
                  ref={videoRef}
                  src="/hero.mp4"
                  autoPlay
                  playsInline
                  controls
                />
                <button
                  className="svy-mute-btn"
                  type="button"
                  onClick={() => {
                    const v = videoRef.current; if (!v) return
                    v.muted = !v.muted; setMuted(v.muted)
                  }}
                >{muted ? '🔇 Unmute' : '🔊 Mute'}</button>
              </div>
              <div className="svy-info-box">⏱️ Takes ~5 minutes • Your feedback shapes the future of learning</div>
            </div>
          )}

          {/* Comprehension */}
          {step === 1 && (
            <div className="svy-q">
              <div className="svy-q-label">
                Which best describes AI-Gurukool from the video? <span className="svy-required">*</span>
              </div>
              <div className="svy-chips">
                {COMPREHENSION_OPTIONS.map(o => (
                  <button
                    key={o}
                    type="button"
                    className={`svy-chip${comprehension === o ? ' active' : ''}`}
                    onClick={() => pickComprehension(o)}
                  >{o}</button>
                ))}
              </div>
            </div>
          )}

          {/* Role */}
          {step === 2 && (
            <div className="svy-role-grid">
              {([
                { r: 'parent'  as Role, icon: '👨‍👩‍👧', label: 'Parent',  sub: 'I have a child in school' },
                { r: 'student' as Role, icon: '🎓',      label: 'Student', sub: 'I am currently studying' },
                { r: 'teacher' as Role, icon: '👩‍🏫',    label: 'Teacher', sub: 'I teach or tutor students' },
              ]).map(({ r, icon, label, sub }) => (
                <button
                  key={r}
                  className={`svy-role-btn${role === r ? ' active' : ''}`}
                  onClick={() => selectRole(r)}
                >
                  <span className="svy-role-icon">{icon}</span>
                  <span>
                    <span className="svy-role-label">{label}</span>
                    <span className="svy-role-sub" style={{ display: 'block' }}>{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Category questions */}
          {currentCategory && (() => {
            const qs = currentCategory.questions
            const items: Array<Question | [Question, Question]> = []
            let qi = 0
            while (qi < qs.length) {
              if (qs[qi].type === 'text' && qi + 1 < qs.length && qs[qi + 1].type === 'text') {
                items.push([qs[qi], qs[qi + 1]]); qi += 2
              } else {
                items.push(qs[qi]); qi++
              }
            }

            const renderQ = (q: Question) => {
              const val = answers[q.id]
              return (
                <div key={q.id} className="svy-q" style={q.type === 'text' ? { flex: 1, minWidth: 0 } : {}}>
                  <div className="svy-q-label">
                    {q.label}
                    {q.required
                      ? <span className="svy-required">*</span>
                      : <span className="svy-optional">optional</span>}
                    {q.type === 'checkbox' && (
                      <span className="svy-optional" style={{ marginLeft: 8 }}>
                        {q.max ? `Pick up to ${q.max}` : 'Select all that apply'}
                      </span>
                    )}
                  </div>

                  {q.type === 'radio' && (
                    <div className="svy-chips">
                      {q.options!.map(o => (
                        <button
                          key={o}
                          type="button"
                          className={`svy-chip${val === o ? ' active' : ''}`}
                          onClick={() => setAnswer(q.id, o)}
                        >{convertLabel(o, currency)}</button>
                      ))}
                    </div>
                  )}

                  {q.type === 'checkbox' && (
                    <div className="svy-chips">
                      {q.options!.map(o => {
                        const arr = Array.isArray(val) ? val : []
                        return (
                          <button
                            key={o}
                            type="button"
                            className={`svy-chip${arr.includes(o) ? ' active' : ''}`}
                            onClick={() => toggleCheckbox(q, o)}
                          >{convertLabel(o, currency)}</button>
                        )
                      })}
                    </div>
                  )}

                  {q.type === 'text' && (
                    <input
                      className="svy-input"
                      type="text"
                      placeholder={q.id.includes('country') ? 'e.g. India' : 'e.g. Mumbai'}
                      value={String(val || '')}
                      onChange={e => setAnswer(q.id, e.target.value)}
                    />
                  )}

                  {q.type === 'scale' && (
                    <div>
                      <div className="svy-scale">
                        {Array.from({ length: (q.max! - q.min! + 1) }, (_, i) => {
                          const v = String(q.min! + i)
                          return (
                            <button
                              key={v}
                              type="button"
                              className={`svy-scale-chip${String(val) === v ? ' active' : ''}`}
                              onClick={() => setAnswer(q.id, v)}
                            >{v}</button>
                          )
                        })}
                      </div>
                      <div className="svy-scale-labels">
                        <span className="svy-scale-lbl">{q.minLabel}</span>
                        <span className="svy-scale-lbl">{q.maxLabel}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div>
                {items.map((item, idx) =>
                  Array.isArray(item)
                    ? <div key={idx} style={{ display: 'flex', gap: 12 }}>{item.map(renderQ)}</div>
                    : renderQ(item)
                )}
              </div>
            )
          })()}

          {/* Contact */}
          {isContactStep && (
            <div className="svy-contact">
              <p className="svy-contact-intro">Share your details so we can keep you posted and follow up if needed.</p>
              <div className="svy-q">
                <div className="svy-q-label">Email <span className="svy-required">*</span></div>
                <input
                  className="svy-input"
                  type="email"
                  placeholder="you@example.com"
                  value={contact.email}
                  onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                />
                {contactErrors.email && <div className="svy-error">{contactErrors.email}</div>}
              </div>
              <div className="svy-q">
                <div className="svy-q-label">Full Name <span className="svy-optional">optional</span></div>
                <input
                  className="svy-input"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={contact.name}
                  onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="svy-q">
                <div className="svy-q-label">Phone / WhatsApp <span className="svy-optional">optional</span></div>
                <input
                  className="svy-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={contact.phone}
                  onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
                />
              </div>
              <div className="svy-q">
                <div className="svy-q-label">
                  Available for a 15-min follow-up interview? <span className="svy-required">*</span>
                </div>
                <div className="svy-chips">
                  {['Yes', 'No'].map(o => (
                    <button
                      key={o}
                      type="button"
                      className={`svy-chip${contact.interview === o ? ' active' : ''}`}
                      onClick={() => setContact(c => ({ ...c, interview: o }))}
                    >{o}</button>
                  ))}
                </div>
                {contactErrors.interview && <div className="svy-error">{contactErrors.interview}</div>}
              </div>
              <div className="svy-q">
                <div className="svy-q-label">Any message for us? <span className="svy-optional">optional</span></div>
                <textarea
                  className="svy-input"
                  rows={3}
                  placeholder="Your thoughts, suggestions, or questions…"
                  value={contact.message}
                  onChange={e => setContact(c => ({ ...c, message: e.target.value }))}
                  style={{ resize: 'none' }}
                />
              </div>
              <p className="svy-privacy-note">🔒 Your details are kept private and never shared with third parties.</p>
            </div>
          )}

          {/* Success */}
          {isSuccessStep && (() => {
            const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ai-gurukool.vercel.app'
            const shareText = 'Check out AI-Gurukool — personalised AI learning for every child.'
            const enc = (s: string) => encodeURIComponent(s)
            const shares = [
              { label: 'WhatsApp',  icon: '📱', href: `https://wa.me/?text=${enc(shareText + ' ' + siteUrl)}` },
              { label: 'Telegram',  icon: '✈️', href: `https://t.me/share/url?url=${enc(siteUrl)}&text=${enc(shareText)}` },
              { label: 'Twitter',   icon: '🐦', href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(siteUrl)}` },
              { label: 'LinkedIn',  icon: '💼', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(siteUrl)}` },
              { label: 'Facebook',  icon: '📘', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(siteUrl)}` },
            ]
            const copyLink = async () => {
              try { await navigator.clipboard.writeText(siteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
            }
            return (
              <div className="svy-success">
                <div className="svy-success-icon">🎉</div>
                <h3>Thank you! Your voice matters.</h3>
                <p>Your responses go directly into shaping AI-Gurukool. Help us reach more people 🚀</p>

                <video
                  src="/survey.mp4"
                  autoPlay
                  playsInline
                  controls
                  style={{ width: '100%', borderRadius: 16, marginBottom: 24, maxHeight: 420, objectFit: 'cover', display: 'block' }}
                />

                <div className="svy-share-title">Share AI-Gurukool</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                  {shares.map(s => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={s.label}
                      style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, textDecoration: 'none', transition: 'background .2s' }}
                    >{s.icon}</a>
                  ))}
                  <button
                    type="button"
                    title="Copy link"
                    onClick={copyLink}
                    style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', transition: 'background .2s' }}
                  >{copied ? '✅' : '🔗'}</button>
                </div>

                <button className="svy-btn-next" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
              </div>
            )
          })()}
        </div>

        {submitError && <div className="svy-submit-err">{submitError}</div>}

        {!isSuccessStep && (
          <div className="svy-footer">
            <div className="svy-step-info">
              {role && currentCategory && `${role.charAt(0).toUpperCase() + role.slice(1)} · ${currentCategory.name}`}
              {isContactStep && 'Final step'}
            </div>
            <div className="svy-footer-btns">
              {step > 0 && <button className="svy-btn-back" onClick={goPrev}>← Back</button>}
              {isContactStep ? (
                <button className="svy-btn-next" onClick={submitSurvey} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit ✓'}
                </button>
              ) : step !== 2 ? (
                <button
                  className="svy-btn-next"
                  onClick={goNext}
                  disabled={
                    (step === 1 && !comprehension) ||
                    (!!currentCategory && !categoryReady(currentCategory, answers))
                  }
                >Next →</button>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
