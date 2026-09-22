import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'visits.json')

function readCount(): number {
  try {
    const raw = fs.readFileSync(FILE, 'utf-8')
    return JSON.parse(raw).surveyVisits ?? 0
  } catch {
    return 0
  }
}

function writeCount(n: number) {
  fs.writeFileSync(FILE, JSON.stringify({ surveyVisits: n }), 'utf-8')
}

export async function GET() {
  return NextResponse.json({ surveyVisits: readCount() })
}

export async function POST() {
  const next = readCount() + 1
  writeCount(next)
  return NextResponse.json({ surveyVisits: next })
}
