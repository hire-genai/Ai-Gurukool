# AI-Gurukool — Project Context for Claude

## What This Project Is
**AI-Gurukool** is an AI-powered educational platform reimagining the ancient Gurukul concept. Currently in **Phase 0: Discovery & Validation**.

**Two interconnected parts:**
1. **Public Landing Page** (`app/page.tsx`) — Showcases the teaching philosophy and product vision
2. **Admin Dashboard** (`app/admin/page.tsx`) — Tracks 49 validation research tasks across 9 segments; pushes validated data to public page

**Core Vision:** 1 AI teacher + 10 students in a round table. Socratic dialogue, not lecturing. Every child speaks. Real understanding, not rote.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Plain CSS (all in `app/globals.css` — NO Tailwind, NO CSS modules)
- **State**: localStorage only (no database yet — admin saves, landing page reads)
- **Auth**: Admin password in localStorage (`aig_admin_pw`, default: `gurukool2026`)
- **Admin URL**: `/admin`

## File Structure (canonical source of truth)
```
app/
  layout.tsx                  — root layout, Google Fonts import
  page.tsx                    — public landing page ("use client")
  globals.css                 — ALL CSS for entire project (variables, animations, components)
  admin/
    page.tsx                  — admin research tracker ("use client")
  class-room/
    page.tsx                  — live AI classroom UI; uses Gemini Live (see below)
  why-trust-us/
    page.tsx                  — trust marketing page (dark theme, uses lp-* tokens)
  insights/
    page.tsx                  — live survey insights dashboard (Chart.js via CDN)
  api/
    survey/route.ts           — POST /api/survey → writes SurveyResponse via Prisma
    insights/route.ts         — GET /api/insights → aggregated survey buckets
    gemini-live-token/route.ts — ACTIVE: mints ephemeral Gemini Live token
    realtime-session/route.ts  — PRESERVED (disconnected): OpenAI Realtime session
lib/
  gemini/                     — ALL Gemini Live code lives in this ONE folder.
    persona.ts                — TEACHER_PERSONA + INITIAL_KICKOFF (shared with OpenAI route)
    config.ts                 — model id, audio sample rates, VAD tuning
    audio.ts                  — MicPcmCapture + PcmPlaybackQueue (browser)
    session.ts                — GeminiClassroomSession browser wrapper
public/
  hero.mp4                    — hero section video (classroom demo)
  hero-bg.png, roundtable.png, math.png, biology.png, etc.
  subjects/                   — 17 subject category images
components/
  SurveyModal.tsx             — full multi-step survey inside a popup/modal
                                (opens from "Book a Class" and Why-Trust-Us CTAs)
prisma/
  schema.prisma               — SurveyResponse model (Postgres)
ai-gurukool-survey.html       — reference HTML for the survey (mirrored in SurveyModal.tsx)
ai-gurukool-landing.html      — reference HTML for the Why-Trust-Us marketing page
CLAUDE.md                     — this file
package.json, tsconfig.json, next.config.ts
```

## Survey Modal
`components/SurveyModal.tsx` is the single source of truth for the survey. It replicates `ai-gurukool-survey.html` verbatim and always renders inside the `svy-overlay` popup. Opened from the "Book a Class" nav CTA in `app/page.tsx` and from every CTA on `/why-trust-us`.

Flow (dynamic step count = 3 + numCategories + 2):
1. **Welcome + video** — /hero.mp4 with mute toggle
2. **Comprehension check** — one radio question about the video
3. **Role picker** — Parent / Student / Teacher
4. **Category screens** — grouped from the role-specific question bank (radio / checkbox / scale). Checkbox `max` caps enforced; Next disabled until all required questions answered.
5. **Contact** — email required, name/phone optional, interview Yes/No required
6. **Success** — thank-you card (auto-fits content; not full-screen on mobile)

Full-screen mobile mode (`.svy-card-full`) is applied only for form steps (1 through contact); the welcome and success steps stay as auto-sized centered cards.

