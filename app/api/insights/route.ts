import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function topN(map: Record<string, number>, n: number) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }))
}

export async function GET() {
  try {
    const responses = await prisma.surveyResponse.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const total = responses.length
    const byRole = { parent: 0, student: 0, teacher: 0 }

    const trustAI: Record<string, number> = {}
    const enrollment: Record<string, number> = {}
    const price: Record<string, number> = {}
    const concerns: Record<string, number> = {}
    const familiarity: Record<string, number> = {}
    const appeals: Record<string, number> = {}
    const recommend: Record<string, number> = {}
    const satisfaction: number[] = []

    for (const r of responses) {
      const role = r.role as 'parent' | 'student' | 'teacher'
      if (role in byRole) byRole[role]++

      let answers: Record<string, unknown> = {}
      try { answers = JSON.parse(r.answers) } catch { /* skip malformed */ }

      // Trust AI
      const trust = (answers.p_trustAI || answers.s_trustAI || answers.t_trustAI) as string
      if (trust) trustAI[trust] = (trustAI[trust] || 0) + 1

      // Enrollment intent
      const enroll = (answers.p_enroll || answers.s_enroll || answers.t_enroll) as string
      if (enroll) enrollment[enroll] = (enrollment[enroll] || 0) + 1

      // Price willingness
      const p = (answers.p_price || answers.s_price || answers.t_price) as string
      if (p) price[p] = (price[p] || 0) + 1

      // Satisfaction (1–10 scale)
      const sat = (answers.p_satisfaction || answers.s_satisfaction || answers.t_satisfaction) as string
      if (sat) satisfaction.push(parseInt(sat, 10))

      // AI Familiarity
      const fam = (answers.p_aiFamiliarity || answers.s_aiFamiliarity || answers.t_aiFamiliarity) as string
      if (fam) familiarity[fam] = (familiarity[fam] || 0) + 1

      // Recommend
      const rec = (answers.p_recommend || answers.s_recommend || answers.t_recommend) as string
      if (rec) recommend[rec] = (recommend[rec] || 0) + 1

      // Pain points + education concerns (multi-select)
      const eduConcerns  = Array.isArray(answers.p_eduConcern) ? answers.p_eduConcern as string[] : []
      const parentPain   = Array.isArray(answers.p_painPoints) ? answers.p_painPoints as string[] : []
      const studentPain  = Array.isArray(answers.s_painPoints) ? answers.s_painPoints as string[] : []
      const teacherPain  = Array.isArray(answers.t_painPoints) ? answers.t_painPoints as string[] : []
      for (const c of [...eduConcerns, ...parentPain, ...studentPain, ...teacherPain]) {
        concerns[c] = (concerns[c] || 0) + 1
      }

      // What appeals most / AI benefits / AI use
      const reason     = Array.isArray(answers.p_reason)     ? answers.p_reason as string[]     : []
      const aiBenefits = Array.isArray(answers.s_aiBenefits) ? answers.s_aiBenefits as string[] : []
      const aiUse      = Array.isArray(answers.t_aiUse)      ? answers.t_aiUse as string[]      : []
      for (const a of [...reason, ...aiBenefits, ...aiUse]) {
        appeals[a] = (appeals[a] || 0) + 1
      }
    }

    const avgSat = satisfaction.length > 0
      ? Math.round((satisfaction.reduce((a, b) => a + b, 0) / satisfaction.length) * 10) / 10
      : 0

    return NextResponse.json({
      total,
      byRole,
      trustAI:    topN(trustAI, 10),
      enrollment: topN(enrollment, 10),
      price:      topN(price, 10),
      concerns:   topN(concerns, 8),
      familiarity: topN(familiarity, 10),
      appeals:    topN(appeals, 8),
      recommend:  topN(recommend, 10),
      avgSatisfaction: avgSat,
      satisfactionCount: satisfaction.length,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[insights GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
