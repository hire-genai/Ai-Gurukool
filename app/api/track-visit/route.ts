import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'visits.json')

interface Store { count: number; seen: string[] }

function read(): Store {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')) } catch { return { count: 200, seen: [] } }
}
function save(s: Store) {
  fs.writeFileSync(FILE, JSON.stringify(s), 'utf-8')
}

export async function GET() {
  const { count } = read()
  return NextResponse.json({ count })
}

export async function POST(req: NextRequest) {
  const { vid } = await req.json().catch(() => ({ vid: '' }))
  if (!vid || typeof vid !== 'string' || vid.length > 64) {
    return NextResponse.json({ count: read().count })
  }
  const store = read()
  if (store.seen.includes(vid)) {
    return NextResponse.json({ count: store.count })
  }
  store.count += 1
  store.seen.push(vid)
  // keep seen list bounded (max 50k entries ≈ 3MB)
  if (store.seen.length > 50000) store.seen = store.seen.slice(-40000)
  save(store)
  return NextResponse.json({ count: store.count })
}
