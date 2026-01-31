# Pre-push checklist (maintenance / production)

Use this before pushing to maintenance/production.

## ✅ Fixes applied in codebase

1. **Verbose logging (Materials.tsx)**  
   Debug `console.log` calls are gated with `import.meta.env.DEV` so production builds stay quiet. `console.warn` and `console.error` are unchanged.

2. **Admin “Delete all subjects” password (AdminSubjectManager)**  
   The hardcoded password was removed. Production must set:
   - **`VITE_ADMIN_DELETE_SUBJECTS_PASSWORD`** in your frontend env (or build env).  
   If unset, the delete-all flow will show “Delete password not configured” and deny the action. Set a strong value only in production env.

3. **Share link**  
   Material share link already uses production base URL: `https://www.digidiploma.in/materials?...`

4. **Pay → QR**  
   Main Materials page “Pay ₹X” opens the QR payment dialog (same as QR Pay button).

5. **Guest checkout**  
   Guest ID, payment routes without auth for guests, and QR from `shortUrl` are in place.

---

## 🔧 Before you push

- [ ] **Backend `.env`**  
  Ensure `backend/.env` is **not** committed (it’s in `.gitignore`). On the server, set:
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (live keys for production)
  - `MONGODB_URI`
  - `RAZORPAY_WEBHOOK_SECRET` if using webhooks

- [ ] **Frontend env (production)**  
  For production build, set at least:
  - `VITE_ADMIN_DELETE_SUBJECTS_PASSWORD` if admins use “Delete all subjects”.

- [ ] **Razorpay**  
  Dashboard: Live mode, correct keys in `.env`, webhook URL if used (e.g. `https://www.digidiploma.in/api/payments/webhook`).

- [ ] **Smoke test**  
  After deploy: open Materials → pick a paid material → Pay → QR dialog opens → share link copies as `https://www.digidiploma.in/materials?...`.

---

## 📌 Optional / later

- **SubjectMaterials “Buy”**  
  The subject materials view (e.g. inside another flow) still uses the card/checkout flow for “Buy ₹X”. To align with the main Materials page, you could wire that button to the same QR flow (e.g. by lifting QR state/callbacks to a shared parent or context).

- **Backend logs**  
  Backend still has many `console.log` calls. For production you may want to use a logger (e.g. `pino`) and log level control via `LOG_LEVEL` or `NODE_ENV`.
