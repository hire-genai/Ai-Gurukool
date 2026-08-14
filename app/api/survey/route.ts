import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { role, answers, contact } = body
    if (!role || !['parent', 'student', 'teacher'].includes(role)) {
      return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 })
    }
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid answers' }, { status: 400 })
    }
    const record = await prisma.surveyResponse.create({
      data: {
        role,
        answers: JSON.stringify(answers),
        name:  contact?.name?.trim()  || '',
        email: contact?.email?.trim() || '',
        phone: contact?.phone?.trim() || '',
      },
    })
    return NextResponse.json({ ok: true, id: record.id })
  } catch (err) {
    console.error('[survey POST]', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
