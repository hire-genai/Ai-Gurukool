// Ephemeral-token endpoint for the Gemini Live classroom.
//
// The browser cannot hold GEMINI_API_KEY, so we mint a short-lived token here
// with liveConnectConstraints locked to the exact model + config + system
// prompt we want. This file is intentionally tiny — all Gemini logic lives in
// lib/gemini/ so everything Gemini-related is in one folder.

import { NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { TEACHER_PERSONA } from '@/lib/gemini/persona'
import {
  GEMINI_LIVE_MODEL,
  NEW_SESSION_WINDOW_SECONDS,
  SESSION_MAX_DURATION_SECONDS,
  VAD_PREFIX_PADDING_MS,
  VAD_SILENCE_DURATION_MS,
} from '@/lib/gemini/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET — quick diagnostic (mirrors /api/realtime-session for parity).
export async function GET() {
  return NextResponse.json({
    keyPresent: !!process.env.GEMINI_API_KEY,
    model: GEMINI_LIVE_MODEL,
    status: 'route reachable',
  })
}

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[gemini-live-token] GEMINI_API_KEY is missing.')
    return NextResponse.json(
      {
        error:
          'GEMINI_API_KEY is not configured. Add it to .env or .env.local and restart the dev server.',
      },
      { status: 500 }
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const now = Date.now()
  const newSessionExpireTime = new Date(
    now + NEW_SESSION_WINDOW_SECONDS * 1000
  ).toISOString()
  const expireTime = new Date(
    now + SESSION_MAX_DURATION_SECONDS * 1000
  ).toISOString()

  try {
    // Lock the model, response modality, system prompt and VAD tuning into
    // the token so the browser can't override them. `uses: 1` = single-use.
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime,
        expireTime,
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: TEACHER_PERSONA,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: {
                prefixPaddingMs: VAD_PREFIX_PADDING_MS,
                silenceDurationMs: VAD_SILENCE_DURATION_MS,
              },
            },
          },
        },
      },
    })

    const value = (token as any)?.name
    if (!value) {
      console.error('[gemini-live-token] Unexpected token shape:', token)
      return NextResponse.json(
        { error: 'Gemini token creation returned no name' },
        { status: 500 }
      )
    }

    // Return the same shape as /api/realtime-session so the classroom page
    // has one consistent contract to code against.
    return NextResponse.json({
      client_secret: {
        value,
        expires_at: Math.floor(new Date(expireTime).getTime() / 1000),
      },
      model: GEMINI_LIVE_MODEL,
    })
  } catch (e: any) {
    console.error('[gemini-live-token] Token creation failed:', e?.message)
    return NextResponse.json(
      { error: 'Failed to create Gemini ephemeral token', message: e?.message },
      { status: 500 }
    )
  }
}
