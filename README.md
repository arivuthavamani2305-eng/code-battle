# Code Battle — Full 3-Round Platform

A working demo of all three Code Battle rounds:
- **Round 1 — Code Unlock (MCQ):** 15 questions, server-side scoring, 20 marks.
- **Round 2 — Bug Warfare:** participants fix buggy JS snippets; output is
  auto-checked against the expected result, 30 marks.
- **Round 3 — Code War:** participants write a `solve()` function, run it
  against sample tests, then submit for full (visible + hidden) test-case
  judging, 50 marks.

Every round has a server-authoritative timer, an admin dashboard to
start/stop each round, and per-rubric scoring. Rounds 2 and 3 combine
auto-computed marks (output/test-case correctness, time efficiency) with
admin-entered marks for the subjective rubric criteria (bug identification,
correctness of fix, logic & algorithm, code quality, etc.) — see
`src/lib/scoring.ts` for the exact rubric breakdown.

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
   - `DATABASE_URL` → the Neon **pooled** connection string from step 3
     (the hostname must contain `-pooler`)
   - `DB_CONNECTION_LIMIT` → optional per-function-instance pool limit;
     use `5` for the competition (the application default)
   - `DB_POOL_TIMEOUT_SECONDS` → optional pool wait timeout (default `20`)
   - `DB_CONNECT_TIMEOUT_SECONDS` → optional connection timeout (default `10`)
   - `AUTH_SECRET` → any long random string (generate one at
     https://generate-secret.vercel.app/32 or run `openssl rand -base64 32`)
   - `ADMIN_PASSWORD` → a password you choose for the admin dashboard
   - `ROUND1_DURATION_SECONDS` → e.g. `1200` for 20 minutes
   - `ROUND2_DURATION_SECONDS` → optional, e.g. `1800` for 30 minutes
     (defaults to 1800 if not set)
   - `ROUND3_DURATION_SECONDS` → optional, e.g. `2700` for 45 minutes
     (defaults to 2700 if not set)
4. Click **Deploy**. Vercel will run `npm install` and `npm run build`
   (which also runs `prisma generate`) automatically.

This deployment is Vercel-compatible because it uses Next.js serverless API
routes, PostgreSQL, Prisma, and the JavaScript judge. Do not install a local
JDK or Docker dependency inside a Vercel function. Java auto-grading requires
an external isolated judge service called over HTTPS.

---

## 5. Create tables and seed questions on the live database

Once deployed, run this **once** from your own machine (it points at the
live Neon database, not your local one):

```bash
# in the project folder, with .env pointing at the SAME DATABASE_URL you gave Vercel
npx prisma migrate deploy
npm run seed
```

This creates the tables and inserts the 15 MCQs, 4 bug-fixing questions,
1 coding problem, and 3 demo participants into the live database Vercel
is using.

---

## 6. You're live

- Participant site: `https://<your-project>.vercel.app/`
- Admin dashboard: `https://<your-project>.vercel.app/admin`

Log in to `/admin` with the `ADMIN_PASSWORD` you set. The round buttons at
the top start/stop each round independently:

1. Click **Start R1**, then log participants in with their access codes
   (from a different browser/incognito window) to try Round 1.
2. Once a participant submits Round 1, they'll see a link to Round 2 — it
   stays locked until you click **Start R2**.
3. Same for Round 3 after Round 2 is submitted — click **Start R3**.

Scores for Round 1 are fully automatic. For Rounds 2 and 3, scroll down on
the admin dashboard: the auto-computed marks (output match / test pass
rate / time efficiency) show immediately, and you enter the remaining
rubric marks (bug identification, correctness of fix, logic & algorithm,
code quality, etc.) directly in the table — click **Review** to see the
participant's actual code/explanation before marking, then **Save**. The
total updates as soon as you save.

To add real participants for your event, use the "Add" form in the admin
Participants panel — it generates a unique access code for each one.

---

## How Round 2 and Round 3 auto-grading works

Both rounds run participant-submitted JavaScript through a sandboxed judge
(`src/lib/judge.ts`, built on Node's built-in `vm` module with a timeout —
no extra dependencies needed). This is enough isolation for a supervised
contest with pre-registered participants, but it is **not** a substitute
for a fully isolated container/VM sandbox (Docker, Firecracker, gVisor) if
this were ever opened to untrusted public submissions at scale.

- **Round 2:** each bug question has one JS snippet with a known
  `expectedOutput`. The participant edits it; on submit, the fixed code
  runs server-side and its `console.log` output is compared to
  `expectedOutput` (worth 5 of the 30 marks). A "Test my fix" button gives
  the same check pre-submission without revealing the expected output text.
- **Round 3:** each problem defines `testCases` (visible + hidden) as
  `{ args, expectedOutput }` pairs. Participant code must define
  `function solve(...)`. Visible cases can be run anytime via "Run sample
  tests"; on final submit, both visible and hidden cases run server-side
  and the pass rate becomes the 15-mark "Correctness & Test Cases" score.
  Hidden test case inputs/outputs are never sent to the client.

To add more bug questions or coding problems, edit `BUG_QUESTIONS` /
`CODING_PROBLEMS` in `prisma/seed.ts` (each one there was verified against
the actual judge before being added) and re-run `npm run seed`, or insert
rows directly via `prisma.bugQuestion.create` / `prisma.codingProblem.create`.

---

## Contest rules and enforcement

Participants acknowledge the penalty and disqualification rules before
entering. The browser records tab switches, focus changes, copy/paste
attempts, and fullscreen exits as audit events. These events provide review
evidence but cannot guarantee browser-level prevention of external websites,
other devices, screenshots, or collaboration.

Admins can open a participant's audit history in the dashboard and
disqualify or reinstate the participant with a reason. Disqualified
participants are blocked from contest APIs and excluded from score feeds and
the overall leaderboard. Organizer review is still required for behavior a
browser cannot reliably observe.

## What's intentionally simplified in this build

- Only JavaScript is auto-executed/auto-graded. Java questions can be added
  through the existing `BugQuestion.language` field and are accepted for
  manual admin grading, but Java execution requires an external isolated
  judge service. A JDK cannot be safely or reliably installed inside a Vercel
  serverless function.
- Round 2 and Round 3 rubric criteria that require human judgment (bug
  identification, correctness of fix, logic & algorithm quality, code
  quality, time/space complexity analysis) are deliberately left to the
  admin to grade — no attempt is made to auto-score code quality or
  algorithmic reasoning, since that would be unreliable.
- Automatic disqualification thresholds and rate limiting are not enabled by
  default. Audit events remain reviewable so organizers can apply the rules
  consistently and record a reason for each decision.

## Security notes for this demo
- Correct MCQ answers, bug-fix expected outputs, and hidden test cases are
  never included in any participant-facing API response.
- The server's clock — not the browser — decides whether a submission is
  accepted for every round; the on-screen timer is cosmetic only.
- Sessions are signed JWTs in httpOnly cookies; admin and participant roles
  are checked on every API route.
- No secrets are hardcoded — everything sensitive comes from environment
  variables (`.env` locally, Vercel env vars in production).
- Tab-switch / blur / copy / paste / fullscreen-exit events are logged per
  participant but never auto-disqualify anyone — that stays a manual admin
  decision, per your requirement.
