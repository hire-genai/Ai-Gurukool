'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Speaker = 'teacher' | 'student'
type TranscriptItem = {
  id: string
  speaker: Speaker
  text: string
  final: boolean
  ts: number
}
type Status =
  | 'idle'
  | 'requesting-mic'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'error'

const INITIAL_KICKOFF =
  "Begin the class now. " +
  "IMPORTANT — deliver this in SHORT CONVERSATIONAL CHUNKS, not as one long paragraph. One idea per sentence. Speak like a teacher at a whiteboard, not like someone reading an essay. " +
  "Start with one warm greeting sentence and say we are beginning Chapter 1 — Real Numbers, starting with Euclid's Division Lemma. " +
  "Then teach Concept 1 in natural short steps: " +
  "(a) Say what Euclid's Division Lemma is, in plain English. " +
  "(b) Give the 23 chocolates / 5 friends example — YOU walk through it step by step. Each step is one short sentence. " +
  "(c) After the example is clear, write the equation on its own line: 23 = 5 × 4 + 3 " +
  "(d) Explain what a, b, q, r mean briefly. " +
  "(e) Then write the general form on its own line: a = b × q + r " +
  "(f) End with ONE natural comprehension check (vary the phrase — 'Is that clear?', 'Are you with me?', 'Make sense?', etc.) and then STOP and wait. " +
  "Do NOT ask the student to solve anything in this first turn. You solve the example yourself. " +
  "Do NOT deliver everything as one connected paragraph."

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

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const aiSpeakingRef = useRef(false)
  const statusRef = useRef<Status>('idle')
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (status !== 'active') return
    const id = setInterval(() => setNowTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  // Track transcript items per event item_id
  const itemsRef = useRef<Map<string, TranscriptItem>>(new Map())

  const upsertItem = useCallback(
    (id: string, speaker: Speaker, updater: (prev: TranscriptItem) => TranscriptItem) => {
      const existing = itemsRef.current.get(id)
      const base: TranscriptItem = existing ?? {
        id,
        speaker,
        text: '',
        final: false,
        ts: Date.now(),
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

  const handleRealtimeEvent = useCallback(
    (evt: any) => {
      // Temporary debug — log the full event chain around the student pipeline so we can
      // verify short answers like "I don't know" flow through correctly.
      const isPipelineEvent =
        evt.type === 'session.created' ||
        evt.type === 'session.updated' ||
        evt.type === 'input_audio_buffer.speech_started' ||
        evt.type === 'input_audio_buffer.speech_stopped' ||
        evt.type === 'input_audio_buffer.committed' ||
        evt.type === 'conversation.item.created' ||
        evt.type === 'conversation.item.input_audio_transcription.delta' ||
        evt.type === 'conversation.item.input_audio_transcription.completed' ||
        evt.type === 'conversation.item.input_audio_transcription.failed' ||
        evt.type === 'response.created' ||
        evt.type === 'response.done' ||
        evt.type === 'response.cancelled' ||
        evt.type === 'error'

      if (isPipelineEvent) {
        console.log('[rt]', evt.type, {
          item_id: evt.item_id,
          previous_item_id: evt.previous_item_id,
          role: evt.item?.role,
          transcript: evt.transcript,
          error: evt.error?.message,
        })
      }

      switch (evt.type) {
        case 'session.created':
        case 'session.updated':
          break

        case 'input_audio_buffer.speech_started':
          setStudentSpeaking(true)
          // If AI is currently speaking, cancel that response so the teacher stops mid-sentence
          if (aiSpeakingRef.current) {
            console.log('[classroom] Student interrupted → sending response.cancel')
            sendEvent({ type: 'response.cancel' })
            // Duck any buffered audio still playing so the interrupt feels instant.
            const el = audioElRef.current
            if (el) {
              el.muted = true
              setTimeout(() => {
                if (audioElRef.current) audioElRef.current.muted = false
              }, 200)
            }
          }
          break
        case 'input_audio_buffer.speech_stopped':
          setStudentSpeaking(false)
          break

        // Student transcript (from whisper input transcription)
        case 'conversation.item.input_audio_transcription.delta': {
          const id = evt.item_id || evt.id
          const delta: string = evt.delta ?? ''
          if (!id || !delta) break
          upsertItem(id, 'student', (prev) => ({
            ...prev,
            speaker: 'student',
            text: (prev.text || '') + delta,
            final: false,
          }))
          break
        }
        case 'conversation.item.input_audio_transcription.completed': {
          const id = evt.item_id || evt.id
          const finalText: string = evt.transcript ?? ''
          if (!id) break
          upsertItem(id, 'student', (prev) => ({
            ...prev,
            speaker: 'student',
            text: finalText || prev.text,
            final: true,
          }))
          break
        }
        case 'conversation.item.input_audio_transcription.failed': {
          // Whisper failed to transcribe. Don't leave a fake student bubble that says
          // nothing — but we already committed audio, so let the AI hear silence and ignore.
          const id = evt.item_id
          if (id) {
            itemsRef.current.delete(id)
            setTranscript((prev) => prev.filter((p) => p.id !== id))
          }
          console.warn('[rt] transcription failed for item', evt.item_id, evt.error?.message)
          break
        }

        // AI teacher transcript (spoken audio → text)
        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta': {
          const id = evt.item_id || evt.response_id
          if (!id) break
          const delta: string = evt.delta ?? ''
          upsertItem(id, 'teacher', (prev) => ({
            ...prev,
            speaker: 'teacher',
            text: (prev.text || '') + delta,
            final: false,
          }))
          setAiSpeaking(true)
          aiSpeakingRef.current = true
          break
        }
        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done': {
          const id = evt.item_id || evt.response_id
          const finalText: string = evt.transcript ?? ''
          if (!id) break
          upsertItem(id, 'teacher', (prev) => ({
            ...prev,
            speaker: 'teacher',
            text: finalText || prev.text,
            final: true,
          }))
          break
        }

        case 'response.created':
          setAiSpeaking(true)
          aiSpeakingRef.current = true
          break
        case 'response.done':
        case 'response.completed':
        case 'response.cancelled':
          setAiSpeaking(false)
          aiSpeakingRef.current = false
          break

        case 'error': {
          const msg = evt?.error?.message || 'Realtime session error'
          setErrorMsg(msg)
          break
        }

        default:
          break
      }
    },
    [upsertItem]
  )

  const sendEvent = useCallback((event: Record<string, any>) => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== 'open') return
    dc.send(JSON.stringify(event))
  }, [])

  const startClass = useCallback(async () => {
    setErrorMsg('')
    setTranscript([])
    itemsRef.current.clear()

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
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(
        "We couldn't access your microphone. Please allow microphone permission and try again."
      )
      return
    }

    setStatus('connecting')

    // 1) Get ephemeral session from our server
    let sessionInfo: any
    try {
      const res = await fetch('/api/realtime-session', { method: 'POST' })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(`Session endpoint failed: ${res.status} ${t}`)
      }
      sessionInfo = await res.json()
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(
        "We couldn't start the class right now. Please check your connection and try again."
      )
      cleanupMedia()
      return
    }

    const ephemeralKey: string | undefined = sessionInfo?.client_secret?.value
    const model: string | undefined = sessionInfo?.model

    if (!ephemeralKey || !model) {
      setStatus('error')
      setErrorMsg('The class could not be initialized. Please try again.')
      cleanupMedia()
      return
    }

    // 2) Set up WebRTC
    const pc = new RTCPeerConnection()
    pcRef.current = pc

    // Play remote audio
    const audioEl = audioElRef.current || new Audio()
    audioEl.autoplay = true
    audioElRef.current = audioEl
    pc.ontrack = (e) => {
      const [remoteStream] = e.streams
      if (audioEl.srcObject !== remoteStream) {
        audioEl.srcObject = remoteStream
      }
    }

    // Add mic track
    micStream.getAudioTracks().forEach((track) => pc.addTrack(track, micStream))

    // Data channel for events
    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc

    dc.onopen = () => {
      // Kick off the class — the teacher speaks first.
      // Session is already fully configured server-side via client_secrets.
      sendEvent({
        type: 'response.create',
        response: {
          instructions: INITIAL_KICKOFF,
        },
      })
    }

    dc.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data)
        handleRealtimeEvent(evt)
      } catch {}
    }

    dc.onerror = () => {
      // Non-fatal — errors bubble via 'error' event too
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('[classroom] pc.connectionState →', state)
      if (state === 'connected') {
        setStatus('active')
        setStartedAt((v) => v ?? Date.now())
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        if (statusRef.current !== 'ended') {
          setAiSpeaking(false)
        }
      }
    }
    pc.oniceconnectionstatechange = () => {
      console.log('[classroom] pc.iceConnectionState →', pc.iceConnectionState)
    }
    pc.onsignalingstatechange = () => {
      console.log('[classroom] pc.signalingState →', pc.signalingState)
    }
    pc.onicegatheringstatechange = () => {
      console.log('[classroom] pc.iceGatheringState →', pc.iceGatheringState)
    }

    // 3) SDP offer / answer with OpenAI Realtime
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpUrl = `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`
      console.log('[classroom] SDP →', sdpUrl)
      const sdpRes = await fetch(sdpUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })
      if (!sdpRes.ok) {
        const errBody = await sdpRes.text()
        console.error(`[classroom] SDP ${sdpRes.status}:`, errBody)
        throw new Error(`SDP ${sdpRes.status}: ${errBody.slice(0, 200)}`)
      }
      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch (e: any) {
      console.error('[classroom] Connection failed:', e)
      setStatus('error')
      setErrorMsg(
        `Couldn't connect: ${e?.message ?? 'unknown error'}`
      )
      cleanupAll()
      return
    }
  }, [handleRealtimeEvent, sendEvent])

  const cleanupMedia = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
  }, [])

  const cleanupAll = useCallback(() => {
    try {
      dcRef.current?.close()
    } catch {}
    try {
      pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop())
    } catch {}
    try {
      pcRef.current?.close()
    } catch {}
    dcRef.current = null
    pcRef.current = null
    cleanupMedia()
    if (audioElRef.current) {
      try {
        audioElRef.current.srcObject = null
      } catch {}
    }
  }, [cleanupMedia])

  const toggleMute = useCallback(() => {
    const stream = micStreamRef.current
    if (!stream) return
    const next = !muted
    stream.getAudioTracks().forEach((t) => (t.enabled = !next))
    setMuted(next)
  }, [muted])

  const endClass = useCallback(() => {
    setShowEndConfirm(false)
    cleanupAll()
    setAiSpeaking(false)
    setStudentSpeaking(false)
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

  const durationText = useMemo(() => {
    if (!startedAt) return '—'
    const end = endedAt ?? Date.now()
    const s = Math.max(0, Math.floor((end - startedAt) / 1000))
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }, [startedAt, endedAt, nowTick])

  const conceptsCovered = useMemo(() => {
    const text = transcript
      .filter((t) => t.speaker === 'teacher')
      .map((t) => t.text.toLowerCase())
      .join(' ')
    const map: [string, string][] = [
      ['euclid', "Euclid's Division Lemma"],
      ['algorithm', "Euclid's Division Algorithm"],
      ['fundamental theorem', 'Fundamental Theorem of Arithmetic'],
      ['prime factor', 'Prime Factorisation'],
      ['hcf', 'HCF & LCM'],
      ['irrational', 'Irrational Numbers'],
      ['decimal', 'Decimal Expansions'],
    ]
    const seen = new Set<string>()
    map.forEach(([kw, label]) => {
      if (text.includes(kw)) seen.add(label)
    })
    return Array.from(seen)
  }, [transcript])

  const micStatusText =
    status === 'connecting' || status === 'requesting-mic'
      ? 'Connecting...'
      : status === 'ended'
      ? 'Class ended'
      : status === 'error'
      ? 'Not connected'
      : muted
      ? 'Muted'
      : aiSpeaking
      ? 'AI is speaking...'
      : studentSpeaking
      ? 'Listening...'
      : 'Ready'

  return (
    <main className="cr-root">
      <header className="cr-header">
        <a href="/" className="cr-brand">
          <span className="cr-brand-dot" />
          <span className="cr-brand-name">AI-Gurukool</span>
        </a>
        <div className="cr-header-meta">
          <div className="cr-chip">
            <span className="cr-chip-label">Chapter 1</span>
            <span className="cr-chip-value">Real Numbers</span>
          </div>
          {status === 'active' && (
            <div className="cr-chip cr-chip-live">
              <span className="cr-live-dot" /> Live
            </div>
          )}
        </div>
      </header>

      {status === 'idle' && (
        <section className="cr-intro">
          <div className="cr-intro-card">
            <div className="cr-eyebrow">AI-Gurukool</div>
            <h1 className="cr-title">Class 10 Mathematics</h1>
            <div className="cr-subtitle">Chapter 1 — Real Numbers</div>
            <p className="cr-desc">
              Learn Real Numbers step by step with your AI Mathematics Teacher.
            </p>
            <button className="cr-cta" onClick={startClass}>
              Start Class
            </button>
            <div className="cr-intro-hint">
              You will be asked to allow microphone access. The AI teacher will
              begin the lesson as soon as we connect.
            </div>
          </div>
        </section>
      )}

      {(status === 'requesting-mic' ||
        status === 'connecting' ||
        status === 'active' ||
        status === 'ended' ||
        status === 'error') && (
        <section className="cr-stage">
          <div className="cr-teacher-panel">
            <div
              className={
                'cr-orb ' +
                (aiSpeaking ? 'cr-orb-speaking ' : '') +
                (studentSpeaking ? 'cr-orb-listening ' : '') +
                (status === 'connecting' || status === 'requesting-mic'
                  ? 'cr-orb-connecting '
                  : '')
              }
            >
              <div className="cr-orb-core" />
              <div className="cr-orb-ring cr-orb-ring-1" />
              <div className="cr-orb-ring cr-orb-ring-2" />
              <div className="cr-orb-ring cr-orb-ring-3" />
            </div>
            <div className="cr-teacher-name">AI Mathematics Teacher</div>
            <div className="cr-teacher-sub">
              {status === 'ended'
                ? 'Class completed'
                : status === 'active'
                ? aiSpeaking
                  ? 'Explaining a concept...'
                  : studentSpeaking
                  ? 'Listening to you...'
                  : 'Ready when you are'
                : status === 'error'
                ? 'Disconnected'
                : 'Connecting to your teacher...'}
            </div>

            <div className="cr-progress">
              <div className="cr-progress-label">Progress</div>
              <div className="cr-progress-bar">
                <div
                  className="cr-progress-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(6, (conceptsCovered.length / 7) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="cr-progress-meta">
                Concept {Math.max(1, conceptsCovered.length)} of 7
              </div>
            </div>
          </div>

          <div className="cr-transcript-panel">
            <div className="cr-transcript-header">
              <div className="cr-transcript-title">Live Transcript</div>
              <div className="cr-transcript-sub">
                Everything you and the teacher say appears here in real time.
              </div>
            </div>
            <div className="cr-transcript-body">
              {transcript.length === 0 && status !== 'ended' && (
                <div className="cr-empty">
                  {status === 'active'
                    ? 'Your teacher is about to begin...'
                    : 'Setting up your classroom...'}
                </div>
              )}
              {[...transcript].sort((a, b) => a.ts - b.ts).map((item) => (
                <TranscriptRow key={item.id} item={item} />
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </section>
      )}

      {status !== 'idle' && (
        <footer className="cr-controls">
          <div className="cr-controls-inner">
            <div className="cr-status">
              <div
                className={
                  'cr-status-dot ' +
                  (status === 'active'
                    ? muted
                      ? 'cr-status-muted'
                      : aiSpeaking
                      ? 'cr-status-speaking'
                      : 'cr-status-live'
                    : status === 'ended'
                    ? 'cr-status-ended'
                    : 'cr-status-connecting')
                }
              />
              <div className="cr-status-text">{micStatusText}</div>
              {status === 'active' && (
                <div className="cr-timer">{durationText}</div>
              )}
            </div>

            {status === 'active' && (
              <div className="cr-controls-buttons">
                <button
                  className={'cr-btn cr-btn-mic ' + (muted ? 'cr-btn-mic-off' : '')}
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  className="cr-btn cr-btn-end"
                  onClick={() => setShowEndConfirm(true)}
                >
                  End Class
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="cr-controls-buttons">
                <button className="cr-btn cr-btn-mic" onClick={startClass}>
                  Try Again
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="cr-error-banner" role="alert">
              {errorMsg}
            </div>
          )}
        </footer>
      )}

      {status === 'ended' && (
        <section className="cr-summary">
          <div className="cr-summary-card">
            <div className="cr-summary-eyebrow">Class Completed</div>
            <h2 className="cr-summary-title">Chapter 1 — Real Numbers</h2>
            <div className="cr-summary-grid">
              <div className="cr-summary-stat">
                <div className="cr-summary-stat-label">Duration</div>
                <div className="cr-summary-stat-value">{durationText}</div>
              </div>
              <div className="cr-summary-stat">
                <div className="cr-summary-stat-label">Concepts Covered</div>
                <div className="cr-summary-stat-value">
                  {conceptsCovered.length || 0}
                </div>
              </div>
              <div className="cr-summary-stat">
                <div className="cr-summary-stat-label">Exchanges</div>
                <div className="cr-summary-stat-value">{transcript.length}</div>
              </div>
            </div>
            {conceptsCovered.length > 0 && (
              <div className="cr-summary-covered">
                <div className="cr-summary-covered-label">What you learned</div>
                <ul className="cr-summary-covered-list">
                  {conceptsCovered.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="cr-summary-actions">
              <a href="/" className="cr-btn cr-btn-mic">
                Back to Home
              </a>
              <button
                className="cr-btn cr-btn-end"
                onClick={() => {
                  setStatus('idle')
                  setStartedAt(null)
                  setEndedAt(null)
                  setTranscript([])
                  itemsRef.current.clear()
                }}
              >
                Start New Class
              </button>
            </div>
          </div>
        </section>
      )}

      {showEndConfirm && (
        <div className="cr-modal-backdrop" onClick={() => setShowEndConfirm(false)}>
          <div className="cr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cr-modal-title">End this class?</div>
            <div className="cr-modal-desc">
              Your transcript will remain visible so you can review what you
              learned.
            </div>
            <div className="cr-modal-actions">
              <button
                className="cr-btn cr-btn-mic"
                onClick={() => setShowEndConfirm(false)}
              >
                Continue Class
              </button>
              <button className="cr-btn cr-btn-end" onClick={endClass}>
                End Class
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioElRef} hidden />
    </main>
  )
}

function TranscriptRow({ item }: { item: TranscriptItem }) {
  const isTeacher = item.speaker === 'teacher'
  const parts = splitByEquations(item.text)
  return (
    <div className={'cr-msg ' + (isTeacher ? 'cr-msg-teacher' : 'cr-msg-student')}>
      <div className="cr-msg-role">
        {isTeacher ? 'AI Teacher' : 'Student'}
        {!item.final && <span className="cr-msg-partial"> · listening</span>}
      </div>
      <div className="cr-msg-text">
        {parts.map((p, i) =>
          p.type === 'eq' ? (
            <div key={i} className="cr-eq">
              {p.text}
            </div>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </div>
    </div>
  )
}

// Split text into text/equation blocks. Detect lines that look like equations
// (contain '=' and math symbols/digits, and don't have too many normal words).
// Math symbols we recognise in equations
const MATH_OPS = /[=<>≤≥×÷±√²³^*/·]/

function isEquationLine(line: string): boolean {
  if (!line || line.length > 60) return false
  // Must contain at least one math operator
  if (!MATH_OPS.test(line)) return false
  // Must contain at least one digit or known variable (a,b,q,r,n,x,y,z)
  if (!/[0-9a-z]/i.test(line)) return false
  // Must be short (equation-length, not a sentence)
  if (line.split(' ').length > 14) return false
  // Must NOT look like a sentence (no verb-like words, no commas ending)
  if (/\.$/.test(line) && !/[=<>≤≥]/.test(line)) return false
  // Common patterns:
  //   23 = 5 × 4 + 3
  //   a = b × q + r
  //   0 ≤ r < b
  //   HCF = 45
  //   Step 1: 225 = 135 × 1 + 90  ← only if short enough
  if (/[=<>≤≥]/.test(line) && MATH_OPS.test(line)) return true
  return false
}

function splitByEquations(text: string): { type: 'text' | 'eq'; text: string }[] {
  if (!text) return [{ type: 'text', text: '' }]
  const lines = text.split(/\n+/)
  const out: { type: 'text' | 'eq'; text: string }[] = []
  let buf: string[] = []
  const flush = () => {
    if (buf.length) {
      out.push({ type: 'text', text: buf.join(' ') })
      buf = []
    }
  }
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (isEquationLine(line)) {
      flush()
      out.push({ type: 'eq', text: line })
    } else {
      buf.push(line)
    }
  }
  flush()
  return out.length ? out : [{ type: 'text', text }]
}
