# Code Battle — Round 1 Demo

A working demo of Round 1 (Code Unlock — MCQ) for the Code Battle platform:
participant login, server-authoritative timer, 15 questions (7 easy / 8 hard),
server-side scoring, and an admin dashboard to start/stop the round and view
results. Built to be deployed live in under 30 minutes on free hosting.

**Stack:** Next.js (React + TypeScript, App Router, API routes) + PostgreSQL
(Prisma) — one deployable app, no separate backend server needed.

---

## 1. Get the code running locally is optional — you can deploy directly.
If you want to test locally first, run:

```bash
npm install
cp .env.example .env
# edit .env and fill in DATABASE_URL, AUTH_SECRET, ADMIN_PASSWORD
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open http://localhost:3000 (participant) and http://localhost:3000/admin (admin).
Seeded demo access codes: `CB-0001`, `CB-0002`, `CB-0003`.

---

## 2. Push this folder to GitHub

```bash
git init
git add .
git commit -m "Code Battle Round 1 demo"
```

Create a new empty repo on GitHub (github.com/new), then:

```bash
git remote add origin https://github.com/<your-username>/code-battle-demo.git
git branch -M main
git push -u origin main
```

---

## 3. Create a free Postgres database (Neon)

1. Go to https://neon.tech and sign up (free, no card required).
2. Create a new project.
3. Copy the connection string it gives you (it looks like
   `postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require`).
   Keep this tab open — you'll need it in step 4.

---

## 4. Deploy to Vercel

1. Go to https://vercel.com and sign up / log in with your GitHub account.
2. Click **Add New → Project**, and import the `code-battle-demo` repo you
   just pushed.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `DATABASE_URL` → the Neon connection string from step 3
   - `AUTH_SECRET` → any long random string (generate one at
     https://generate-secret.vercel.app/32 or run `openssl rand -base64 32`)
   - `ADMIN_PASSWORD` → a password you choose for the admin dashboard
   - `ROUND1_DURATION_SECONDS` → e.g. `1200` for 20 minutes
4. Click **Deploy**. Vercel will run `npm install` and `npm run build`
   (which also runs `prisma generate`) automatically.

---

## 5. Create tables and seed questions on the live database

Once deployed, run this **once** from your own machine (it points at the
live Neon database, not your local one):

```bash
# in the project folder, with .env pointing at the SAME DATABASE_URL you gave Vercel
npx prisma migrate deploy
npm run seed
```

This creates the tables and inserts the 15 questions + 3 demo participants
into the live database Vercel is using.

---

## 6. You're live

- Participant site: `https://<your-project>.vercel.app/`
- Admin dashboard: `https://<your-project>.vercel.app/admin`

Log in to `/admin` with the `ADMIN_PASSWORD` you set, click **Start Round 1**,
then log participants in with their access codes from a different
browser/incognito window to try it end to end.

To add real participants for your event, use the "Add" form in the admin
Participants panel — it generates a unique access code for each one.

---

## What's intentionally NOT in this demo

Per your original spec, this covers Round 1 only. Not included yet:
Round 2 (Bug Warfare), Round 3 (Code War) with the isolated Docker code
judge, full anti-cheat scoring/disqualification workflow, multi-contest
admin config UI, and rate limiting. The architecture (server-authoritative
timers, no-answers-in-API, admin-only score visibility, audit event log)
is already in place so these can be added as separate phases without
reworking what exists — see the original phased plan in your requirements
doc (Phases 2–10).

## Security notes for this demo
- Correct MCQ answers are never included in any participant-facing API response.
- The server's clock — not the browser — decides whether a submission is
  accepted; the on-screen timer is cosmetic only.
- Sessions are signed JWTs in httpOnly cookies; admin and participant roles
  are checked on every API route.
- No secrets are hardcoded — everything sensitive comes from environment
  variables (`.env` locally, Vercel env vars in production).
- Tab-switch / blur / copy / paste / fullscreen-exit events are logged per
  participant but never auto-disqualify anyone — that stays a manual admin
  decision, per your requirement.
