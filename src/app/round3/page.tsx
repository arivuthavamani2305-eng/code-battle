"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FocusGuard } from "@/components/FocusGuard";

type VisibleTestCase = { args: unknown[]; expectedOutput: unknown };

type Problem = {
  id: string;
  title: string;
  statement: string;
  starterCode: string;
  order: number;
  visibleTestCases: VisibleTestCase[];
};

type Status = {
  round3Active: boolean;
  round3StartAt: string | null;
  round3EndAt: string | null;
  round2Submitted: boolean;
  hasSubmitted: boolean;
  disqualified: boolean;
};

type RunResult = {
  results: { hidden: boolean; passed: boolean; error: string | null; timedOut: boolean; actualOutput?: unknown }[];
  passedCount: number;
  totalCount: number;
};

function reportAudit(type: string) {
  fetch("/api/round1/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  }).catch(() => {});
}

export default function Round3Page() {
  const [status, setStatus] = useState<Status | null>(null);
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [code, setCode] = useState<Record<string, string>>({});
  const [runResults, setRunResults] = useState<Record<string, RunResult>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const submittedRef = useRef(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/round3/status");
    if (res.status === 401) {
      window.location.href = "/";
      return;
    }
    const data: Status = await res.json();
    setStatus(data);
    if (data.hasSubmitted) setSubmitted(true);
    return data;
  }, []);

  const loadProblems = useCallback(async () => {
    const res = await fetch("/api/round3/questions");
    if (res.ok) {
      const data = await res.json();
      setProblems(data.problems);
      setCode((prev) => {
        const next = { ...prev };
        for (const p of data.problems as Problem[]) {
          if (!next[p.id]) next[p.id] = p.starterCode;
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const data = await loadStatus();
      if (cancelled || !data) return;
      if (data.round3Active && !data.hasSubmitted && !data.disqualified) {
        loadProblems();
      }
    }
    tick();
    const interval = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadStatus, loadProblems]);

  useEffect(() => {
    if (!status?.round3EndAt) return;
    const end = new Date(status.round3EndAt).getTime();
    const update = () => setRemainingSeconds(Math.max(0, Math.round((end - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status?.round3EndAt]);

  useEffect(() => {
    const onVisibility = () => document.hidden && reportAudit("TAB_SWITCH");
    const onBlur = () => reportAudit("WINDOW_BLUR");
    const onFocus = () => reportAudit("WINDOW_FOCUS");
    const onCopy = () => reportAudit("COPY_ATTEMPT");
    const onPaste = () => reportAudit("PASTE_ATTEMPT");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  async function handleRun(problemId: string) {
    setRunning((prev) => ({ ...prev, [problemId]: true }));
    try {
      const res = await fetch("/api/round3/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, code: code[problemId] ?? "" }),
      });
      const data = await res.json();
      if (res.ok) setRunResults((prev) => ({ ...prev, [problemId]: data }));
      else setError(data.error ?? "Run failed.");
    } finally {
      setRunning((prev) => ({ ...prev, [problemId]: false }));
    }
  }

  async function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        solutions: Object.entries(code).map(([problemId, c]) => ({ problemId, code: c })),
      };
      const res = await fetch("/api/round3/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        submittedRef.current = false;
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function openSubmitConfirmation() {
    setShowSubmitConfirmation(true);
  }

  if (!status) return <Centered>Loading Round 3 status...</Centered>;
  if (status.disqualified) return <Centered>You have been disqualified from this contest.</Centered>;
  if (!status.round2Submitted) return <Centered>Complete Round 2 first before Round 3 unlocks.</Centered>;

  if (submitted) {
    return (
      <Centered>
        <div className="space-y-2 text-center">
          <p className="text-xl font-semibold">Round 3 submitted ✅</p>
          <p className="text-slate-400 text-sm">
            Your solution has been recorded and test cases have run. Final scores are released by the
            admin after grading.
          </p>
        </div>
      </Centered>
    );
  }

  if (!status.round3Active) return <Centered>Waiting for the admin to start Round 3...</Centered>;
  if (!problems) return <Centered>Loading problem...</Centered>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <FocusGuard active={status.round3Active} onViolationSubmit={handleSubmit} />
      <header className="mb-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <h1 className="font-semibold">Round 3 — Code War</h1>
        <TimerBadge seconds={remainingSeconds} />
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="space-y-6">
        {problems.map((p) => {
          const run = runResults[p.id];
          return (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h2 className="font-medium">{p.title}</h2>
              <p className="whitespace-pre-wrap text-sm text-slate-300">{p.statement}</p>

              <div>
                <p className="mb-1 text-xs text-slate-500">
                  Sample tests ({p.visibleTestCases.length}) — write a function called{" "}
                  <code className="text-indigo-400">solve</code>
                </p>
                <div className="space-y-1">
                  {p.visibleTestCases.map((tc, i) => (
                    <pre key={i} className="overflow-x-auto rounded bg-slate-950 p-2 text-xs text-slate-400">
                      solve({tc.args.map((a) => JSON.stringify(a)).join(", ")}) → {JSON.stringify(tc.expectedOutput)}
                    </pre>
                  ))}
                </div>
              </div>

              <textarea
                spellCheck={false}
                value={code[p.id] ?? p.starterCode}
                onChange={(e) => setCode((prev) => ({ ...prev, [p.id]: e.target.value }))}
                rows={14}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs outline-none focus:border-indigo-500"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRun(p.id)}
                  disabled={running[p.id]}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
                >
                  {running[p.id] ? "Running..." : "Run sample tests"}
                </button>
                {run && (
                  <span className={`text-xs ${run.passedCount === run.totalCount ? "text-emerald-400" : "text-amber-400"}`}>
                    {run.passedCount}/{run.totalCount} sample tests passed
                  </span>
                )}
              </div>

              {run && (
                <div className="space-y-1">
                  {run.results.map((r, i) => (
                    <p key={i} className={`text-xs ${r.passed ? "text-emerald-400" : "text-red-400"}`}>
                      Test {i + 1}: {r.passed ? "✓ passed" : r.error ? `✗ ${r.error}` : "✗ wrong output"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <button
          onClick={openSubmitConfirmation}
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Round 3 (final)"}
        </button>
      </div>

      {showSubmitConfirmation && (
        <SubmitConfirmation
          unanswered={problems
            .filter((p) => !(code[p.id] ?? p.starterCode).trim())
            .map((p, index) => `Problem ${index + 1}: ${p.title}`)}
          onCancel={() => setShowSubmitConfirmation(false)}
          onConfirm={() => {
            setShowSubmitConfirmation(false);
            handleSubmit();
          }}
        />
      )}
    </main>
  );
}

function SubmitConfirmation({
  unanswered,
  onCancel,
  onConfirm,
}: {
  unanswered: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Confirm final submission</h2>
        {unanswered.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-slate-300">These problems have no code:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-300">
              {unanswered.map((problem) => <li key={problem}>{problem}</li>)}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-300">All problems have code.</p>
        )}
        <p className="mt-4 text-sm text-slate-300">Are you sure you want to submit?</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Go back</button>
          <button onClick={onConfirm} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">Submit final</button>
        </div>
      </div>
    </div>
  );
}

function TimerBadge({ seconds }: { seconds: number | null }) {
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const low = seconds <= 30;
  return (
    <span className={`rounded-lg px-3 py-1 font-mono text-sm ${low ? "bg-red-900 text-red-300" : "bg-slate-800"}`}>
      {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="state-shell flex min-h-screen items-center justify-center px-4 text-center text-slate-300">
      <div className="state-card">{children}</div>
    </main>
  );
}
