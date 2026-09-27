// Browser-side audio helpers for Gemini Live.
//
// Two responsibilities:
//   1. MicPcmCapture — capture the user's mic as 16 kHz mono PCM16 LE and
//      hand it to a caller as base64-encoded chunks (Gemini's realtime input
//      format).
//   2. PcmPlaybackQueue — decode Gemini's 24 kHz mono PCM16 LE audio chunks
//      and play them back seamlessly through a single AudioContext, with a
//      hard "clear queue now" primitive for barge-in / interruption.
//
// These are pure browser code and must only be imported from client
// ("use client") files.

import { INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from './config'

// ---------- shared base64 helpers ----------

export function base64FromInt16(pcm: Int16Array): string {
  // View the Int16Array as bytes without copying, then base64-encode.
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK))
    )
  }
  return btoa(bin)
}

export function int16FromBase64(b64: string): Int16Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  // Copy into a properly-aligned buffer for Int16Array.
  const aligned = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(aligned).set(bytes)
  return new Int16Array(aligned)
}

// ---------- mic capture ----------

export type MicChunkHandler = (base64Pcm16: string) => void

export class MicPcmCapture {
  private stream: MediaStream
  private ctx: AudioContext | null = null
  private src: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private onChunk: MicChunkHandler
  private muted = false
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null

  constructor(stream: MediaStream, onChunk: MicChunkHandler) {
    this.stream = stream
    this.onChunk = onChunk
  }

  async start() {
    // We deliberately request the AudioContext at Gemini's expected input rate
    // (16 kHz). Chrome/Firefox will resample the mic input into this rate for
    // us, so we don't need a separate resampler in JS.
    const AC =
      (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx: AudioContext = new AC({ sampleRate: INPUT_SAMPLE_RATE })
    this.ctx = ctx
    // AudioContext created inside an async callback has no user-gesture
    // context — Chrome starts it suspended. Resume so the processor fires.
    try { await ctx.resume() } catch {}

    const src = ctx.createMediaStreamSource(this.stream)
    this.src = src

    // ScriptProcessorNode is deprecated but universally supported and avoids
    // shipping an AudioWorklet module for what is a very simple job (PCM16
    // conversion + base64 emit). Buffer size 4096 @ 16 kHz ≈ 256 ms of audio.
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    this.processor = processor

    processor.onaudioprocess = (ev) => {
      if (this.muted) return
      const input = ev.inputBuffer.getChannelData(0)
      // Float32 [-1, 1] → Int16 LE.
      const pcm = new Int16Array(input.length)
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]))
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      this.onChunk(base64FromInt16(pcm))
    }

    // ScriptProcessorNode only runs when connected to a destination. We route
    // to a silent sink (MediaStreamDestination) so nothing is played back
    // through the speakers — the mic must NEVER echo to the student.
    const sink = ctx.createMediaStreamDestination()
    this.mediaStreamDestination = sink
    src.connect(processor)
    processor.connect(sink)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    // Also disable the underlying track so the browser mic indicator reflects
    // reality and no audio energy leaks through the analyser.
    this.stream.getAudioTracks().forEach((t) => (t.enabled = !muted))
  }

  stop() {
    try { this.processor?.disconnect() } catch {}
    try { this.src?.disconnect() } catch {}
    try { this.mediaStreamDestination?.disconnect() } catch {}
    try { this.ctx?.close() } catch {}
    this.processor = null
    this.src = null
    this.mediaStreamDestination = null
    this.ctx = null
  }
}

// ---------- playback queue ----------

export type PlaybackHandlers = {
  onPlaybackStart?: () => void
  onPlaybackStop?: () => void
}

export class PcmPlaybackQueue {
  private ctx: AudioContext | null = null
  private nextStartTime = 0
  private activeSources = new Set<AudioBufferSourceNode>()
  private handlers: PlaybackHandlers
  private playing = false
  private stopWatchdog: any = null

  constructor(handlers: PlaybackHandlers = {}) {
    this.handlers = handlers
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx
    const AC =
      (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx: AudioContext = new AC({ sampleRate: OUTPUT_SAMPLE_RATE })
    // Same resume dance as MicPcmCapture — this is triggered by a network
    // event, not a user gesture.
    ctx.resume().catch(() => {})
    this.ctx = ctx
    this.nextStartTime = ctx.currentTime
    return ctx
  }

  /** Enqueue one Gemini audio chunk (base64 PCM16 LE @ 24 kHz mono). */
  enqueue(base64Pcm16: string) {
    const ctx = this.ensureContext()
    const pcm = int16FromBase64(base64Pcm16)
    if (pcm.length === 0) return

    const buffer = ctx.createBuffer(1, pcm.length, OUTPUT_SAMPLE_RATE)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 0x8000

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)

    // Schedule this chunk right after whatever is already queued so consecutive
    // chunks play back-to-back with no seam. If we've fallen behind (queue
    // fully drained before this chunk arrived) reset to "now".
    const startAt = Math.max(this.nextStartTime, ctx.currentTime)
    src.start(startAt)
    this.nextStartTime = startAt + buffer.duration

    this.activeSources.add(src)
    src.onended = () => {
      this.activeSources.delete(src)
      // If the queue has fully drained, fire onPlaybackStop after a tiny
      // debounce (Gemini often emits chunks in tight bursts with millisecond
      // gaps — we don't want to bounce the "AI is speaking" UI on every gap).
      if (this.activeSources.size === 0) {
        if (this.stopWatchdog) clearTimeout(this.stopWatchdog)
        this.stopWatchdog = setTimeout(() => {
          if (this.activeSources.size === 0 && this.playing) {
            this.playing = false
            this.handlers.onPlaybackStop?.()
          }
        }, 120)
      }
    }

    if (!this.playing) {
      this.playing = true
      this.handlers.onPlaybackStart?.()
    }
  }

  /**
   * Immediately stop and drop everything currently queued. Used on
   * barge-in — student started speaking, teacher must go quiet NOW.
   */
  interrupt() {
    if (this.stopWatchdog) {
      clearTimeout(this.stopWatchdog)
      this.stopWatchdog = null
    }
    this.activeSources.forEach((s) => {
      try { s.onended = null; s.stop() } catch {}
      try { s.disconnect() } catch {}
    })
    this.activeSources.clear()
    if (this.ctx) this.nextStartTime = this.ctx.currentTime
    if (this.playing) {
      this.playing = false
      this.handlers.onPlaybackStop?.()
    }
  }

  isPlaying() {
    return this.playing
  }

  close() {
    this.interrupt()
    try { this.ctx?.close() } catch {}
    this.ctx = null
  }
}
