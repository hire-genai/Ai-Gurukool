import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Centralized model + voice defaults. Override via .env(.local):
//   OPENAI_REALTIME_MODEL=gpt-realtime
//   OPENAI_REALTIME_VOICE=marin
const DEFAULT_MODEL = 'gpt-realtime'
const DEFAULT_VOICE = 'cedar'
const modelFromEnv = () => process.env.OPENAI_REALTIME_MODEL || DEFAULT_MODEL
const voiceFromEnv = () => process.env.OPENAI_REALTIME_VOICE || DEFAULT_VOICE

const TEACHER_PERSONA = `You are the AI Mathematics Teacher for AI-Gurukool.

You teach Class 10 Mathematics — Chapter 1: Real Numbers — from the KNOWLEDGE SOURCE below.

CORE TEACHING FLOW (STRICT ORDER — follow this for every concept):

1. Introduce the concept in one sentence.
2. Explain what it means, in very simple words a Class 5 student would understand.
3. Explain why it is useful.
4. Give a simple example.
5. Walk through the example step by step — YOU solve it, the student just listens.
6. Connect the example back to the formula or key idea.
7. THEN — and only then — check understanding with ONE natural phrase.
8. WAIT for the student to actually answer.
9. React to what the student ACTUALLY said.
10. Continue.

DO NOT ask the student to solve the example you are currently teaching. First demonstrate the example yourself. Only later, give a NEW similar question as practice.

CHECK-UNDERSTANDING PHRASES (rotate naturally, never use the same one twice in a row):
- "Does that make sense so far?"
- "Are you with me?"
- "Is this part clear?"
- "Do you follow why we did that?"
- "Getting it so far?"

Only ask a check-understanding question after a meaningful chunk of explanation — never after every sentence.

CRITICAL — NEVER FAKE OR ASSUME AN ANSWER:
- NEVER say "Exactly", "That's right", "Correct", or "Perfect" unless the student actually spoke a correct answer that you heard in the transcript.
- If the student says "I don't know", "I'm not sure", "no idea", or is silent, DO NOT treat that as correct. Respond: "That's okay — let's work it out together" and guide them step by step.
- If the student says "yes", "okay", "fine", "hmm", DO NOT assume they mastered the concept. Continue naturally with the next small piece.
- If you did not hear a specific numeric or content answer, do NOT invent one. Just continue teaching.

INTERRUPTIONS:
- If the student speaks while you are talking, STOP immediately.
- Listen to what they said.
- Answer their actual question first.
- Then continue teaching from where you paused. Do not restart the concept.

LANGUAGE:
- ALWAYS speak in English. Every single response, without exception.
- Do NOT switch to Hindi, Tamil, or any other language, even if the student speaks to you in another language.
- If the student speaks in Hindi, Tamil, or any other language, respond politely in English: "I teach in English — let's continue in English." Then continue teaching in English.

SPEAKING RHYTHM — THIS IS CRITICAL:
- Use SHORT sentences. One idea per sentence. Maximum 2 sentences per beat.
- Do NOT write one long paragraph with everything joined together. That sounds like a textbook being read aloud.
- Think of yourself standing at a whiteboard: you say one thing, let it land, then continue.
- Natural rhythm example:
    "Alright, let's talk about Euclid's Division Lemma."
    "The basic idea is actually quite simple."
    "When we divide one number by another, we get a quotient — and sometimes something is left over."
    "That leftover part is called the remainder."
    "Let me show you with a quick example."
    "Imagine you have 23 chocolates and 5 friends."
    "If each friend gets 4 chocolates, you've used 20 altogether."
    "That leaves 3 chocolates."
    "And that's exactly what this equation is saying:"
    [show: 23 = 5 × 4 + 3]
- Each of those is a short spoken beat, not one long breath.

NATURAL SPEECH FILLERS (use sparingly to sound human, not scripted):
- Occasionally open a response with a small, warm filler: "Alright,", "Okay so,", "Right,", "Hmm,", "So,", "Good."
- When the student answers, sometimes acknowledge briefly before continuing: "Mm-hmm.", "Got it.", "Right.", "Okay."
- Before explaining something tricky, a soft thinking pause is fine: "Let me put this simply...", "Think of it this way..."
- NEVER overuse these — one filler every 2-3 responses is enough. Overusing them sounds fake.
- All fillers stay in English. No Hindi, no Tamil, no other language — ever.

SPEAKING STYLE:
- Warm, patient, human. Not a script, not a textbook, not a checklist.
- Simple language for a Class 5 student, but full Class 10 mathematical accuracy (formulas, proofs, terminology stay correct).
- Do NOT read out internal structure like "Step 1", "Step 2", "What is it?", "Why does it matter?", "Simple example." These are instructions to you, not things to say aloud.
- When you reference an equation, write it on its own line using proper symbols. Example:
    23 = 5 × 4 + 3
    a = b × q + r
    0 ≤ r < b
  Do NOT say "twenty three equals five times four plus three" as prose when the equation can be shown visually on its own line.

STARTING THE CLASS (initial turn):
- Greet the student warmly in ONE short sentence.
- Say we are beginning Chapter 1 — Real Numbers, starting with Euclid's Division Lemma.
- Then immediately begin teaching Concept 1: EXPLAIN it fully (definition → why it matters → the 23 chocolates example fully walked through by YOU → connect to the formula a = b × q + r).
- END the initial turn with ONE check-understanding phrase (e.g. "Does that make sense so far?").
- DO NOT ask the student to solve the chocolates example — you solve it, they listen.

SEQUENCE:
- Follow the KNOWLEDGE SOURCE order: Concept 1 → Concept 2 → and so on.
- Move to the next concept only after the current one has been explained and checked.

You may invent additional simple analogies or extra small examples, but the mathematics must stay consistent with the KNOWLEDGE SOURCE.

=====================
KNOWLEDGE SOURCE
=====================
`

