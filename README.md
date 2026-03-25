# DeFi Risk Sentinel

_QA by Dang Nguyen. Ideas by Duy Quang_

Automated DeFi risk assessment tool. Enter campaign URLs and the system will scrape page content, analyze terms & conditions, and generate a rigorous risk report with Red/Yellow/Green flag ratings.

## Features

- Paste campaign & terms URLs — content is auto-scraped via Puppeteer
- AI-powered risk analysis using Claude (Anthropic)
- Bilingual support (Tiếng Việt / English) — switch languages instantly, no extra API calls
- Risk report with color-coded flags (Red / Yellow / Green)
- Campaign overview extraction (duration, assets, limits, profit)
- PDF export with full Vietnamese font support

## Tech Stack

- **Frontend:** React + TypeScript, Vite, Tailwind CSS, jsPDF
- **Backend:** Node.js + Express, Puppeteer (web scraping), Anthropic SDK (Claude AI)

## Quick Start

### 1. Add your API key

Copy the example env file and add your Anthropic API key:

```bash
cp backend/.env.example backend/.env
```

Then open `backend/.env` and paste your key:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
PORT=8000
```

> This is the **only** configuration needed. Get your key at https://console.anthropic.com/

### 2. Run the app

```bash
bash start.sh
```

This will automatically install dependencies (if needed) and start both the backend and frontend:

- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:3000

Press `Ctrl+C` to stop both services.

### Windows Users

Use **Git Bash** to run `start.sh`. It comes pre-installed with [Git for Windows](https://gitforwindows.org/):

```bash
# Open Git Bash, navigate to the project folder, then:
bash start.sh
```

> Do **not** use CMD or PowerShell — the startup script requires a bash environment.

## Project Structure

```
defi-risk-sentinel/
├── frontend/                # React app (Vite)
│   ├── index.html           # Entry HTML with Tailwind CDN + importmap
│   ├── index.tsx            # React root mount
│   ├── App.tsx              # Main UI component
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── LanguageContext.tsx   # i18n (Vietnamese / English)
│   ├── components/
│   │   └── UrlInputList.tsx # URL Input with validation
│   └── services/
│       └── geminiService.ts # API client (calls backend)
├── backend/                 # Express API server
│   ├── server.ts            # API routes, Puppeteer scraping, Claude AI
│   ├── Dockerfile           # Production Docker image (Node + Chromium)
│   ├── .dockerignore        # Files excluded from Docker build
│   ├── .env                 # Your API key (not committed)
│   └── .env.example         # Template
├── start.sh                 # One-command startup script
├── DEPLOYMENT_PLAN.md       # Full deployment guide (Render + Cloudflare)
└── .gitignore
```
