import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/* POST — save one survey response */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO survey_responses (q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15)
      VALUES (@q1,@q2,@q3,@q4,@q5,@q6,@q7,@q8,@q9,@q10,@q11,@q12,@q13,@q14,@q15)
    `)
    const info = stmt.run({
      q1: body.q1 || null, q2: body.q2 || null, q3: body.q3 || null,
      q4: body.q4 || null, q5: body.q5 || null, q6: body.q6 || null,
      q7: body.q7 || null, q8: body.q8 || null, q9: body.q9 || null,
      q10: body.q10 || null, q11: body.q11 || null, q12: body.q12 || null,
      q13: body.q13 || null, q14: body.q14 || null, q15: body.q15 || null,
    })
    return NextResponse.json({ ok: true, id: info.lastInsertRowid })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/* GET — return aggregated stats for landing page graphs */
export async function GET() {
  try {
    const db = getDb()
    const total = (db.prepare('SELECT COUNT(*) as n FROM survey_responses').get() as { n: number }).n
    if (total === 0) return NextResponse.json({ total: 0 })

    const topAnswer = (col: string) => {
      const rows = db.prepare(
        `SELECT ${col} as val, COUNT(*) as n FROM survey_responses
         WHERE ${col} IS NOT NULL GROUP BY ${col} ORDER BY n DESC LIMIT 5`
      ).all() as { val: string; n: number }[]
      return rows.map(r => ({ label: r.val, count: r.n, pct: Math.round((r.n / total) * 100) }))
    }

    const trialYes = (db.prepare(
      `SELECT COUNT(*) as n FROM survey_responses WHERE q14 IN ('Yes, 100%','Probably yes')`
    ).get() as { n: number }).n

    return NextResponse.json({
      total,
      pain:     topAnswer('q3'),
      fears:    topAnswer('q10'),
      reaction: topAnswer('q9'),
      spend:    topAnswer('q12'),
      doubts:   topAnswer('q4'),
      wantTrial: Math.round((trialYes / total) * 100),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ total: 0 })
  }
}