### Survey payload → `/api/survey`
```json
{
  "role": "parent|student|teacher",
  "comprehension": "...",
  "answers": { "p_relation": "Mother", "p_age": ["9-12"], ... },
  "contact": { "email": "...", "name": "...", "phone": "...", "interview": "Yes|No" }
}
```
The API packs `comprehension` and `interview` into the JSON `answers` blob under `__comprehension` / `__interview` and stores it in `SurveyResponse.answers` (string). The Prisma schema is unchanged.

## How It Works: Admin ↔ Public Data Flow
- **Admin writes** task results + public content + testimonials → stored in `localStorage[aig_phase0_v2]`
- **Landing page reads** from same localStorage key → displays validation data (if toggles enabled)
- **No backend yet** — all data flows through browser localStorage as JSON object

### localStorage Schema
```json
{
  "results": {
    "r07-recruited": 20,
    "r07-groups": 4,
    "r08-clarity": 8.5,
    ...
    "pub-headline": "...",
    "pub-insight1": "..."
  },
  "toggles": {
    "vis-section": true,
    "vis-metrics": true,
    "vis-testi": false
  },
  "tasks": {
    "0.7.1": { "done": true, "notes": "..." },
    "0.7.2": { "done": false, "notes": "..." }
  },
  "testimonials": [
    { "id": ..., "name": "...", "quote": "...", "rating": 5, "seg": "parent" }
  ]
}
```

## Coding Behavior Guidelines (Karpathy Principles)

**Tradeoff:** These guidelines bias toward caution over speed. For trivial one-liners, use judgment.

### 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

Test: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove only imports/variables/functions that YOUR changes made unused.

Test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- Transform tasks into verifiable goals before implementing.
- For multi-step tasks, state a brief plan with verify steps:
  ```
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  ```
- Strong success criteria allow independent looping. Weak criteria ("make it work") require constant back-and-forth.

---

## Implementation Rules (non-negotiable)
1. **Before editing**: ALWAYS read the target file first with Read tool
2. **No duplication**: If changing a section, DELETE old code completely, then write new
3. **One file per concern**: Never create new files if existing ones fit the purpose
4. **CSS-only changes**: ALL styling goes to `app/globals.css` — never inline `<style>` tags in components
5. **Component imports**: Keep imports at top; clean up unused imports
6. **Client boundaries**: Both `app/page.tsx` and `app/admin/page.tsx` must have `"use client"` (they use hooks + localStorage)
7. **No TypeScript ignores**: Don't use `@ts-ignore` — fix the type instead