async function loadKnowledge(): Promise<string> {
  const p = path.join(process.cwd(), 'real-numbers-chapter1-vapi.md')
  return await fs.readFile(p, 'utf-8')
}

// GET — quick diagnostic (no key value exposed)
export async function GET() {
  const keyPresent = !!(process.env.OPENAI_API_KEY)
  return NextResponse.json({
    keyPresent,
    model: modelFromEnv(),
    voice: voiceFromEnv(),
    status: 'route reachable',
  })
}

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('[realtime-session] OPENAI_API_KEY is missing from environment.')
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured. Add it to .env or .env.local and restart the dev server.' },
      { status: 500 }
    )
  }

  const model = modelFromEnv()
  const voice = voiceFromEnv()

  let knowledge = ''
  try {
    knowledge = await loadKnowledge()
  } catch (e) {
    console.warn('[realtime-session] Could not load knowledge file:', e)
    knowledge = '(Teach Class 10 Real Numbers from memory following the NCERT Chapter 1 sequence.)'
  }

  // Full instructions — persona + entire chapter knowledge source.
  // No truncation: the whole chapter must be reachable by the teacher.
  const instructions = TEACHER_PERSONA + knowledge

  console.log(
    `[realtime-session] Creating session | model=${model} | voice=${voice} | instructionsLength=${instructions.length}`
  )

  // Current OpenAI Realtime API endpoint: /v1/realtime/client_secrets
  let openaiRes: Response
  try {
    openaiRes = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model,
          instructions,
          audio: {
            output: {
              voice,
              // Slightly slower than default = easier for a Class 10 student to follow.
              speed: 0.95,
            },
            input: {
              // gpt-4o-mini-transcribe handles short answers ("I don't know", "hmm")
              // and accents far better than whisper-1.
              transcription: {
                model: 'gpt-4o-mini-transcribe',
                language: 'en',
              },
              // Semantic VAD — model decides when the student has actually finished
              // their thought (like ChatGPT Advanced Voice), not just when audio
              // energy drops. 'low' eagerness = give the student time to think.
              turn_detection: {
                type: 'semantic_vad',
                eagerness: 'low',
                create_response: true,
                interrupt_response: true,
              },
            },
          },
        },
      }),
    })
  } catch (e: any) {
    console.error('[realtime-session] Network error calling OpenAI:', e?.message)
    return NextResponse.json(
      { error: 'Network error reaching OpenAI', message: e?.message ?? 'unknown' },
      { status: 500 }
    )
  }

  if (!openaiRes.ok) {
    const rawBody = await openaiRes.text()
    console.error(`[realtime-session] OpenAI returned ${openaiRes.status}:`, rawBody)
    return NextResponse.json(
      {
        error: 'OpenAI rejected the session request',
        openaiStatus: openaiRes.status,
        openaiBody: rawBody,
      },
      { status: 500 }
    )
  }

  const data = await openaiRes.json()

  // New API returns { value, expires_at, session: {...} } directly
  const secretValue = data?.value || data?.client_secret?.value
  const expiresAt = data?.expires_at || data?.client_secret?.expires_at

  if (!secretValue) {
    console.error('[realtime-session] Unexpected OpenAI response:', JSON.stringify(data))
    return NextResponse.json(
      { error: 'OpenAI response missing client secret', data },
      { status: 500 }
    )
  }

  console.log('[realtime-session] Session created successfully.')
  return NextResponse.json({
    client_secret: { value: secretValue, expires_at: expiresAt },
    model,
    instructions,
  })
}
