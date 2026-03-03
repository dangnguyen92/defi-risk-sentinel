# Final Deployment Plan -- DeFi Risk Sentinel

## Stack

- **Domain**: `your-domain.com` (Namecheap)
- **DNS**: Cloudflare (free) -- nameservers pointed from Namecheap
- **Frontend**: Cloudflare Pages (free) -- serves `your-domain.com`
- **Backend**: Render Web Service ($7/mo) -- serves `api.your-domain.com`
- **AI**: Anthropic Claude API (usage-based)

## Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │           Cloudflare (FREE DNS)             │
                         │                                             │
                         │  your-domain.com ──CNAME──> Cloudflare Pages│
                         │api.your-domain.com ──CNAME──> Render        │
                         └──────────────┬──────────────────┬───────────┘
                                        │                  │
              Namecheap (registrar)     │                  │
              owns your-domain.com      │                  │
              nameservers ──────────────┘                  │
                                                           │
  ┌──────────────┐    https://your-domain.com    ┌─────────┴──────────┐
  │              │ ──────────────────────────>   │  Cloudflare Pages  │
  │    User      │                               │  (FREE)            │
  │   Browser    │                               │  Serves React app  │
  │              │ ──────────────────────────>   └────────────────────┘
  └──────────────┘  https://api.your-domain.com
         │               /api/analyze           ┌─────────────────────┐
         └─────────────────────────────────────>│  Render ($7/mo)     │
                                                │  Express + Puppeteer│
                                                │                     │
                                                │  ┌───────────────┐  │
                                                │  │ Scrapes DeFi  │  │
                                                │  │ websites      │  │
                                                │  └───────────────┘  │
                                                │         │           │
                                                │         ▼           │
                                                │  ┌───────────────┐  │
                                                │  │ Calls Claude  │  │
                                                │  │ API (your key)│  │
                                                │  └───────────────┘  │
                                                └─────────────────────┘
```

## Monthly Cost

- Domain renewal (Namecheap): ~$2/year (~$0.17/mo)
- Cloudflare DNS + Pages: **$0**
- Render Starter: **$7/mo**
- Anthropic API: **~$0.01-0.10 per analysis** (depends on model)
- **Total: ~$7/month + API usage**

---

## Part 1: Before deploying

### Add rate limiting

Install dependency, then update `backend/server.ts`:

```bash
npm install express-rate-limit --prefix backend
```

Add to `backend/server.ts` (after middleware setup):
```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests
  message: { error: "Too many requests. Please try again later." },
});
app.use("/api/analyze", limiter);
```

---

## Part 2: Domain DNS Setup (Namecheap + Cloudflare)

### 2.1 Create free Cloudflare account

1. Go to https://dash.cloudflare.com and sign up (free)
2. Click **"Add a site"**
3. Enter `your-domain.com`
4. Select the **Free** plan
5. Cloudflare shows you 2 nameservers (write these down), e.g.:
   - `alma.ns.cloudflare.com`
   - `neil.ns.cloudflare.com`

### 2.2 Point Namecheap nameservers to Cloudflare

1. Log into https://namecheap.com
2. Go to **Domain List** -> click **Manage** next to `your-domain.com`
3. Find the **Nameservers** section
4. Change from **"Namecheap BasicDNS"** to **"Custom DNS"**
5. Enter the 2 Cloudflare nameservers from step 2.1
6. Click the green checkmark to save
7. Wait 10-30 minutes for propagation
8. Go back to Cloudflare dashboard -- it will show "Active" when ready

Your domain is still owned by Namecheap. You only changed who handles the routing.

---

## Part 3: Deploy Backend on Render

### 3.1 Push code to GitHub

```bash
git add -A
git commit -m "Prepare for deployment"
git push origin main
```

### 3.2 Create Render Web Service

1. Go to https://render.com and sign up with GitHub
2. Click **"New +"** -> **"Web Service"**
3. Connect your `defi-risk-sentinel` repository
4. Configure:
   - **Name**: `defi-risk-sentinel-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Instance Type**: Starter ($7/mo)
5. Add **Environment Variables**:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (your actual key)
   - `PORT` = `8000`