## Teaching Approach (I am learning Next.js + React)
For every feature requested, follow this sequence:
1. **SCAN** — Read existing code, identify patterns, understand current state
2. **PLAN** — Explain approach before coding (simple diagram is fine)
3. **IMPLEMENT** — Full, working solution (don't leave TODOs for user)
4. **EXPLAIN** — Walk through key code blocks, focus on WHY not line-by-line WHAT
5. **QUIZ** — One conceptual question at a time, wait for my answer before moving on

### Conceptual Anchors to Reinforce
- **`"use client"` vs Server Component**: When/why each. Data fetching happens server-side, interactivity (clicks, state, localStorage) is client.
- **`useEffect` and Browser APIs**: Only client can access localStorage, IntersectionObserver, window. useEffect runs after render — safe place for these.
- **`useState` and Re-renders**: Updating state triggers re-render. Only do this for UI changes, not data sync.
- **Next.js App Router**: `app/admin/page.tsx` → route `/admin`. File path = URL path. No manual routing.
- **Images in `/public/`**: Static assets referenced by path (`/hero.mp4`), not imported. Browser fetches directly.
- **CSS Variables**: Define in `:root`, use throughout. Makes theming, animations, spacing consistent.

## Phase 0 Research Segments (validation tracking)
| ID | Name | Focus | Tasks | Hours |
|----|------|-------|-------|-------|
| s07 | Parent Focus Groups | Fears, trust, WTP | 6 | 26 |
| s08 | Shadow Testing | Prototype feedback, price elasticity | 6 | 20 |
| s09 | Student Interviews | Engagement triggers, personas | 5 | 16 |
| s10 | Coaching Center Interviews | Pain points, willingness to adopt | 5 | 17 |
| s11 | Aspirant Survey | JEE/NEET market interest in AI | 5 | 9 |
| s12 | Speed Prototype | Proof of 2× syllabus speed | 5 | 8 |
| s13 | Professional Interviews | Working learner personas | 5 | 13.5 |
| s14 | Ads & Waitlist | Landing page + ads performance | 6 | 11 + 10 days |
| s15 | Go/No-Go Decision | Final decision matrix | 6 | 10 |

**Total: 49 tasks, ~130.5 hours. Goal: Validate one of three segments (Tuition / Competitive Exams / Job Entrance) before building MVP.**

## Admin Dashboard Pages
- **Overview** — Phase 0 progress, segment status, key metrics
- **s07–s15** — One page per segment; shows task checklist + result fields
- **Public Content** — Toggle visibility + manage public-facing copy
- **Testimonials** — Add/manage quotes from research participants
- **Settings** — Change admin password, reset data

## Expected Landing Page Sections (from code)
- Hero + stats bar (1:10 ratio, 2× speed, 20+ subjects, 100% parent visibility)
- "How It Works" (round table, questions not lectures, weekly reports)
- Inside the Classroom (Biology example, live dialogue)
- Computer Science (build, break, rebuild)
- History (debate, mock trials)
- Core Subjects (Math, English Grammar)
- Competitive Exams (JEE/NEET/CLAT pods)
- Carousel (20+ subjects with descriptions)
- Vitality Report sample (weekly report card with skills + evidence)
- CTA + Survey modal
- Testimonials + validation metrics (if public toggles enabled)

## Known Dependencies
- React 18, Next.js 14, TypeScript 5
- Prisma + daily-co SDK (installed but not yet integrated — Phase 1+)
- `@google/genai` — Gemini Live SDK (active classroom realtime provider)
- No external UI library (all custom CSS)

## Live Classroom — Realtime Provider

**Active provider:** Google Gemini Live API (via `@google/genai`).
**Preserved but disconnected:** OpenAI Realtime (`gpt-realtime`).

### Development rule
> Do not delete or remove the preserved OpenAI Realtime implementation unless explicitly requested. The classroom currently uses Gemini Live, but OpenAI Realtime must remain available for future reconnection.

Files that MUST stay intact (OpenAI, preserved):
- `app/api/realtime-session/route.ts` — full OpenAI ephemeral-session endpoint (`/v1/realtime/client_secrets`), including the identical `TEACHER_PERSONA`.
- `.env` keys: `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`.

### Active flow (Gemini)
```
Browser (app/class-room/page.tsx)
      ↓ POST /api/gemini-live-token
Next.js server (uses GEMINI_API_KEY, calls @google/genai authTokens.create)
      ↓ ephemeral token (single-use, ≤2 min to redeem, ≤30 min session)
Browser opens Gemini Live WebSocket via ai.live.connect()
      ↓ mic → PCM16 @ 16 kHz, base64 chunks via session.sendRealtimeInput()
      ↑ teacher audio → PCM16 @ 24 kHz → Web Audio queue
```

### Where Gemini code lives (single folder rule)
All Gemini logic lives in `lib/gemini/`. The only exception is the Next.js API
route (`app/api/gemini-live-token/route.ts`) which must sit under `app/api/`
by framework requirement; that file is a thin wrapper that imports everything
from `lib/gemini/`.

- `lib/gemini/persona.ts` — `TEACHER_PERSONA` + `INITIAL_KICKOFF`. Verbatim copy of the persona in `app/api/realtime-session/route.ts`. Keep them in sync when the teaching prompt changes.
- `lib/gemini/config.ts` — `GEMINI_LIVE_MODEL` (default `gemini-3.8-live`), `INPUT_SAMPLE_RATE=16000`, `OUTPUT_SAMPLE_RATE=24000`, VAD prefix/silence tuning, ephemeral-token lifetimes.
- `lib/gemini/audio.ts` — `MicPcmCapture` (mic → Float32 → PCM16 → base64 via `ScriptProcessorNode` at 16 kHz) and `PcmPlaybackQueue` (24 kHz `AudioBufferSource` queue with a hard `interrupt()` for barge-in).
- `lib/gemini/session.ts` — `GeminiClassroomSession`: opens `ai.live.connect()`, wires mic input, decodes `serverContent.modelTurn.parts[].inlineData` into the playback queue, and fans server events out to the classroom UI as a small typed event union (`connected`, `student-started/stopped`, `teacher-started/stopped/interrupted`, `student-transcript-delta/final`, `teacher-transcript-delta/final`, `error`, `closed`).

### Environment variables (Gemini)
- `GEMINI_API_KEY` — **server-side only**. Never expose via `NEXT_PUBLIC_*`.
- `GEMINI_LIVE_MODEL` — optional override; defaults to `gemini-3.8-live`.

### Model note (do not regress)
- The active Live model is `gemini-3.8-live` (per Google's current Live-API docs).
- `gemini-live-2.5-flash-preview` was shut down on **2025-12-09** — never reintroduce it as the classroom model.
- `gemini-3.8-live` does **not** support `thinkingConfig` / `thinkingLevel`. Do not add those fields to any `LiveConnectConfig` or ephemeral-token `liveConnectConstraints.config` in this codebase.

### Authentication
Ephemeral tokens minted per-session via `ai.authTokens.create({ config: { uses: 1, newSessionExpireTime, expireTime, liveConnectConstraints: { model, config } } })`. The system instruction, response modality, transcription config, and VAD tuning are locked into the token so the browser cannot override them.

### VAD / interruption
- Gemini's server-side `automaticActivityDetection` is enabled (with `prefixPaddingMs: 500`, `silenceDurationMs: 900`) — matches the natural-conversation feel of the OpenAI configuration.
- Barge-in: when Gemini emits its first `interimInputTranscription` chunk (student started speaking), `GeminiClassroomSession` immediately calls `PcmPlaybackQueue.interrupt()` — stops all queued teacher audio and empties the queue. It also handles `serverContent.interrupted` as a redundant server-side signal.

### Transcripts
- Student transcript: driven by `serverContent.inputTranscription.text` (and interim variant). Finalised on `serverContent.turnComplete`.
- Teacher transcript: driven by `serverContent.outputTranscription.text`. Finalised on `serverContent.turnComplete`.
- Both are grouped per-turn using synthetic ids (`student-N` / `teacher-N`) so the existing `upsertItem` transcript state in `class-room/page.tsx` works unchanged.

### Session lifecycle & cleanup
On `endClass` / unmount, `GeminiClassroomSession.close()`:
1. closes the Gemini WebSocket,
2. stops the mic `ScriptProcessorNode` and closes its 16 kHz AudioContext,
3. calls `PcmPlaybackQueue.close()` (stops all `AudioBufferSource`s, closes the 24 kHz AudioContext),
4. `cleanupMedia()` stops all mic tracks so the browser's mic indicator goes off.

### Timer
The classroom timer is a plain `setInterval` driven by `nowTick` (`useEffect` gated on `status === 'active'`). It is intentionally independent of any realtime event — Gemini messages, audio chunks, or transcript events cannot freeze or drift it.

## When I Get Stuck
- Errors on building? Check imports, check `"use client"` boundary
- CSS not applying? Ensure it's in `globals.css`, check class names match
- State not updating? Check if in useEffect, check useState dependency arrays
- localStorage not syncing? Verify both pages read/write same key (`aig_phase0_v2`)
- TypeScript errors? Read the error carefully, don't ignore — fix the type

---

*Last updated: 2026-09-16. Phase 0 ongoing. MVP planning once segment validation complete.*
*Recent additions: full-survey modal (`SurveyModal.tsx`), `/why-trust-us` marketing page, `/insights` dashboard (Chart.js CDN, backed by extended `/api/insights` aggregator over the new question keys). Sample data fallback in the client so charts render even with 0 responses.*
