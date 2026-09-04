'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

const INITIAL_KICKOFF =
  "Begin the class now. Follow STEP 1 from your instructions exactly: " +
  "say 'Hi there! This is your AI-Gurukool teacher — what subject would you like to study today?' " +
  "Say nothing else after that. Go completely silent and wait for the student to answer."

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

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)   // AI video (ai_video.mp4)
  const studentVideoRef = useRef<HTMLVideoElement | null>(null) // Student video (ai_video2.mp4)
  const currentAvatarModeRef = useRef<'idle' | 'ai' | 'student'>('idle')
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const aiSpeakingRef = useRef(false)
  const statusRef = useRef<Status>('idle')
  const [nowTick, setNowTick] = useState(0)

  const aiSpeakStartRef = useRef<number>(0)
  const kickoffSentRef = useRef<boolean>(false)
  const reconnectAttemptsRef = useRef<number>(0)
  const skipTranscriptResetRef = useRef<boolean>(false)
  const startClassRef = useRef<() => void>(() => {})

  // Buffered teacher transcript text — only revealed when audio is actually playing,
  // so what the student SEES matches what they HEAR (no more transcript-ahead-of-voice).
  const teacherBufferRef = useRef<Map<string, string>>(new Map())
  const audioPlayingRef = useRef<boolean>(false)
  const revealTimerRef = useRef<any>(null)

  // ─── AVATAR SYNC (Web Audio analyser) ─────────────────────
  // WebRTC MediaStreams never fire onpause/onended between AI turns — they play silence.
  // So we analyse the actual waveform via AnalyserNode. This IS the AI audio playback.
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const analyserSrcRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioActiveRef = useRef<boolean>(false)          // TRUE when waveform > threshold
  const silenceSinceRef = useRef<number>(0)              // ts (ms) since we first saw silence
  // Turn generation: incremented on every response.created. The video only resets to 0
  // when it hasn't yet started for the CURRENT turn — so stale audio-start signals from
  // an old turn can't reset a video that's already playing for the new turn.
  const currentTurnIdRef = useRef<number>(0)
  const videoStartedForTurnRef = useRef<number>(-1)
  // True between response.created and response.done/completed/cancelled. THIS defines
  // "the AI is currently in a speaking turn." Micro-silences within a turn (breaths,
  // sentence boundaries) do NOT pause the video — only turn end does.
  const turnActiveRef = useRef<boolean>(false)

  const SILENCE_THRESHOLD = 0.008   // RMS below this = silent
  // Sustained silence needed to declare "AI truly finished." Kept LONG so that
  // any natural inter-sentence pause (200–500ms) cannot trigger a switch back
  // to the student video while the AI response is still in progress.
  const SILENCE_HOLD_MS   = 900

  // Central tracer — every video state transition should go through this so you
  // can see in the browser console EXACTLY what triggered each switch.
  const traceVideo = (trigger: string, extra?: Record<string, any>) => {
    const av = videoElRef.current
    const sv = studentVideoRef.current
    console.log(
      `[VIDEO] ${trigger}`,
      {
        mode: currentAvatarModeRef.current,
        turnActive: turnActiveRef.current,
        aiSpeaking: aiSpeakingRef.current,
        audioActive: audioActiveRef.current,
        turnId: currentTurnIdRef.current,
        ai: av ? { display: av.style.display, paused: av.paused, t: +av.currentTime.toFixed(2) } : null,
        student: sv ? { display: sv.style.display, paused: sv.paused, t: +sv.currentTime.toFixed(2) } : null,
        ...(extra || {}),
      }
    )
  }

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

  const sendEvent = useCallback((event: Record<string, any>) => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== 'open') return
    dc.send(JSON.stringify(event))
  }, [])

  // Reveal buffered teacher text into the visible transcript, char-by-char,
  // paced only while audio is actively playing. Keeps subtitles in sync with voice.
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

  const handleRealtimeEvent = useCallback(
    (evt: any) => {
      switch (evt.type) {
        case 'session.created':
        case 'session.updated':
          break

        case 'input_audio_buffer.speech_started':
          traceVideo('EVENT: speech_started (student began)')
          setStudentSpeaking(true)
          // Interrupt the AI IMMEDIATELY whenever the student starts speaking,
          // even mid-sentence. No 800ms grace — the video and the audio must
          // both switch to the student the moment they begin talking.
          if (turnActiveRef.current || aiSpeakingRef.current) {
            sendEvent({ type: 'response.cancel' })
            // Mark the AI turn as ended locally so response.cancelled arriving
            // later is a no-op for the avatar (student mode is already active).
            turnActiveRef.current = false
            aiSpeakingRef.current = false
            audioPlayingRef.current = false
            setAiSpeaking(false)
          }
          // Switch avatar to student video — only on first start of a student turn
          if (currentAvatarModeRef.current !== 'student') {
            currentAvatarModeRef.current = 'student'
            const av = videoElRef.current
            if (av) { av.style.display = 'none'; try { av.pause() } catch {} }
            const sv = studentVideoRef.current
            console.log('[AVATAR] student speech detected', {
              exists: !!sv,
              readyState: sv?.readyState,
              currentTime: sv?.currentTime,
              paused: sv?.paused,
              src: sv?.currentSrc,
            })
            if (sv) {
              sv.style.display = 'block'
              sv.muted = true
              // playsInline attribute is on the element; ensure the property is on too
              ;(sv as any).playsInline = true
              const tryPlay = () => {
                try { sv.currentTime = 0 } catch {}
                const p = sv.play()
                if (p && typeof p.then === 'function') {
                  p.then(() => {
                    console.log('[AVATAR] student video play OK', {
                      readyState: sv.readyState, currentTime: sv.currentTime, paused: sv.paused,
                    })
                  }).catch((err) => {
                    console.warn('[AVATAR] student video play FAILED', err?.message || err, {
                      readyState: sv.readyState,
                    })
                    // Retry when the video is actually ready
                    const onReady = () => {
                      sv.removeEventListener('canplay', onReady)
                      sv.removeEventListener('loadeddata', onReady)
                      if (currentAvatarModeRef.current !== 'student') return
                      try { sv.currentTime = 0 } catch {}
                      sv.play().then(() => {
                        console.log('[AVATAR] student video play OK (retry)')
                      }).catch((e2) => {
                        console.warn('[AVATAR] student video retry FAILED', e2?.message || e2)
                      })
                    }
                    sv.addEventListener('canplay', onReady)
                    sv.addEventListener('loadeddata', onReady)
                    try { sv.load() } catch {}
                  })
                }
              }
              if (sv.readyState >= 2) {
                tryPlay()
              } else {
                console.log('[AVATAR] student video not ready — waiting for loadeddata')
                const onReady = () => {
                  sv.removeEventListener('canplay', onReady)
                  sv.removeEventListener('loadeddata', onReady)
                  if (currentAvatarModeRef.current !== 'student') return
                  tryPlay()
                }
                sv.addEventListener('canplay', onReady)
                sv.addEventListener('loadeddata', onReady)
                try { sv.load() } catch {}
                // Also attempt immediate play — some browsers succeed even at readyState 0
                tryPlay()
              }
            }
          }
          break
        case 'input_audio_buffer.speech_stopped':
          traceVideo('EVENT: speech_stopped (student ended)')
          setStudentSpeaking(false)
          setProcessingResponse(true)
          // Pause student video; wait for AI to start before showing AI video
          if (currentAvatarModeRef.current === 'student') {
            currentAvatarModeRef.current = 'idle'
            const sv = studentVideoRef.current
            if (sv) { try { sv.pause() } catch {} }
          }
          break

        case 'conversation.item.input_audio_transcription.delta': {
          const id = evt.item_id || evt.id
          const delta: string = evt.delta ?? ''
          if (!id || !delta) break
          if (/[^\x00-\x7F]/.test(delta)) break
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
          const cleaned = finalText.trim()
          const hasNonLatin = /[^\x00-\x7F]/.test(cleaned)
          const hasAsciiLetter = /[a-zA-Z]/.test(cleaned)
          const NOISE_PHRASES = [
            'thank you', 'thank you for watching', 'thanks for watching',
            'please subscribe', 'subscribe', 'music playing', 'applause',
            'background music', 'inaudible', 'laughter',
          ]
          const isKnownHallucination = NOISE_PHRASES.some(p => cleaned.toLowerCase() === p)
          const looksLikeNoise =
            cleaned.length < 4 ||
            (!/\s/.test(cleaned) && cleaned.length < 8) ||
            hasNonLatin ||
            !hasAsciiLetter ||
            isKnownHallucination
          if (looksLikeNoise) {
            itemsRef.current.delete(id)
            setTranscript((prev) => prev.filter((p) => p.id !== id))
            break
          }
          upsertItem(id, 'student', (prev) => ({
            ...prev,
            speaker: 'student',
            text: cleaned || prev.text,
            final: true,
          }))
          // Detect subject from early student messages (first 3 exchanges only)
          setCurrentSubject(prev => {
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
          break
        }
        case 'conversation.item.input_audio_transcription.failed': {
          const id = evt.item_id
          if (id) {
            itemsRef.current.delete(id)
            setTranscript((prev) => prev.filter((p) => p.id !== id))
          }
          break
        }

        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta': {
          const id = evt.item_id || evt.response_id
          if (!id) break
          const delta: string = evt.delta ?? ''
          if (!delta) break
          // Transcript is captions ONLY. It never controls the avatar video.
          const prev = teacherBufferRef.current.get(id) || ''
          teacherBufferRef.current.set(id, prev + delta)
          upsertItem(id, 'teacher', (p) => ({ ...p, speaker: 'teacher' }))
          if (audioPlayingRef.current) startTeacherReveal()
          break
        }
        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done': {
          const id = evt.item_id || evt.response_id
          const finalText: string = evt.transcript ?? ''
          if (!id) break
          // Flush any remaining buffered text into the visible row, then mark final
          const remaining = teacherBufferRef.current.get(id) || ''
          teacherBufferRef.current.set(id, '')
          upsertItem(id, 'teacher', (prev) => ({
            ...prev,
            speaker: 'teacher',
            text: finalText || (prev.text || '') + remaining,
            final: true,
          }))
          break
        }

        case 'response.created': {
          // NEW logical turn — start AI video immediately so it's never delayed by
          // AudioContext state or RTP/SCTP ordering. The analyser still handles hiding.
          currentTurnIdRef.current += 1
          const newTurn = currentTurnIdRef.current
          turnActiveRef.current = true
          aiSpeakStartRef.current = Date.now()
          aiSpeakingRef.current = true
          setAiSpeaking(true)
          setProcessingResponse(false)
          traceVideo('EVENT: response.created → trigger AI video', { newTurn })
          if (currentAvatarModeRef.current !== 'student') {
            const v = videoElRef.current
            if (v) {
              videoStartedForTurnRef.current = newTurn
              currentAvatarModeRef.current = 'ai'
              const sv = studentVideoRef.current
              if (sv) { sv.style.display = 'none'; try { sv.pause() } catch {} }
              v.style.display = 'block'
              v.currentTime = 0
              v.play().catch(() => {})
              console.log('[AVATAR] VIDEO START on response.created turn=' + newTurn)
            }
          }
          break
        }
        case 'response.done':
        case 'response.completed':
        case 'response.cancelled':
          // Turn ended on SCTP data channel — but audio (RTP) may still be draining
          // from the WebRTC jitter buffer. DO NOT hide the video here; let onAudioActiveStop
          // do it once the analyser confirms sustained true silence.
          traceVideo('EVENT: ' + evt.type + ' (AI turn ended)', { evtType: evt.type })
          turnActiveRef.current = false
          aiSpeakingRef.current = false
          // Don't set audioPlayingRef=false here — audio may still be draining.
          // onAudioActiveStop will do it when waveform goes silent.
          setAiSpeaking(false)
          // If student interrupted, leave student mode alone.
          // If we're in AI mode, leave the video PLAYING until analyser calls onAudioActiveStop.
          if (currentAvatarModeRef.current === 'ai') {
            if (!audioActiveRef.current) {
              // Analyser already declared silence before response.done arrived — hide now.
              currentAvatarModeRef.current = 'student'
              const v = videoElRef.current
              if (v) { try { v.pause() } catch {}; v.style.display = 'none' }
              console.log('[AVATAR] VIDEO HIDDEN immediately (audio already silent)')
              // AI finished — automatically show student video (no speech_started needed)
              const sv = studentVideoRef.current
              if (sv) {
                sv.style.display = 'block'
                try { sv.currentTime = 0 } catch {}
                sv.play().catch(() => {
                  const onReady = () => {
                    sv.removeEventListener('canplay', onReady)
                    if (currentAvatarModeRef.current !== 'student') return
                    try { sv.currentTime = 0 } catch {}
                    sv.play().catch(() => {})
                  }
                  sv.addEventListener('canplay', onReady)
                })
                console.log('[AVATAR] student video AUTO-START (AI complete, immediate)')
              }
            } else {
              // Audio still flowing — defer hide to onAudioActiveStop.
              console.log('[AVATAR] deferring video hide to analyser (audio still active)')
            }
          }
          break

        case 'error': {
          const msg: string = evt?.error?.message || 'Realtime session error'
          if (/no active response/i.test(msg) || /Cancellation failed/i.test(msg)) {
            console.warn('[rt] benign cancel race:', msg)
            break
          }
          setErrorMsg(msg)
          break
        }

        default:
          break
      }
    },
    [upsertItem, sendEvent, startTeacherReveal]
  )

  // ─── Audio-waveform analyser: SOLE source of truth for AI-speaking ───
  const stopAudioAnalyser = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try { analyserSrcRef.current?.disconnect() } catch {}
    try { analyserRef.current?.disconnect() } catch {}
    analyserSrcRef.current = null
    analyserRef.current = null
    try { audioCtxRef.current?.close() } catch {}
    audioCtxRef.current = null
    audioActiveRef.current = false
    silenceSinceRef.current = 0
  }, [])

  const onAudioActiveStart = useCallback(() => {
    const turn = currentTurnIdRef.current
    const now = Date.now()
    traceVideo('ANALYSER: audio active (rising edge) → AI video', { turn })
    aiSpeakingRef.current = true
    aiSpeakStartRef.current = now
    audioPlayingRef.current = true
    setAiSpeaking(true)
    startTeacherReveal()

    // If student is actively speaking, do not override their video with AI video.
    if (currentAvatarModeRef.current === 'student') return
    // NOTE: do NOT gate on turnActiveRef here. Audio arrives on the WebRTC RTP path
    // and response.created arrives on the SCTP data channel — they aren't ordered.
    // If we required response.created first, audio could start before we allow the
    // video, causing "AI is talking but video is frozen." Micro-pauses are already
    // handled by the STOP path (see onAudioActiveStop's turnActiveRef guard).

    const v = videoElRef.current
    if (!v) return

    const isNewTurn = videoStartedForTurnRef.current !== turn
    const needsSwitch = currentAvatarModeRef.current !== 'ai'

    if (isNewTurn || needsSwitch) {
      videoStartedForTurnRef.current = turn
      currentAvatarModeRef.current = 'ai'
      // Hide student video, show AI video
      const sv = studentVideoRef.current
      if (sv) { sv.style.display = 'none'; try { sv.pause() } catch {} }
      v.style.display = 'block'
      v.currentTime = 0
      console.log('[AVATAR] VIDEO START currentTime=0 turn=' + turn)
    } else {
      console.log('[AVATAR] VIDEO RESUME currentTime=' + v.currentTime.toFixed(2) + ' turn=' + turn)
    }
    v.play().catch(() => {})
  }, [startTeacherReveal])

  const onAudioActiveStop = useCallback(() => {
    // Waveform dipped silent. If the AI turn is still active (no response.done yet),
    // this is a natural gap between words/sentences — DO NOT hide the video.
    if (turnActiveRef.current) {
      traceVideo('ANALYSER: silence IGNORED — turn still active')
      return
    }
    // Extra defense: if we're in AI mode AND the AI is still marked as speaking
    // (aiSpeakingRef), refuse to switch. Some events can flip turnActiveRef before
    // aiSpeakingRef, and we never want a fluctuation to bounce us to the student.
    if (currentAvatarModeRef.current === 'ai' && aiSpeakingRef.current) {
      traceVideo('ANALYSER: silence IGNORED — mode=ai + aiSpeaking=true')
      return
    }
    // Turn has ended AND audio has truly gone silent — now safe to hide AI video.
    traceVideo('ANALYSER: silence CONFIRMED → switch AI → student')
    aiSpeakingRef.current = false
    audioPlayingRef.current = false
    setAiSpeaking(false)
    if (currentAvatarModeRef.current === 'ai') {
      currentAvatarModeRef.current = 'student'
      const v = videoElRef.current
      if (v) {
        try { v.pause() } catch {}
        v.style.display = 'none'
        console.log('[AVATAR] VIDEO HIDDEN at currentTime=' + v.currentTime.toFixed(2))
      }
      // AI finished and audio truly silent — automatically show student video
      const sv = studentVideoRef.current
      if (sv) {
        sv.style.display = 'block'
        try { sv.currentTime = 0 } catch {}
        sv.play().catch(() => {
          const onReady = () => {
            sv.removeEventListener('canplay', onReady)
            if (currentAvatarModeRef.current !== 'student') return
            try { sv.currentTime = 0 } catch {}
            sv.play().catch(() => {})
          }
          sv.addEventListener('canplay', onReady)
        })
        console.log('[AVATAR] student video AUTO-START (AI complete, analyser confirmed)')
      }
    }
  }, [])

  const startAudioAnalyser = useCallback((stream: MediaStream) => {
    stopAudioAnalyser()
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext)
      const ctx: AudioContext = new AC()
      // AudioContext created in an async callback has no user-gesture context,
      // so Chrome starts it suspended. Resume it immediately so the analyser
      // can actually read audio data.
      ctx.resume().catch(() => {})
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      analyserSrcRef.current = src
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0
      src.connect(analyser)
      analyserRef.current = analyser
      const buf = new Uint8Array(analyser.fftSize)

      const tick = () => {
        const a = analyserRef.current
        if (!a) return
        a.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / buf.length)
        const now = Date.now()

        if (rms > SILENCE_THRESHOLD) {
          silenceSinceRef.current = 0
          if (!audioActiveRef.current) {
            audioActiveRef.current = true
            onAudioActiveStart()
          }
        } else if (audioActiveRef.current) {
          // Below threshold — could be inter-word gap OR end of turn.
          // Require SILENCE_HOLD_MS of continuous silence to declare end.
          if (silenceSinceRef.current === 0) silenceSinceRef.current = now
          else if (now - silenceSinceRef.current >= SILENCE_HOLD_MS) {
            audioActiveRef.current = false
            silenceSinceRef.current = 0
            onAudioActiveStop()
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      console.warn('[AVATAR] analyser setup failed', e)
    }
  }, [onAudioActiveStart, onAudioActiveStop, stopAudioAnalyser])

  const cleanupMedia = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
  }, [])

  const cleanupAll = useCallback(() => {
    stopAudioAnalyser()
    try { dcRef.current?.close() } catch {}
    try { pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop()) } catch {}
    try { pcRef.current?.close() } catch {}
    dcRef.current = null
    pcRef.current = null
    cleanupMedia()
    if (audioElRef.current) {
      try { audioElRef.current.srcObject = null } catch {}
    }
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
    aiSpeakingRef.current = false
    videoStartedForTurnRef.current = -1
    turnActiveRef.current = false
  }, [cleanupMedia, stopAudioAnalyser])

  const startClass = useCallback(async () => {
    setErrorMsg('')
    if (!skipTranscriptResetRef.current) {
      setTranscript([])
      itemsRef.current.clear()
      setCurrentSubject(null)
      reconnectAttemptsRef.current = 0
    }
    skipTranscriptResetRef.current = false
    kickoffSentRef.current = false
    teacherBufferRef.current.clear()

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
      const res = await fetch('/api/realtime-session', { method: 'POST' })
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

    const ephemeralKey: string | undefined = sessionInfo?.client_secret?.value
    const model: string | undefined = sessionInfo?.model
    const expiresAtRaw: number | undefined = sessionInfo?.client_secret?.expires_at
    if (expiresAtRaw) setSessionExpiresAt(expiresAtRaw * 1000)

    if (!ephemeralKey || !model) {
      setStatus('error')
      setErrorMsg('The class could not be initialized. Please try again.')
      cleanupMedia()
      return
    }

    const pc = new RTCPeerConnection()
    pcRef.current = pc

    const audioEl = audioElRef.current || new Audio()
    audioEl.autoplay = true
    audioEl.muted = false
    audioElRef.current = audioEl
    pc.ontrack = (e) => {
      const [remoteStream] = e.streams
      if (audioEl.srcObject !== remoteStream) {
        audioEl.srcObject = remoteStream
      }
      // Hook the analyser to the SAME MediaStream. This is the single source of truth
      // for whether the AI is actually producing audible speech right now.
      startAudioAnalyser(remoteStream)
    }

    micStream.getAudioTracks().forEach((track) => pc.addTrack(track, micStream))

    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc

    dc.onopen = () => {
      if (kickoffSentRef.current) return
      kickoffSentRef.current = true
      sendEvent({
        type: 'response.create',
        response: { instructions: INITIAL_KICKOFF },
      })
    }

    dc.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data)
        handleRealtimeEvent(evt)
      } catch {}
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'connected') {
        setStatus('active')
        setStartedAt((v) => v ?? Date.now())
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        if (statusRef.current !== 'ended') {
          setAiSpeaking(false)
          setProcessingResponse(false)
          if (state !== 'closed' && reconnectAttemptsRef.current < 2) {
            reconnectAttemptsRef.current += 1
            setStatus('reconnecting')
            skipTranscriptResetRef.current = true
            setTimeout(() => {
              if (statusRef.current !== 'ended') startClassRef.current()
            }, 2000)
          }
        }
      }
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpUrl = `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`
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
        throw new Error(`SDP ${sdpRes.status}: ${errBody.slice(0, 200)}`)
      }
      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(`Couldn't connect: ${e?.message ?? 'unknown error'}`)
      cleanupAll()
      return
    }
  }, [handleRealtimeEvent, sendEvent, cleanupMedia, cleanupAll])

  // Keep ref current so reconnect timeout can call it without a stale closure
  useEffect(() => { startClassRef.current = startClass }, [startClass])

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

  // Session expiry warning — show banner 5 minutes before key expires
  useEffect(() => {
    if (!sessionExpiresAt || status !== 'active') return
    const msUntilWarning = sessionExpiresAt - Date.now() - 5 * 60 * 1000
    if (msUntilWarning <= 0) { setExpiryWarning(true); return }
    const t = setTimeout(() => setExpiryWarning(true), msUntilWarning)
    return () => clearTimeout(t)
  }, [sessionExpiresAt, status])

  // The HTML audio element is only a sink for the WebRTC MediaStream — it plays the
  // sound. It does NOT drive AI-speaking state (that comes from the waveform analyser).
  const attachAudioListeners = useCallback((el: HTMLAudioElement | null) => {
    audioElRef.current = el
  }, [])

  const durationText = useMemo(() => {
    if (!startedAt) return '00:00'
    const end = endedAt ?? Date.now()
    const s = Math.max(0, Math.floor((end - startedAt) / 1000))
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
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
            currentTurnIdRef={currentTurnIdRef}
          />
          {/* Student avatar video — shown while student is speaking */}
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

      {/* OpenAI TTS audio — this is what the student hears. */}
      <audio ref={attachAudioListeners} hidden autoPlay />
    </main>
  )
}

