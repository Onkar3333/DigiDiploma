# What to Update in Vercel and Render

Use this when deploying or updating DigiDiploma (frontend on **Vercel**, backend on **Render**).

---

## Vercel (Frontend – e.g. www.digidiploma.in)

### Build settings (Project Settings → General)

| Setting | Value |
|--------|--------|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Root Directory** | (leave empty if repo root is the frontend) |

`vercel.json` already defines rewrites so `/api/*` and `/uploads/*` go to `https://api.digidiploma.in`. No change needed unless you change the API URL.

### Environment variables (Project → Settings → Environment Variables)

Add these for **Production** (and optionally Preview) if you use the features:

| Variable | Required | Value | Notes |
|----------|----------|--------|--------|
| `VITE_WS_URL` | Recommended | `api.digidiploma.in` | WebSocket host (no `wss://`). Used for real-time updates. |
| `VITE_ADMIN_DELETE_SUBJECTS_PASSWORD` | Optional | Your secret password | Only if admins use “Delete all subjects” in Admin Subject Manager. |
| `VITE_FIREBASE_*` | Optional | Your Firebase config | Only if you use Firebase (e.g. FCM). App has fallbacks. |

- Do **not** add Razorpay keys on Vercel; the backend provides the key ID.
- After changing env vars, **redeploy** (Deployments → ⋮ → Redeploy).

---

## Render (Backend – e.g. api.digidiploma.in)

### Service type

- **Web Service** (not Static Site).

### Build & run

- **Build Command:** `npm install --prefix backend` (or `cd backend && npm install` if root has no package.json for backend).
- **Start Command:** `node backend/server.js` or `node server.js` from backend directory (depends how you set **Root Directory**).
- **Root Directory:** If the repo root has frontend + `backend/` folder, set **Root Directory** to `backend` and use Start Command: `node server.js`.

### Environment variables (Service → Environment)

Set these in the Render dashboard. Use **Production** (and same for Preview if you use it).

#### Required

| Variable | Example / value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render sets this automatically; you can leave it) |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/digidiploma?retryWrites=true&w=majority` |
| `JWT_SECRET` | Long random string (e.g. 32+ chars) |
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxx` (from Razorpay Dashboard → Live mode) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay live secret |
| `CORS_ORIGIN` | `https://www.digidiploma.in` (your Vercel/frontend URL) |
| `FRONTEND_URL` | `https://www.digidiploma.in` |

#### Optional but recommended

| Variable | Example / value |
|----------|------------------|
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay → Settings → Webhooks (URL: `https://api.digidiploma.in/api/payments/webhook`) |
| `R2_ACCESS_KEY_ID` | If you use R2 for file storage |
| `R2_SECRET_ACCESS_KEY` | |
| `R2_ACCOUNT_ID` | |
| `R2_BUCKET_NAME` | |
| `R2_PUBLIC_BASE_URL` | Your R2 public URL |
| `STORAGE_DRIVER` | `r2` if using R2 |

#### Optional (email, etc.)

| Variable | Example / value |
|----------|------------------|
| `SMTP_USER` / `SMTP_PASS` | For emails (e.g. Gmail App Password) |
| `ADMIN_ALERT_EMAIL` | Admin notification email |

### After changing env vars on Render

- **Manual Deploy:** Dashboard → your service → **Manual Deploy** → **Deploy latest commit** (or **Clear build cache & deploy** if something is cached).

---

## Quick checklist

### Vercel

- [ ] Build: `npm run build`, Output: `dist`
- [ ] `VITE_WS_URL` = `api.digidiploma.in` (if you use WebSockets)
- [ ] `VITE_ADMIN_DELETE_SUBJECTS_PASSWORD` set if you use “Delete all subjects”
- [ ] No Razorpay keys on Vercel
- [ ] Redeploy after env changes

### Render

- [ ] Start command runs backend (e.g. `node server.js` from backend root)
- [ ] `MONGODB_URI`, `JWT_SECRET` set
- [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (live keys) set
- [ ] `CORS_ORIGIN` and `FRONTEND_URL` = `https://www.digidiploma.in`
- [ ] Optional: `RAZORPAY_WEBHOOK_SECRET`, R2 vars, SMTP
- [ ] Manual deploy after env changes

---

## Razorpay webhook (optional)

If you use server-side payment verification via webhooks:

1. Razorpay Dashboard → Settings → Webhooks.
2. Add URL: `https://api.digidiploma.in/api/payments/webhook`.
3. Select events (e.g. `payment.captured`, `payment_link.paid`).
4. Copy the **Webhook Secret** and set it as `RAZORPAY_WEBHOOK_SECRET` on Render.

---

## If your URLs differ

- **Frontend:** e.g. `https://digidiploma.vercel.app` → use that in `CORS_ORIGIN` and `FRONTEND_URL` on Render, and in Vercel env if needed.
- **Backend:** e.g. `https://digidiploma-api.onrender.com` → update `vercel.json` rewrites so `destination` points to that URL instead of `https://api.digidiploma.in`.
- **Share link:** The material share link is hardcoded to `https://www.digidiploma.in` in code; if your live site is different, we can change that in `Materials.tsx`.
