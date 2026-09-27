'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GeminiClassroomSession,
  type GeminiClassroomEvent,
} from '@/lib/gemini/session'

type Speaker = 'teacher' | 'student'
type TranscriptItem = {
  id: string
  speaker: Speaker
  text: string
  final: boolean
  ts: number
  seq: number
}
type Status =
  | 'idle'
  | 'requesting-mic'
  | 'connecting'
  | 'active'
  | 'reconnecting'
  | 'ended'
  | 'error'

export default function ClassRoomPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [muted, setMuted] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [studentSpeaking, setStudentSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [processingResponse, setProcessingResponse] = useState(false)
  const [currentSubject, setCurrentSubject] = useState<string | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)
  const [expiryWarning, setExpiryWarning] = useState(false)

  const sessionRef = useRef<GeminiClassroomSession | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)   // AI video (ai_video.mp4)
  const studentVideoRef = useRef<HTMLVideoElement | null>(null) // Student video (ai_video2.mp4)
  const currentAvatarModeRef = useRef<'idle' | 'ai' | 'student'>('idle')
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const statusRef = useRef<Status>('idle')
  const [nowTick, setNowTick] = useState(0)

  const reconnectAttemptsRef = useRef<number>(0)
  const skipTranscriptResetRef = useRef<boolean>(false)
  const startClassRef = useRef<() => void>(() => {})

  // ─── Teacher transcript reveal buffer (mirrors OpenAI implementation) ─────
  // Gemini's outputTranscription arrives before the corresponding audio plays.
  // We buffer it here and reveal it char-by-char only while audio is active,
  // so what the student SEES in captions matches what they HEAR.
  const teacherBufferRef = useRef<Map<string, string>>(new Map())
  const audioPlayingRef = useRef<boolean>(false)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (status !== 'active') return
    const id = setInterval(() => setNowTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const itemsRef = useRef<Map<string, TranscriptItem>>(new Map())
  const seqCounterRef = useRef<number>(0)

  const upsertItem = useCallback(
    (id: string, speaker: Speaker, updater: (prev: TranscriptItem) => TranscriptItem) => {
      const existing = itemsRef.current.get(id)
      const base: TranscriptItem = existing ?? {
        id,
        speaker,
        text: '',
        final: false,
        ts: Date.now(),
        seq: ++seqCounterRef.current,
      }
      const next = updater(base)
      itemsRef.current.set(id, next)
      setTranscript((prev) => {
        const found = prev.find((p) => p.id === id)
        if (!found) return [...prev, next]
        return prev.map((p) => (p.id === id ? next : p))
      })
    },
    []
  )

  // Reveals buffered teacher text char-by-char while audio is active.
  // Same mechanism the OpenAI path used (teacherBufferRef + startTeacherReveal).
  const startTeacherReveal = useCallback(() => {
    if (revealTimerRef.current) return
    const tick = () => {
      if (!audioPlayingRef.current) {
        revealTimerRef.current = null
        return
      }
      let didWork = false
      teacherBufferRef.current.forEach((pending, id) => {
        if (!pending) return
        const chunk = pending.slice(0, 3)
        const rest = pending.slice(3)
        teacherBufferRef.current.set(id, rest)
        didWork = true
        upsertItem(id, 'teacher', (prev) => ({
          ...prev,
          speaker: 'teacher',
          text: (prev.text || '') + chunk,
          final: false,
        }))
      })
      if (!didWork && !audioPlayingRef.current) {
        revealTimerRef.current = null
        return
      }
      revealTimerRef.current = setTimeout(tick, 40)
    }
    revealTimerRef.current = setTimeout(tick, 0)
  }, [upsertItem])

  // Flush all remaining buffered teacher text immediately (used on turn end/interrupt).
  const flushTeacherBuffer = useCallback((id: string) => {
    const remaining = teacherBufferRef.current.get(id) ?? ''
    if (!remaining) return
    teacherBufferRef.current.set(id, '')
    upsertItem(id, 'teacher', (prev) => ({
      ...prev,
      text: (prev.text || '') + remaining,
    }))
  }, [upsertItem])

  // ─── Avatar switching helpers ─────────────────────────────
  // Gemini gives us discrete audio chunks, so unlike the OpenAI WebRTC path
  // we don't need a waveform analyser — teacher-started / teacher-stopped
  // from the playback queue are precise signals.
  const showAiVideo = useCallback(() => {
    currentAvatarModeRef.current = 'ai'
    const sv = studentVideoRef.current
    if (sv) { sv.style.display = 'none'; try { sv.pause() } catch {} }
    const v = videoElRef.current
    if (!v) return
    v.style.display = 'block'
    try { v.currentTime = 0 } catch {}
    v.play().catch(() => {})
  }, [])

  const showStudentVideo = useCallback(() => {
    currentAvatarModeRef.current = 'student'
    const v = videoElRef.current
    if (v) { try { v.pause() } catch {}; v.style.display = 'none' }
    const sv = studentVideoRef.current
    if (!sv) return
    sv.style.display = 'block'
    try { sv.currentTime = 0 } catch {}
    sv.play().catch(() => {
      const onReady = () => {
        sv.removeEventListener('canplay', onReady)
        if (currentAvatarModeRef.current !== 'student') return
        sv.play().catch(() => {})
      }
      sv.addEventListener('canplay', onReady)
      try { sv.load() } catch {}
    })
  }, [])

  const detectSubject = useCallback((cleaned: string) => {
    setCurrentSubject((prev) => {
      if (prev) return prev
      const SUBJECTS_MAP: Record<string, string> = {
        math: 'Math', maths: 'Math', mathematics: 'Math',
        science: 'Science', physics: 'Physics', chemistry: 'Chemistry',
        biology: 'Biology', english: 'English', grammar: 'English Grammar',
        history: 'History', geography: 'Geography',
        computer: 'Computer Science', coding: 'Computer Science',
        jee: 'JEE Prep', neet: 'NEET Prep', clat: 'CLAT Prep',
      }
      const words = cleaned.toLowerCase().split(/\W+/)
      for (const w of words) {
        if (SUBJECTS_MAP[w]) return SUBJECTS_MAP[w]
      }
      return prev
    })
  }, [])

  // ─── Fan-out from Gemini session events into UI state ─────
  const handleSessionEvent = useCallback(
    (evt: GeminiClassroomEvent) => {
      switch (evt.type) {
        case 'connected':
          setStatus('active')
          setStartedAt((v) => v ?? Date.now())
          break

        case 'student-started':
          setStudentSpeaking(true)
          setProcessingResponse(false)
          // Barge-in: if AI video is showing, immediately switch to student.
          if (currentAvatarModeRef.current !== 'student') {
            showStudentVideo()
          }
          break

        case 'student-stopped':
          setStudentSpeaking(false)
          // Show "Thinking…" between student stop and teacher start.
          // Mirrors OpenAI's speech_stopped → processingResponse = true.
          setProcessingResponse(true)
          break

        case 'teacher-started':
          setAiSpeaking(true)
          setProcessingResponse(false)
          audioPlayingRef.current = true
          if (currentAvatarModeRef.current !== 'ai') showAiVideo()
          // Start revealing any buffered teacher transcript text.
          startTeacherReveal()
          break

        case 'teacher-stopped':
          setAiSpeaking(false)
          audioPlayingRef.current = false
          // Flush any remaining buffer (audio is done, reveal whatever is left).
          teacherBufferRef.current.forEach((_, id) => flushTeacherBuffer(id))
          if (currentAvatarModeRef.current === 'ai') showStudentVideo()
          break

        case 'teacher-interrupted':
          setAiSpeaking(false)
          audioPlayingRef.current = false
          // Flush remaining buffer on interruption too.
          teacherBufferRef.current.forEach((_, id) => flushTeacherBuffer(id))
          // Student is presumably speaking; student-started handles avatar.
          break

        case 'student-transcript-delta': {
          // IMPORTANT: Gemini's interimInputTranscription.text is the FULL current
          // STT hypothesis, not a char-delta. We SET (replace) the text, not APPEND.
          // OpenAI sent true deltas (APPEND). This is the key difference.
          const currentText = evt.text
          if (!currentText) break
          upsertItem(evt.id, 'student', (prev) => ({
            ...prev,
            speaker: 'student',
            text: currentText,   // SET — not (prev.text || '') + currentText
            final: false,
          }))
          break
        }

        case 'student-transcript-final': {
          const cleaned = (evt.text || '').trim()
          if (!cleaned) {
            itemsRef.current.delete(evt.id)
            setTranscript((prev) => prev.filter((p) => p.id !== evt.id))
            break
          }
          const NOISE_PHRASES = [
            'thank you', 'thank you for watching', 'thanks for watching',
            'please subscribe', 'subscribe', 'music playing', 'applause',
            'background music', 'inaudible', 'laughter',
          ]
          const lower = cleaned.toLowerCase()
          const looksLikeNoise =
            cleaned.length < 3 ||
            NOISE_PHRASES.some((p) => lower === p)
          if (looksLikeNoise) {
            itemsRef.current.delete(evt.id)
            setTranscript((prev) => prev.filter((p) => p.id !== evt.id))
            break
          }
          upsertItem(evt.id, 'student', (prev) => ({
            ...prev,
            speaker: 'student',
            text: cleaned,
            final: true,
          }))
          detectSubject(cleaned)
          break
        }

        case 'teacher-transcript-delta': {
          // Buffer the new delta; the reveal timer drips it out while audio plays.
          // This keeps captions in sync with the voice — same as OpenAI's teacherBufferRef.
          const id = evt.id
          const prev = teacherBufferRef.current.get(id) ?? ''
          teacherBufferRef.current.set(id, prev + evt.text)
          // Ensure the row exists in the transcript so its position is stable.
          upsertItem(id, 'teacher', (p) => ({ ...p, speaker: 'teacher' }))
          if (audioPlayingRef.current) startTeacherReveal()
          break
        }

        case 'teacher-transcript-final': {
          const id = evt.id
          // Flush any remaining buffer, then mark final.
          flushTeacherBuffer(id)
          teacherBufferRef.current.delete(id)
          upsertItem(id, 'teacher', (prev) => ({
            ...prev,
            speaker: 'teacher',
            text: evt.text.trim() || prev.text || '',
            final: true,
          }))
          break
        }

        case 'error':
          setErrorMsg(evt.message || 'Live session error')
          break

        case 'closed':
          if (statusRef.current === 'active' &&
              reconnectAttemptsRef.current < 2) {
            reconnectAttemptsRef.current += 1
            setStatus('reconnecting')
            skipTranscriptResetRef.current = true
            setTimeout(() => {
              if (statusRef.current !== 'ended') startClassRef.current()
            }, 2000)
          }
          break
      }
    },
    [showAiVideo, showStudentVideo, upsertItem, detectSubject,
     startTeacherReveal, flushTeacherBuffer]
  )

  const cleanupMedia = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
  }, [])

  const cleanupAll = useCallback(() => {
    try { sessionRef.current?.close() } catch {}
    sessionRef.current = null
    cleanupMedia()
    if (videoElRef.current) {
      try { videoElRef.current.pause() } catch {}
    }
    if (studentVideoRef.current) {
      try { studentVideoRef.current.pause() } catch {}
    }
    currentAvatarModeRef.current = 'idle'
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
    teacherBufferRef.current.clear()
    audioPlayingRef.current = false
  }, [cleanupMedia])

  const startClass = useCallback(async () => {
    setErrorMsg('')
    if (!skipTranscriptResetRef.current) {
      setTranscript([])
      itemsRef.current.clear()
      setCurrentSubject(null)
      reconnectAttemptsRef.current = 0
    }
    skipTranscriptResetRef.current = false

    teacherBufferRef.current.clear()
    audioPlayingRef.current = false

    setStatus('requesting-mic')

    let micStream: MediaStream
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      micStreamRef.current = micStream
    } catch {
      setStatus('error')
      setErrorMsg(
        "We couldn't access your microphone. Please allow microphone permission and try again."
      )
      return
    }

    setStatus('connecting')

    let sessionInfo: any
    try {
      const res = await fetch('/api/gemini-live-token', { method: 'POST' })
      if (!res.ok) throw new Error(`Session ${res.status}`)
      sessionInfo = await res.json()
    } catch {
      setStatus('error')
      setErrorMsg(
        "We couldn't start the class right now. Please check your connection and try again."
      )
      cleanupMedia()
      return
    }

    const token: string | undefined = sessionInfo?.client_secret?.value
    const expiresAtRaw: number | undefined = sessionInfo?.client_secret?.expires_at
    if (expiresAtRaw) setSessionExpiresAt(expiresAtRaw * 1000)

    if (!token) {
      setStatus('error')
      setErrorMsg('The class could not be initialized. Please try again.')
      cleanupMedia()
      return
    }

    const session = new GeminiClassroomSession(
      token,
      micStream,
      handleSessionEvent
    )
    sessionRef.current = session

    try {
      await session.start()
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(`Couldn't connect: ${e?.message ?? 'unknown error'}`)
      cleanupAll()
      return
    }
  }, [handleSessionEvent, cleanupMedia, cleanupAll])

  useEffect(() => { startClassRef.current = startClass }, [startClass])

  const toggleMute = useCallback(() => {
    const stream = micStreamRef.current
    if (!stream) return
    const next = !muted
    sessionRef.current?.setMuted(next)
    setMuted(next)
  }, [muted])

  const endClass = useCallback(() => {
    setShowEndConfirm(false)
    cleanupAll()
    setAiSpeaking(false)
    setStudentSpeaking(false)
    setTranscriptOpen(false)
    setStatus('ended')
    setEndedAt(Date.now())
  }, [cleanupAll])

  useEffect(() => {
    return () => {
      cleanupAll()
    }
  }, [cleanupAll])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript])

  // Session expiry warning — show banner 5 minutes before token expires
  useEffect(() => {
    if (!sessionExpiresAt || status !== 'active') return
    const msUntilWarning = sessionExpiresAt - Date.now() - 5 * 60 * 1000
    if (msUntilWarning <= 0) { setExpiryWarning(true); return }
    const t = setTimeout(() => setExpiryWarning(true), msUntilWarning)
    return () => clearTimeout(t)
  }, [sessionExpiresAt, status])

  const durationText = useMemo(() => {
    if (!startedAt) return '00:00'
    const end = endedAt ?? Date.now()
    const s = Math.max(0, Math.floor((end - startedAt) / 1000))
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, endedAt, nowTick])

  const statusPill =
    status === 'requesting-mic' || status === 'connecting'
      ? 'Connecting'
      : status === 'reconnecting'
      ? 'Reconnecting'
      : status === 'active'
      ? aiSpeaking
        ? 'Teacher speaking'
        : studentSpeaking
        ? 'Listening'
        : processingResponse
        ? 'Thinking…'
        : muted
        ? 'Muted'
        : 'Live'
      : status === 'ended'
      ? 'Ended'
      : status === 'error'
      ? 'Disconnected'
      : ''

  // ─── IDLE ───────────────────────────────────────────
  if (status === 'idle') {
    return (
      <main className="rm-idle">
        <div className="rm-idle-orb" />
        <div className="rm-idle-orb rm-idle-orb-2" />
        <div className="rm-idle-card">
          <div className="rm-idle-badge">
            <span className="rm-idle-badge-dot" />
            AI Live Classroom
          </div>
          <h1 className="rm-idle-title">
            Your <span className="rm-gold">AI Teacher</span>
          </h1>
          <div className="rm-idle-chapter">All School Subjects · Grades 1–12</div>
          <p className="rm-idle-desc">
            Meet your AI teacher face-to-face. Ask any subject — Math, Science, English, History — learn at your own pace.
          </p>
          <button className="rm-idle-cta" onClick={startClass}>
            <span className="rm-idle-cta-dot" />
            Start Class
          </button>
          <div className="rm-idle-note">
            We'll ask for microphone permission. Camera is not required.
          </div>
        </div>
      </main>
    )
  }

  // ─── ENDED SUMMARY ───────────────────────────────────
  if (status === 'ended') {
    const orderedTranscript = [...transcript]
      .filter((t) => t.final && t.text.trim().length > 0)
      .sort((a, b) => a.seq - b.seq)
    return (
      <main className="rm-end">
        <div className="rm-end-card rm-end-card-wide">
          <div className="rm-end-eyebrow">Class Completed</div>
          <h2 className="rm-end-title">Class with your AI Teacher</h2>
          <div className="rm-end-stats">
            <div className="rm-end-stat">
              <div className="rm-end-stat-l">Duration</div>
              <div className="rm-end-stat-v">{durationText}</div>
            </div>
            <div className="rm-end-stat">
              <div className="rm-end-stat-l">Exchanges</div>
              <div className="rm-end-stat-v">{orderedTranscript.length}</div>
            </div>
          </div>

          <div className="rm-end-transcript">
            <div className="rm-end-transcript-head">
              <div className="rm-end-transcript-title">Full Transcript</div>
              <div className="rm-end-transcript-sub">Conversation in order</div>
            </div>
            <div className="rm-end-transcript-body">
              {orderedTranscript.length === 0 ? (
                <div className="rm-drawer-empty">No conversation recorded.</div>
              ) : (
                orderedTranscript.map((item) => (
                  <TranscriptRow key={item.id} item={item} />
                ))
              )}
            </div>
          </div>

          <div className="rm-end-actions">
            <a href="/" className="rm-end-btn rm-end-btn-ghost">Back to Home</a>
            <button
              className="rm-end-btn rm-end-btn-primary"
              onClick={() => {
                setStatus('idle')
                setStartedAt(null)
                setEndedAt(null)
                setTranscript([])
                setTranscriptOpen(false)
                setMuted(false)
                setAiSpeaking(false)
                setStudentSpeaking(false)
                setErrorMsg('')
                itemsRef.current.clear()
                seqCounterRef.current = 0
              }}
            >
              Start New Class
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ─── LIVE ─────────────────────────
  return (
    <main className="rm-stage">
      <section className="rm-video">
        <div className="rm-video-inner">
          {/* AI avatar video — shown while AI is speaking */}
          <AiVideo
            videoElRef={videoElRef}
            currentAvatarModeRef={currentAvatarModeRef}
          />
          {/* Student avatar video — shown while student is speaking / idle */}
          <StudentVideo
            studentVideoRef={studentVideoRef}
            currentAvatarModeRef={currentAvatarModeRef}
          />
          <div className="rm-video-vignette-top" />
          <div className="rm-video-vignette-bottom" />
        </div>

        <header className="rm-topbar">
          <a href="/" className="rm-brand">
            <span className="rm-brand-dot" />
            <span>AI-Gurukool</span>
          </a>
          <div className="rm-topbar-right">
            <div className="rm-chip">
              <span className="rm-chip-label">AI</span>
              <span className="rm-chip-sep">·</span>
              <span className="rm-chip-value">Teacher</span>
            </div>
            {currentSubject && (
              <div className="rm-chip rm-chip-subject">
                <span className="rm-chip-label">📚</span>
                <span className="rm-chip-sep">·</span>
                <span className="rm-chip-value">{currentSubject}</span>
              </div>
            )}
            {statusPill && (
              <div
                className={
                  'rm-live ' +
                  (status === 'active' && !muted ? 'rm-live-on ' : '') +
                  (aiSpeaking ? 'rm-live-speak ' : '') +
                  (studentSpeaking ? 'rm-live-listen ' : '') +
                  (muted ? 'rm-live-muted ' : '')
                }
              >
                <span className="rm-live-dot" />
                {statusPill}
                {status === 'active' && (
                  <span className="rm-live-timer">{durationText}</span>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="rm-dock">
          <button
            className={'rm-ctrl ' + (muted ? 'rm-ctrl-off ' : '')}
            onClick={toggleMute}
            disabled={status !== 'active'}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <MicIcon muted={muted} />
            <span className="rm-ctrl-label">{muted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            className={'rm-ctrl ' + (transcriptOpen ? 'rm-ctrl-on ' : '')}
            onClick={() => setTranscriptOpen((v) => !v)}
            aria-label="Toggle transcript"
          >
            <TranscriptIcon />
            <span className="rm-ctrl-label">Transcript</span>
          </button>

          <button
            className="rm-ctrl rm-ctrl-end"
            onClick={() => setShowEndConfirm(true)}
            disabled={status !== 'active'}
            aria-label="End class"
          >
            <EndIcon />
            <span className="rm-ctrl-label">End</span>
          </button>
        </div>

        {errorMsg && (
          <div className="rm-error" role="alert">
            {errorMsg}
          </div>
        )}

        {expiryWarning && (
          <div className="rm-expiry-warn" role="status">
            ⏱ Session expires soon — your class will auto-renew shortly.
          </div>
        )}

        {status === 'reconnecting' && (
          <div className="rm-reconnect-overlay" role="status">
            <div className="rm-reconnect-spinner" />
            <span>Reconnecting your teacher…</span>
          </div>
        )}
      </section>

      <aside className={'rm-drawer ' + (transcriptOpen ? 'rm-drawer-open' : '')}>
        <div className="rm-drawer-head">
          <div>
            <div className="rm-drawer-title">Live Transcript</div>
            <div className="rm-drawer-sub">Real-time captions</div>
          </div>
          <button
            className="rm-drawer-close"
            onClick={() => setTranscriptOpen(false)}
            aria-label="Close transcript"
          >
            ×
          </button>
        </div>
        <div className="rm-drawer-body">
          {transcript.length === 0 && (
            <div className="rm-drawer-empty">
              {status === 'active'
                ? 'Your teacher is about to begin…'
                : 'Setting up your classroom…'}
            </div>
          )}
          {[...transcript]
            .sort((a, b) => a.seq - b.seq)
            .map((item) => (
              <TranscriptRow key={item.id} item={item} />
            ))}
          <div ref={transcriptEndRef} />
        </div>
      </aside>

      {showEndConfirm && (
        <div className="rm-modal-backdrop" onClick={() => setShowEndConfirm(false)}>
          <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rm-modal-title">End this class?</div>
            <div className="rm-modal-desc">
              You can review the transcript on the summary screen.
            </div>
            <div className="rm-modal-actions">
              <button
                className="rm-end-btn rm-end-btn-ghost"
                onClick={() => setShowEndConfirm(false)}
              >
                Continue
              </button>
              <button
                className="rm-end-btn rm-end-btn-danger"
                onClick={endClass}
              >
                End Class
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Avatar video sub-components ──────────────────────────────────────────────
// Stable useCallback refs so parent re-renders don't reset el.style.display
// (display is managed imperatively, not via props).

function AiVideo({
  videoElRef,
  currentAvatarModeRef,
}: {
  videoElRef: React.MutableRefObject<HTMLVideoElement | null>
  currentAvatarModeRef: React.MutableRefObject<'idle' | 'ai' | 'student'>
}) {
  const stableRef = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el
    if (!el) return
    el.style.display = 'none'   // hidden until AI speaks
    el.onended = () => {
      if (currentAvatarModeRef.current === 'ai') {
        el.currentTime = 0
        el.play().catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <video
      ref={stableRef}
      className="rm-video-frame"
      src="/ai_video.mp4"
      muted
      playsInline
      preload="auto"
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}

function StudentVideo({
  studentVideoRef,
  currentAvatarModeRef,
}: {
  studentVideoRef: React.MutableRefObject<HTMLVideoElement | null>
  currentAvatarModeRef: React.MutableRefObject<'idle' | 'ai' | 'student'>
}) {
  const stableRef = useCallback((el: HTMLVideoElement | null) => {
    studentVideoRef.current = el
    if (!el) return
    // INITIAL STATE: student video is the default avatar shown before the AI
    // begins speaking. Once the AI actually responds, the switching logic
    // hides this and shows the AI video.
    el.style.display = 'block'
    el.muted = true
    ;(el as any).playsInline = true
    el.onended = () => {
      if (currentAvatarModeRef.current !== 'ai') {
        el.currentTime = 0
        el.play().catch(() => {})
      }
    }
    const kick = () => {
      el.play().catch(() => {
        const onReady = () => {
          el.removeEventListener('canplay', onReady)
          if (currentAvatarModeRef.current === 'ai') return
          el.play().catch(() => {})
        }
        el.addEventListener('canplay', onReady)
        try { el.load() } catch {}
      })
    }
    if (el.readyState >= 2) kick()
    else {
      const onReady = () => {
        el.removeEventListener('canplay', onReady)
        el.removeEventListener('loadeddata', onReady)
        if (currentAvatarModeRef.current === 'ai') return
        kick()
      }
      el.addEventListener('canplay', onReady)
      el.addEventListener('loadeddata', onReady)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <video
      ref={stableRef}
      className="rm-video-frame"
      src="/ai_video2.mp4"
      muted
      playsInline
      preload="auto"
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}

function TranscriptRow({ item }: { item: TranscriptItem }) {
  const isTeacher = item.speaker === 'teacher'
  return (
    <div className={'rm-msg ' + (isTeacher ? 'rm-msg-t' : 'rm-msg-s')}>
      <div className="rm-msg-role">
        {isTeacher ? 'AI Teacher' : 'You'}
        {!item.final && <span className="rm-msg-partial"> · live</span>}
      </div>
      <div className="rm-msg-text">{item.text}</div>
    </div>
  )
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {muted ? (
        <>
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
          <path d="M5 10v2a7 7 0 0 0 12 5" />
          <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </>
      ) : (
        <>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </>
      )}
    </svg>
  )
}

function TranscriptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h10M4 18h16" />
    </svg>
  )
}

function EndIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" transform="rotate(135 12 12)" />
    </svg>
  )
}
