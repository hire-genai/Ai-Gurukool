# AI-Gurukool — Project Context for Claude

## What This Project Is
AI-Gurukool is an AI-powered educational platform (landing page + admin dashboard). Currently in Phase 0 (Discovery & Validation). The public landing page showcases the product; the admin panel tracks 49 research tasks and pushes validated data to the public page.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Plain CSS (all in `app/globals.css` — NO Tailwind)
- **State**: localStorage only (no database yet — admin writes, landing page reads)
- **Admin URL**: `/admin` — password: `gurukool2026`

## File Structure (only these files matter — don't create extras)
```
app/
  layout.tsx       — root layout, Google Fonts import
  page.tsx         — public landing page ("use client")
  globals.css      — ALL CSS for the entire project
  admin/
    page.tsx       — admin dashboard ("use client")
public/
  hero-bg.png, roundtable.png, math.png, ratio.png, hybrid.png, scenarios.png, showcase.png
  subjects/        — 17 subject images (01_Math.png … 17_Engineering_Entrance_JEE.png)
CLAUDE.md          — this file
package.json
tsconfig.json
next.config.ts
```

## Architecture Decisions
- **localStorage key**: `aig_phase0_v2` (admin saves here; landing page reads)
- **Admin toggle key**: `aig_admin_pw`
- **"use client"**: Both pages need it (they use useState, useEffect, localStorage)
- **CSS**: All styles live in `globals.css`. No CSS modules, no Tailwind. CSS variables in `:root`.
- **Images**: In `/public/`, referenced as `/hero-bg.png` etc. (not imported — plain `<img>` tags)

## Implementation Rules (follow every time)
1. **Before editing**: Read the target file to understand current state
2. **No duplication**: If changing a section, DELETE the old section completely then write new
3. **One file per concern**: Don't create a new file if you can edit an existing one
4. **CSS changes**: Go to `globals.css` only — never inline new style blocks in components
5. **New pages**: Create as `app/<route>/page.tsx` — always "use client" if they use hooks/localStorage

## Teaching Rules (I am a beginner learning Next.js)
For every feature I ask to implement:
1. **SCAN** existing code first — understand what's already there
2. **EXPLAIN PLAN** before writing code — simple flow diagram
3. **IMPLEMENT** completely — don't leave things for me to finish
4. **EXPLAIN KEY CODE** after — logical blocks, not line-by-line
5. **EXPLAIN WHY** — why useState? why useEffect? why "use client"?
6. **QUIZ ME** at the end — one question at a time, wait for my answer

Key teaching concepts to reinforce:
- `"use client"` vs Server Component
- `useEffect` for browser-only APIs (localStorage, IntersectionObserver, scroll)
- `useState` for reactive UI
- Next.js App Router file-based routing (`app/admin/page.tsx` → `/admin`)
- Why images go in `/public/` not `src/`

## Phase 0 Research Segments (for context)
| ID | Segment | Tasks |
|----|---------|-------|
| s07 | Parent Focus Groups | 6 |
| s08 | Shadow Testing | 6 |
| s09 | Student Interviews | 5 |
| s10 | Coaching Center Interviews | 5 |
| s11 | Aspirant Survey | 5 |
| s12 | Speed Prototype | 5 |
| s13 | Professional Interviews | 5 |
| s14 | Ads & Waitlist | 6 |
| s15 | Go/No-Go Decision | 6 |

Total: 49 tasks, ~130.5 hours
