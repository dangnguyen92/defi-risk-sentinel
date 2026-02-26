# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeFi Risk Sentinel is a bilingual (Vietnamese/English) DeFi campaign risk assessment tool. Users provide campaign URLs, terms/conditions URLs, and notes. The backend scrapes those pages with Puppeteer, sends the content to Anthropic Claude for analysis, and returns a structured risk report with Red/Yellow/Green flags.

## Commands

```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Start both frontend and backend concurrently
npm run dev

# Start individually
npm run dev:frontend    # Vite dev server on port 3000
npm run dev:backend     # tsx watch mode on port 8000

# Build
npm run build:frontend  # Vite production build
npm run build --prefix backend  # TypeScript compile to dist/

# Alternative startup with dependency checks
bash start.sh
```

No test runner or linter is configured.

## Architecture

**Monorepo with two packages** (no workspace manager — uses `--prefix`):

- `frontend/` — React 19 + Vite + TypeScript. Tailwind via CDN. ESM modules loaded via importmap in `index.html`.
- `backend/` — Express 5 + TypeScript. Single-file server (`server.ts`). Uses `tsx` for dev.

### Data Flow

1. Frontend collects campaign URLs, terms URLs, and notes
2. `frontend/services/geminiService.ts` POSTs to `POST /api/analyze`
3. Backend scrapes all URLs via Puppeteer (browser instance pooled, resources blocked for speed, content truncated to 8000 chars)
4. Scraped content + notes sent to Anthropic Claude API in a single call that returns **both** Vietnamese and English analysis
5. Frontend receives `{ vi: {...}, en: {...} }` and displays based on selected language — no extra API call on language switch

### Key Files

- **`backend/server.ts`** — All backend logic: Express routes, Puppeteer scraping, Anthropic API call, risk assessment prompt. The risk criteria (Red/Yellow/Green flags, four evaluation dimensions) are encoded in the AI system prompt, not in code.
- **`frontend/App.tsx`** — Main UI component with all state management (useState, no external state library)
- **`frontend/LanguageContext.tsx`** — React Context for vi/en language switching
- **`frontend/types.ts`** — Shared TypeScript interfaces (`BilingualResult`, `AnalysisResult`, etc.)
- **`frontend/components/UrlInputList.tsx`** — Reusable dynamic URL input component
- **`frontend/services/geminiService.ts`** — API client (named after an earlier Gemini integration, now calls Anthropic)

### Backend Environment

Requires `backend/.env` with `ANTHROPIC_API_KEY`. See `backend/.env.example` for template.
