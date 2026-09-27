'use client'

import { GoogleGenAI, Modality, type Session } from '@google/genai'
import {
  GEMINI_LIVE_MODEL,
  INPUT_MIME_TYPE,
  VAD_PREFIX_PADDING_MS,
  VAD_SILENCE_DURATION_MS,
} from './config'
import { MicPcmCapture, PcmPlaybackQueue } from './audio'
import { INITIAL_KICKOFF } from './persona'

export type GeminiClassroomEvent =
  | { type: 'connected' }
  | { type: 'student-started' }
  | { type: 'student-stopped' }
  | { type: 'teacher-started' }
  | { type: 'teacher-stopped' }
  | { type: 'teacher-interrupted' }
  // student-transcript-delta carries the FULL current interim hypothesis (not a char-delta).
  // The page must SET (replace) the text, not APPEND it.
  | { type: 'student-transcript-delta'; id: string; text: string }
  | { type: 'student-transcript-final'; id: string; text: string }
  // teacher-transcript-delta carries only the NEW chunk from this message.
  // The page should APPEND it.
  | { type: 'teacher-transcript-delta'; id: string; text: string }
  | { type: 'teacher-transcript-final'; id: string; text: string }
  | { type: 'error'; message: string }
  | { type: 'closed' }

export type GeminiClassroomListener = (evt: GeminiClassroomEvent) => void

export class GeminiClassroomSession {
  private token: string
  private micStream: MediaStream
  private listener: GeminiClassroomListener

  private ai: GoogleGenAI | null = null
  private session: Session | null = null
  private mic: MicPcmCapture | null = null
  private playback: PcmPlaybackQueue | null = null

  private currentTeacherTurnId: string | null = null
  private currentStudentTurnId: string | null = null
  private teacherTurnCounter = 0
  private studentTurnCounter = 0

  private teacherTextByTurn = new Map<string, string>()
  private studentTextByTurn = new Map<string, string>()

  // true = Gemini VAD has detected the student is still speaking (no model audio yet).
  private studentIsSpeaking = false

  private closed = false

  constructor(
    token: string,
    micStream: MediaStream,
    listener: GeminiClassroomListener
  ) {
    this.token = token
    this.micStream = micStream
    this.listener = listener
  }

