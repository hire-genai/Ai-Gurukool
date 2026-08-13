import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Survey data received:', body)

    const result = await prisma.surveyResponse.create({
      data: {
        q1: body.q1 || null,
        q2: body.q2 || null,
        q3: body.q3 || null,
        q4: body.q4 || null,
        q5: body.q5 || null,
        q6: body.q6 || null,
        q7: body.q7 || null,
        q8: body.q8 || null,
        q9: body.q9 || null,
        q10: body.q10 || null,
        q11: body.q11 || null,
        q12: body.q12 || null,
        q13: body.q13 || null,
        q14: body.q14 || null,
        q15: body.q15 || null,
      },
    })

    console.log('Survey saved with ID:', result.id)
    return NextResponse.json({ ok: true, id: result.id })
  } catch (e) {
    console.error('Error saving survey:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const total = await prisma.surveyResponse.count()
    console.log('Total survey responses:', total)

    if (total === 0) return NextResponse.json({ total: 0 })

    const topAnswer = async (col: 'q3' | 'q4' | 'q9' | 'q10' | 'q12') => {
      const raw = await prisma.surveyResponse.groupBy({
        by: [col],
        _count: true,
        orderBy: { _count: { [col]: 'desc' } },
        take: 5,
      })
      return raw.map(r => ({
        label: r[col] || 'N/A',
        count: r._count,
        pct: Math.round((r._count / total) * 100),
      }))
    }

    const trialYes = await prisma.surveyResponse.count({
      where: {
        q14: { in: ['Yes, 100%', 'Probably yes'] },
      },
    })

    return NextResponse.json({
      total,
      pain: await topAnswer('q3'),
      fears: await topAnswer('q10'),
      reaction: await topAnswer('q9'),
      spend: await topAnswer('q12'),
      doubts: await topAnswer('q4'),
      wantTrial: Math.round((trialYes / total) * 100),
    })
  } catch (e) {
    console.error('Error fetching survey stats:', e)
    return NextResponse.json({ total: 0 })
  }
}
