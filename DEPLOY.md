# Sandrapalli's MarketMind — Render Deployment Guide

## What You Need
- A free [GitHub](https://github.com) account
- A free [Render](https://render.com) account

---

## Step 1 — Push to GitHub

### If you've never used Git before:

1. Download and install [GitHub Desktop](https://desktop.github.com) (easiest option)
2. Open GitHub Desktop → **File → New Repository**
   - Name: `sandrapalli-marketmind`
   - Local path: choose wherever you want
   - Click **Create Repository**
3. Copy ALL files from this folder into that new repo folder
4. In GitHub Desktop you'll see all the files listed — add a summary like `"Initial commit"` and click **Commit to main**
5. Click **Publish repository** (top right) → make sure **Keep this code private** is unchecked if you want it public → click **Publish Repository**

### If you're comfortable with Git (terminal):
```bash
cd sandrapalli_marketmind/
git init
git add .
git commit -m "Initial commit — Sandrapalli's MarketMind"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sandrapalli-marketmind.git
git push -u origin main
```

---

## Step 2 — Deploy on Render

1. Go to [render.com](https://render.com) and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect a repository"** and connect your GitHub account
4. Select your `sandrapalli-marketmind` repository
5. Render will auto-detect the settings — verify they match:

| Setting | Value |
|---|---|
| **Name** | sandrapalli-marketmind |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| **Instance Type** | Free |

6. Scroll down and click **"Create Web Service"**

---

## Step 3 — Wait for Build (~2-3 minutes)

Render will:
- Install Python 3.11
- Run `pip install -r requirements.txt` (installs Flask, yfinance, etc.)
- Start the gunicorn server

You'll see a green **"Live"** badge when it's done.

---

## Step 4 — Your Live URL

Your site will be live at:
```
https://sandrapalli-marketmind.onrender.com
```

(or similar — Render shows the exact URL at the top of the dashboard)

---

## Notes

- **Free tier spins down after 15 mins of inactivity** — the first request after idle takes ~30 seconds to wake up. This is normal on the free plan.
- **Upgrade to Render's $7/mo "Starter" plan** if you want it always-on with no cold starts.
- **Auto-deploys**: Every time you push a new commit to GitHub, Render automatically redeploys.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Build fails on `yfinance` | Check `requirements.txt` has correct version |
| Site loads but no data | yfinance sometimes rate-limits — data will show on retry |
| 502 error | Check Render logs → "Logs" tab in your service dashboard |
| Slow first load | Normal — free tier cold start, wait 30s |
