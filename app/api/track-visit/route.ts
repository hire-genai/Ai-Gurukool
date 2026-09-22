import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const BASE = 200 // seed offset

export async function GET() {
  const count = await prisma.visitor.count()
  return NextResponse.json({ count: BASE + count })
}

export async function POST(req: NextRequest) {
  const { vid } = await req.json().catch(() => ({ vid: '' }))
  if (!vid || typeof vid !== 'string' || vid.length > 64) {
    const count = await prisma.visitor.count()
    return NextResponse.json({ count: BASE + count })
  }
  try {
    await prisma.visitor.create({ data: { id: vid } })
  } catch {
    // duplicate id = visitor already counted, ignore
  }
  const count = await prisma.visitor.count()
  return NextResponse.json({ count: BASE + count })
}
