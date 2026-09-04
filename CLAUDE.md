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
public/
  hero.mp4                    — hero section video (classroom demo)
  hero-bg.png, roundtable.png, math.png, biology.png, etc.
  subjects/                   — 17 subject category images
components/
  SurveyModal.tsx             — email capture modal (imported in page.tsx)
CLAUDE.md                     — this file
package.json, tsconfig.json, next.config.ts
```

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
- No external UI library (all custom CSS)

## When I Get Stuck
- Errors on building? Check imports, check `"use client"` boundary
- CSS not applying? Ensure it's in `globals.css`, check class names match
- State not updating? Check if in useEffect, check useState dependency arrays
- localStorage not syncing? Verify both pages read/write same key (`aig_phase0_v2`)
- TypeScript errors? Read the error carefully, don't ignore — fix the type

---

*Last updated: 2026-09-04. Phase 0 ongoing. MVP planning once segment validation complete.*
