"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FocusGuard } from "@/components/FocusGuard";

type BugQuestion = {
  id: string;
  title: string;
  language: string;
  buggyCode: string;
  hint: string | null;
  order: number;
};

type Status = {
  round2Active: boolean;
  round2StartAt: string | null;
  round2EndAt: string | null;
  round1Submitted: boolean;
  hasSubmitted: boolean;
  disqualified: boolean;
};

// Shared audit endpoint - the path says "round1" but it just logs
// participantId + event type, so it's reused for every round.
function reportAudit(type: string) {
  fetch("/api/round1/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  }).catch(() => {});
}

export default function Round2Page() {
  const [status, setStatus] = useState<Status | null>(null);
  const [questions, setQuestions] = useState<BugQuestion[] | null>(null);
  const [fixes, setFixes] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<
    Record<string, { output: string | null; matched: boolean | null; error: string | null }>
  >({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const submittedRef = useRef(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/round2/status");
    if (res.status === 401) {
      window.location.href = "/";
      return;
    }
    const data: Status = await res.json();
    setStatus(data);
    if (data.hasSubmitted) setSubmitted(true);
    return data;
  }, []);

  const loadQuestions = useCallback(async () => {
    const res = await fetch("/api/round2/questions");
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.bugQuestions);
      setFixes((prev) => {
        const next = { ...prev };
        for (const q of data.bugQuestions as BugQuestion[]) {
          if (!next[q.id]) next[q.id] = q.buggyCode;
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
      if (data.round2Active && !data.hasSubmitted && !data.disqualified) {
        loadQuestions();
      }
    }
    tick();
    const interval = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadStatus, loadQuestions]);

  useEffect(() => {
    if (!status?.round2EndAt) return;
    const end = new Date(status.round2EndAt).getTime();
    const update = () => setRemainingSeconds(Math.max(0, Math.round((end - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status?.round2EndAt]);

  useEffect(() => {
    const onVisibility = () => document.hidden && reportAudit("TAB_SWITCH");
    const onBlur = () => reportAudit("WINDOW_BLUR");
    const onFocus = () => reportAudit("WINDOW_FOCUS");
    const onCopy = () => reportAudit("COPY_ATTEMPT");
    const onPaste = () => reportAudit("PASTE_ATTEMPT");
    const onPageHide = () => reportAudit("TAB_SWITCH");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  async function handleTest(questionId: string) {
    setTesting((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await fetch("/api/round2/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugQuestionId: questionId, code: fixes[questionId] ?? "" }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [questionId]: data }));
    } finally {
      setTesting((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  async function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        fixes: Object.entries(fixes).map(([bugQuestionId, code]) => ({
          bugQuestionId,
          fixedCode: code,
        })),
      };
      const res = await fetch("/api/round2/submit", {
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

  if (!status) return <Centered>Loading Round 2 status...</Centered>;
  if (status.disqualified) return <Centered>You have been disqualified from this contest.</Centered>;
  if (!status.round1Submitted) return <Centered>Complete Round 1 first before Round 2 unlocks.</Centered>;

  if (submitted) {
    return (
      <Centered>
        <div className="space-y-3 text-center">
          <p className="text-xl font-semibold">Round 2 submitted ✅</p>
          <p className="text-slate-400 text-sm">
            Your fixes have been recorded. Scores are released by the admin after grading.
          </p>
          <a href="/round3" className="inline-block text-sm text-indigo-400 underline hover:text-indigo-300">
            Go to Round 3 (once the admin starts it) →
          </a>
        </div>
      </Centered>
    );
  }

  if (!status.round2Active) return <Centered>Waiting for the admin to start Round 2...</Centered>;
  if (!questions) return <Centered>Loading bug questions...</Centered>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <FocusGuard active={status.round2Active} onViolationSubmit={handleSubmit} />
      <header className="mb-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <h1 className="font-semibold">Round 2 — Bug Warfare</h1>
        <TimerBadge seconds={remainingSeconds} />
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const code = fixes[q.id] ?? q.buggyCode;
          const result = testResults[q.id];
          return (
            <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Bug {idx + 1}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">{q.language}</span>
                <h2 className="font-medium">{q.title}</h2>
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-500">Original (buggy) code</p>
                <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-400">{q.buggyCode}</pre>
              </div>

              {q.hint && <p className="text-xs italic text-amber-400/80">Hint: {q.hint}</p>}

              <div>
                <p className="mb-1 text-xs text-slate-500">Your fixed code</p>
                <textarea
                  spellCheck={false}
                  value={code}
                  onChange={(e) =>
                    setFixes((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  rows={12}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTest(q.id)}
                  disabled={testing[q.id] || q.language.toLowerCase() !== "python"}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:opacity-50"
                >
                  {testing[q.id]
                    ? "Running..."
                    : q.language.toLowerCase() === "python"
                    ? "Run & debug"
                    : "Manual grading"}
                </button>
                {q.language.toLowerCase() !== "python" && (
                  <span className="text-xs text-slate-500">
                    {q.language} submissions are reviewed by the admin.
                  </span>
                )}
                {result && (
                  <span className={`text-xs ${result.matched ? "text-emerald-400" : "text-red-400"}`}>
                    {result.matched
                      ? "Output matches expected ✓"
                      : result.error
                      ? result.error
                      : `Output: ${result.output ?? "(none)"} — does not match yet`}
                  </span>
                )}
              </div>
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
          {submitting ? "Submitting..." : "Submit Round 2"}
        </button>
      </div>

      {showSubmitConfirmation && (
        <SubmitConfirmation
          unanswered={questions
            .filter((q) => !String(fixes[q.id] ?? "").trim())
            .map((q, index) => `Bug ${index + 1}: ${q.title}`)}
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
        <h2 className="text-lg font-semibold">Confirm submission</h2>
        {unanswered.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-slate-300">These questions are incomplete:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-300">
              {unanswered.map((question) => <li key={question}>{question}</li>)}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-300">All questions have been completed.</p>
        )}
        <p className="mt-4 text-sm text-slate-300">Are you sure you want to submit?</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Go back</button>
          <button onClick={onConfirm} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500">Submit anyway</button>
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