6. Click **"Create Web Service"**
7. Wait for the build to complete (5-10 minutes)
8. Render gives you a URL like `https://defi-risk-sentinel-api.onrender.com`
9. Test it: visit `https://defi-risk-sentinel-api.onrender.com/api/health` -- should return `{"status":"ok"}`

### 3.3 Add custom domain on Render

1. In your Render service dashboard, go to **Settings** -> **Custom Domains**
2. Add `api.your-domain.com`
3. Render tells you to add a CNAME record -- note the target value

### 3.4 Add DNS record in Cloudflare

1. Go to Cloudflare dashboard -> `your-domain.com` -> **DNS** -> **Records**
2. Click **"Add record"**:
   - **Type**: `CNAME`
   - **Name**: `api`
   - **Target**: `defi-risk-sentinel-api.onrender.com` (from Render)
   - **Proxy status**: Click to set **"DNS only"** (grey cloud, NOT orange)
3. Save
4. Wait a few minutes, then test: `https://api.your-domain.com/api/health`

**Important**: The proxy must be "DNS only" (grey cloud) because Render handles its own SSL. Orange cloud (Cloudflare proxy) can cause SSL conflicts.

---

## Part 4: Deploy Frontend on Cloudflare Pages

### 4.1 Create Cloudflare Pages project

1. In Cloudflare dashboard, go to **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**
2. Select your `defi-risk-sentinel` repository
3. Configure build:
   - **Project name**: `defi-risk-sentinel`
   - **Production branch**: `main`
   - **Build command**: `npm install --prefix frontend && npm run build --prefix frontend`
   - **Build output directory**: `frontend/dist`
4. Add **Environment Variable**:
   - `VITE_API_URL` = `https://api.your-domain.com`
5. Click **"Save and Deploy"**
6. Wait for build to complete (2-3 minutes)
7. Cloudflare gives you a URL like `https://defi-risk-sentinel.pages.dev` -- test it

### 4.2 Add custom domain

1. In the Pages project, go to **Custom domains** -> **Set up a custom domain**
2. Enter `your-domain.com`
3. Cloudflare auto-configures the DNS record (since DNS is already on Cloudflare)
4. SSL certificate is issued automatically (takes a few minutes)
5. Test: visit `https://your-domain.com`

---

## Part 5: Securing the ANTHROPIC_API_KEY

1. **The key is server-side only** -- it lives in Render's environment variables, never in frontend code, never in git. Users' browsers never see it.
2. **Rate limiting**  -- prevents anyone from spamming your endpoint and burning your API credits. Max 20 requests per 15 minutes per IP.
3. **CORS restriction**  -- only `your-domain.com` and `localhost` can call your backend. Other websites cannot.
4. **Set Anthropic spending cap** -- Go to https://console.anthropic.com -> Settings -> Limits -> set a monthly spending limit (e.g., $10/month) as a safety net.
5. **Optional: Add password protection** -- If this tool is only for you, add a simple password check on the `/api/analyze` endpoint so the public cannot use it even if they find the URL.

---

## Checklist

- [ ] **Code**: Add `express-rate-limit`
- [ ] **DNS**: Add `your-domain.com` to Cloudflare (free plan)
- [ ] **DNS**: Change Namecheap nameservers to Cloudflare
- [ ] **DNS**: Wait for "Active" status in Cloudflare
- [ ] **Backend**: Create Render Web Service with Docker
- [ ] **Backend**: Set `ANTHROPIC_API_KEY` and `PORT` env vars on Render
- [ ] **Backend**: Add custom domain `api.your-domain.com` on Render
- [ ] **DNS**: Add CNAME record `api` -> Render URL (grey cloud)
- [ ] **Backend**: Test `https://api.your-domain.com/api/health`
- [ ] **Frontend**: Create Cloudflare Pages project
- [ ] **Frontend**: Set `VITE_API_URL=https://api.your-domain.com`
- [ ] **Frontend**: Add custom domain `your-domain.com`
- [ ] **Frontend**: Test `https://your-domain.com`
- [ ] **Security**: Set Anthropic monthly spending cap
- [ ] **Final**: Test full flow -- submit a campaign URL and get analysis back