  async start() {
    this.ai = new GoogleGenAI({ apiKey: this.token })

    this.playback = new PcmPlaybackQueue({
      onPlaybackStart: () => this.listener({ type: 'teacher-started' }),
      onPlaybackStop: () => this.listener({ type: 'teacher-stopped' }),
    })

    try {
      this.session = await this.ai.live.connect({
        model: GEMINI_LIVE_MODEL,
        callbacks: {
          onopen: () => this.listener({ type: 'connected' }),
          onmessage: (msg) => this.handleServerMessage(msg),
          onerror: (e) =>
            this.listener({
              type: 'error',
              message: (e as any)?.message || 'Gemini live error',
            }),
          onclose: () => this.listener({ type: 'closed' }),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          // systemInstruction, transcription, and VAD are locked in the ephemeral token
          // (see app/api/gemini-live-token/route.ts). Repeating them here is fine as long
          // as they match — the token constraint wins on any conflict.
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: {
            automaticActivityDetection: {
              prefixPaddingMs: VAD_PREFIX_PADDING_MS,
              silenceDurationMs: VAD_SILENCE_DURATION_MS,
            },
          },
        },
      })
    } catch (e: any) {
      this.listener({
        type: 'error',
        message: e?.message || 'Failed to connect to Gemini Live',
      })
      throw e
    }

    this.mic = new MicPcmCapture(this.micStream, (b64) => {
      const s = this.session
      if (!s || this.closed) return
      try {
        s.sendRealtimeInput({
          audio: { data: b64, mimeType: INPUT_MIME_TYPE },
        })
      } catch {
        // Socket may be mid-close; swallow to avoid noise.
      }
    })
    await this.mic.start()

    try {
      this.session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: INITIAL_KICKOFF }] }],
        turnComplete: true,
      })
    } catch {}
  }

  setMuted(muted: boolean) {
    this.mic?.setMuted(muted)
  }

  close() {
    if (this.closed) return
    this.closed = true
    try { this.session?.close() } catch {}
    this.session = null
    this.mic?.stop()
    this.mic = null
    this.playback?.close()
    this.playback = null
  }

  // Ensure a student turn is open (creates one on first activity).
  private ensureStudentTurn(): string {
    if (!this.currentStudentTurnId) {
      this.studentTurnCounter += 1
      this.currentStudentTurnId = `student-${this.studentTurnCounter}`
    }
    if (!this.studentIsSpeaking) {
      this.studentIsSpeaking = true
      this.listener({ type: 'student-started' })
      // Barge-in: cut teacher audio the instant student activity is detected.
      if (this.playback?.isPlaying()) {
        this.playback.interrupt()
        this.listener({ type: 'teacher-interrupted' })
      }
    }
    return this.currentStudentTurnId
  }

  private handleServerMessage(msg: any) {
    if (msg?.setupComplete) return
    const sc = msg?.serverContent
    if (!sc) return

    // ── 1. Student final transcription (APPEND — incremental deltas) ─────────
    // Gemini's `inputTranscription.text` arrives incrementally as it finalizes
    // what it heard. Each message carries only the NEW chunk (like output
    // transcription). Accumulate into studentTextByTurn.
    const inFinal = sc.inputTranscription?.text
    if (typeof inFinal === 'string' && inFinal.length > 0) {
      const id = this.ensureStudentTurn()
      const prev = this.studentTextByTurn.get(id) ?? ''
      const combined = prev + inFinal
      this.studentTextByTurn.set(id, combined)
      // Emit as SET (full accumulated text so far) so the page shows the
      // building sentence consistently regardless of interim/final source.
      this.listener({ type: 'student-transcript-delta', id, text: combined })
    }

    // ── 2. Student interim transcription (SET — full snapshot) ───────────────
    // `interimInputTranscription.text` is the full current low-latency hypothesis.
    // Used only if the final stream hasn't started yet — otherwise we prefer the
    // final stream which is more accurate.
    const inInterim = sc.interimInputTranscription?.text
    if (typeof inInterim === 'string' && inInterim.length > 0) {
      const id = this.ensureStudentTurn()
      // Only override display if we don't yet have any accumulated final text.
      const currentFinal = this.studentTextByTurn.get(id) ?? ''
      if (!currentFinal) {
        this.listener({ type: 'student-transcript-delta', id, text: inInterim })
      }
    }

    // ── 3. Teacher audio ───────────────────────────────────────────────────────
    const parts = sc.modelTurn?.parts as any[] | undefined
    if (parts && parts.length > 0) {
      let hasAudio = false
      for (const p of parts) {
        const inline = p?.inlineData
        if (!inline?.data) continue
        hasAudio = true
        if (!this.currentTeacherTurnId) {
          this.teacherTurnCounter += 1
          this.currentTeacherTurnId = `teacher-${this.teacherTurnCounter}`
        }
        this.playback?.enqueue(inline.data as string)
      }

      // First teacher audio = student has stopped. Mirrors OpenAI speech_stopped.
      // "Thinking…" shows between student-stopped and teacher-started.
      if (hasAudio && this.studentIsSpeaking) {
        this.studentIsSpeaking = false
        this.listener({ type: 'student-stopped' })
        // Also finalize the student transcript row NOW so it appears in the
        // panel immediately (don't wait for turnComplete which may be delayed
        // until after the teacher finishes speaking).
        const studentId = this.currentStudentTurnId
        if (studentId) {
          const accumulated = (this.studentTextByTurn.get(studentId) ?? '').trim()
          if (accumulated) {
            this.listener({
              type: 'student-transcript-final',
              id: studentId,
              text: accumulated,
            })
          } else {
            // No text captured — drop the empty row.
            this.listener({
              type: 'student-transcript-final',
              id: studentId,
              text: '',
            })
          }
          this.studentTextByTurn.delete(studentId)
          this.currentStudentTurnId = null
        }
      }
    }

    // ── 4. Teacher transcription (APPEND) ─────────────────────────────────────
    const outTrans = sc.outputTranscription?.text
    if (typeof outTrans === 'string' && outTrans.length > 0) {
      if (!this.currentTeacherTurnId) {
        this.teacherTurnCounter += 1
        this.currentTeacherTurnId = `teacher-${this.teacherTurnCounter}`
      }
      const id = this.currentTeacherTurnId
      const prev = this.teacherTextByTurn.get(id) ?? ''
      this.teacherTextByTurn.set(id, prev + outTrans)
      this.listener({ type: 'teacher-transcript-delta', id, text: outTrans })
    }

    // ── 5. Server interruption ────────────────────────────────────────────────
    if (sc.interrupted) {
      if (this.playback?.isPlaying()) {
        this.playback.interrupt()
      }
      const teacherId = this.currentTeacherTurnId
      if (teacherId) {
        const finalText = this.teacherTextByTurn.get(teacherId) ?? ''
        this.listener({ type: 'teacher-transcript-final', id: teacherId, text: finalText })
        this.teacherTextByTurn.delete(teacherId)
        this.currentTeacherTurnId = null
      }
      this.listener({ type: 'teacher-interrupted' })
    }

    // ── 6. Turn complete ──────────────────────────────────────────────────────
    if (sc.turnComplete) {
      // Finalize teacher turn.
      const teacherId = this.currentTeacherTurnId
      if (teacherId) {
        const finalText = this.teacherTextByTurn.get(teacherId) ?? ''
        this.listener({ type: 'teacher-transcript-final', id: teacherId, text: finalText })
        this.teacherTextByTurn.delete(teacherId)
        this.currentTeacherTurnId = null
      }

      // Finalize any student turn that wasn't already closed at teacher-audio-start.
      if (this.studentIsSpeaking) {
        this.studentIsSpeaking = false
        this.listener({ type: 'student-stopped' })
      }
      const studentId = this.currentStudentTurnId
      if (studentId) {
        const accumulated = (this.studentTextByTurn.get(studentId) ?? '').trim()
        this.listener({
          type: 'student-transcript-final',
          id: studentId,
          text: accumulated,
        })
        this.studentTextByTurn.delete(studentId)
        this.currentStudentTurnId = null
      }
    }
  }
}
