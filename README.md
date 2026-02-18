# DeFi Risk Sentinel

_QA by Dang Nguyen. Ideas by Duy Quang_

Automated DeFi risk assessment tool powered by Claude AI. Enter campaign URLs and the system will scrape page content, analyze terms & conditions, and generate a rigorous risk report with Red/Yellow/Green flag ratings.

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
defi-risk-sentinel-v1.2/
├── frontend/          # React app (Vite)
│   ├── App.tsx        # Main UI component
│   ├── LanguageContext.tsx  # i18n (Vietnamese / English)
│   ├── components/    # Reusable components
│   ├── services/      # API client
│   └── public/fonts/  # Roboto font for PDF export
├── backend/           # Express API server
│   ├── server.ts      # API routes + AI integration
│   ├── .env           # Your API key (not committed)
│   └── .env.example   # Template
└── start.sh           # One-command startup script
```
