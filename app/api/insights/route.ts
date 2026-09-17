import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

type Bucket = Record<string, number>

function bump(m: Bucket, k?: unknown) {
  if (typeof k !== 'string' || !k) return
  m[k] = (m[k] || 0) + 1
}
function bumpArr(m: Bucket, arr: unknown) {
  if (!Array.isArray(arr)) return
  for (const v of arr) bump(m, v)
}
function ordered(m: Bucket, order?: string[]) {
  if (order) return order.map(label => ({ label, count: m[label] || 0 }))
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
}
function topN(m: Bucket, n: number) {
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }))
}

export async function GET() {
  try {
    const responses = await prisma.surveyResponse.findMany({ orderBy: { createdAt: 'desc' } })
    const total = responses.length
    const byRole: Bucket = { parent: 0, student: 0, teacher: 0 }

    // per-question buckets
    const city: Bucket = {}
    const board: Bucket = {}
    const income: Bucket = {}
    const source: Bucket = {}
    const familiarity: Bucket = {}
    const trustAI: Bucket = {}
    const worries: Bucket = {}
    const comfort: Bucket = {}
    const clarity: Bucket = {}
    const comprehension: Bucket = {}
    const pmf: Bucket = {}
    const enroll: Bucket = {}
    const timeline: Bucket = {}
    const trial: Bucket = {}
    const appeal: Bucket = {}
    const replace: Bucket = {}
    const subjects: Bucket = {}
    const tuitionReason: Bucket = {}
    const platforms: Bucket = {}
    const currentSpend: Bucket = {}
    const fairPrice: Bucket = {}
    const priceCheap: Bucket = {}
    const priceBargain: Bucket = {}
    const priceExpensive: Bucket = {}
    const priceTooMuch: Bucket = {}
    const studentProblems: Bucket = {}
    const teacherAttract: Bucket = {}
    const teacherComp: Bucket = {}
    const teacherEngage: Bucket = {}
    const recommend: Bucket = {}
    const oneword: Bucket = {}
    const interview: Bucket = {}
    const satisfaction: number[] = []

    for (const r of responses) {
      const role = r.role as 'parent' | 'student' | 'teacher'
      if (role in byRole) byRole[role]++

      let a: Record<string, unknown> = {}
      try { a = JSON.parse(r.answers) } catch { continue }

      bump(city, a.p_city || a.s_city || a.t_city)
      // teacher board is multi, parent/student single
      if (Array.isArray(a.t_board)) bumpArr(board, a.t_board); else bump(board, a.t_board)
      bump(board, a.p_board); bump(board, a.s_board)
      bump(income, a.p_income)
      bump(source, a.p_source || a.s_source || a.t_source)
      bump(familiarity, a.p_ai_fam || a.t_ai_fam || a.s_ai_used)
      bump(trustAI, a.p_ai_trust || a.t_ai_trust || a.s_ai_comfort)
      bumpArr(worries, a.p_ai_worries); bumpArr(worries, a.s_ai_worry); bumpArr(worries, a.t_ai_concerns)
      bumpArr(comfort, a.p_ai_comfort)
      bump(clarity, a.p_clarity || a.s_clarity || a.t_clarity)
      bump(comprehension, a.__comprehension)
      bump(pmf, a.p_pmf)
      bump(enroll, a.p_enroll || a.s_want || a.t_consider)
      bump(timeline, a.p_timeline)
      bump(trial, a.p_trial)
      bumpArr(appeal, a.p_appeal); bumpArr(appeal, a.s_excites); bumpArr(appeal, a.t_attract)
      bump(replace, a.p_replace || a.s_replace)
      bumpArr(subjects, a.p_tuition_subjects); bumpArr(subjects, a.s_tuition_subjects); bumpArr(subjects, a.t_tuition_subjects)
      bumpArr(tuitionReason, a.p_tuition_reason)
      bumpArr(platforms, a.p_platforms)
      bump(currentSpend, a.p_tuition_spend || a.s_tuition_spend)
      bump(fairPrice, a.s_price || a.t_fee)
      bump(priceCheap, a.p_price_cheap)
      bump(priceBargain, a.p_price_bargain)
      bump(priceExpensive, a.p_price_expensive)
      bump(priceTooMuch, a.p_price_too)
      bumpArr(studentProblems, a.s_problems)
      bumpArr(teacherAttract, a.t_attract)
      bump(teacherComp, a.t_comp)
      bump(teacherEngage, a.t_engagement)
      bump(recommend, a.p_recommend || a.s_recommend || a.t_recommend)
      bump(oneword, a.p_oneword || a.s_oneword || a.t_oneword)
      bump(interview, a.__interview)

      const sat = a.p_satisfaction || a.s_satisfaction || a.t_satisfaction
      if (sat) { const n = parseInt(String(sat), 10); if (!isNaN(n)) satisfaction.push(n) }
    }

    const avgSat = satisfaction.length
      ? Math.round((satisfaction.reduce((a, b) => a + b, 0) / satisfaction.length) * 10) / 10
      : 0

    return NextResponse.json({
      total,
      byRole,
      city:            ordered(city, ['Metro', 'Tier 1', 'Tier 2', 'Tier 3', 'Rural', 'Outside India']),
      board:           topN(board, 8),
      income:          ordered(income, ['<₹50K', '₹50K–1L', '₹1L–2L', '₹2L–5L', '₹5L+', 'Prefer not to say']),
      source:          topN(source, 8),
      familiarity:     topN(familiarity, 6),
      trustAI:         topN(trustAI, 6),
      worries:         topN(worries, 8),
      comfort:         topN(comfort, 10),
      clarity:         topN(clarity, 5),
      comprehension:   topN(comprehension, 5),
      pmf:             topN(pmf, 5),
      enrollment:      topN(enroll, 6),
      timeline:        topN(timeline, 6),
      trial:           topN(trial, 5),
      appeal:          topN(appeal, 10),
      replace:         topN(replace, 6),
      subjects:        topN(subjects, 12),
      tuitionReason:   topN(tuitionReason, 8),
      platforms:       topN(platforms, 10),
      currentSpend:    topN(currentSpend, 8),
      fairPrice:       topN(fairPrice, 8),
      priceCheap:      topN(priceCheap, 6),
      priceBargain:    topN(priceBargain, 6),
      priceExpensive:  topN(priceExpensive, 6),
      priceTooMuch:    topN(priceTooMuch, 6),
      studentProblems: topN(studentProblems, 10),
      teacherAttract:  topN(teacherAttract, 10),
      teacherComp:     topN(teacherComp, 8),
      teacherEngage:   topN(teacherEngage, 6),
      recommend:       topN(recommend, 5),
      oneword:         topN(oneword, 12),
      interview:       topN(interview, 3),
      avgSatisfaction: avgSat,
      satisfactionCount: satisfaction.length,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[insights GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