// ─── Avatar video sub-components ──────────────────────────────────────────────
// Using named components with stable useCallback refs so React re-renders in the
// parent never reset el.style.display (display is managed imperatively, not via props).

function AiVideo({
  videoElRef,
  currentAvatarModeRef,
  currentTurnIdRef,
}: {
  videoElRef: React.MutableRefObject<HTMLVideoElement | null>
  currentAvatarModeRef: React.MutableRefObject<'idle' | 'ai' | 'student'>
  currentTurnIdRef: React.MutableRefObject<number>
}) {
  const stableRef = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el
    if (!el) return
    el.style.display = 'none'   // hidden until AI speaks
    el.onended = () => {
      if (currentAvatarModeRef.current === 'ai') {
        el.currentTime = 0
        el.play().catch(() => {})
        console.log('[AVATAR] VIDEO LOOP currentTime=0 turn=' + currentTurnIdRef.current)
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
    // connects / starts speaking. Once the AI actually begins its response,
    // the existing switching logic (response.created / onAudioActiveStart)
    // will hide this and show the AI video.
    el.style.display = 'block'
    el.muted = true
    ;(el as any).playsInline = true
    // Loop on end regardless of mode while we're still in the pre-AI state;
    // once mode becomes 'ai', the AI video takes over and this element is hidden.
    el.onended = () => {
      if (currentAvatarModeRef.current !== 'ai') {
        el.currentTime = 0
        el.play().catch(() => {})
      }
    }
    // Kick off playback immediately on mount so the student sees the avatar
    // instead of a black frame while the WebRTC connection is being set up.
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
