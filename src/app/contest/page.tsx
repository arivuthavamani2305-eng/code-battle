"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Question = {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficulty: "EASY" | "HARD";
  order: number;
};

type Status = {
  serverTime: string;
  round1Active: boolean;
  round1StartAt: string | null;
  round1EndAt: string | null;
  round1DurationSeconds: number;
  hasSubmitted: boolean;
  disqualified: boolean;
};

function reportAudit(type: string) {
  fetch("/api/round1/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  }).catch(() => {
    /* best-effort; never blocks the participant's UI */
  });
}

export default function ContestPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/round1/status");
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
    const res = await fetch("/api/round1/questions");
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions);
    }
  }, []);

  // Poll round status every few seconds while waiting / during the round.
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const data = await loadStatus();
      if (cancelled || !data) return;
      if (data.round1Active && !data.hasSubmitted && !data.disqualified) {
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

  // Local visual countdown only - purely cosmetic. The server independently
  // rejects any submission received after its own end time.
  useEffect(() => {
    if (!status?.round1EndAt) return;
    const end = new Date(status.round1EndAt).getTime();
    const update = () => {
      const secs = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemainingSeconds(secs);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status?.round1EndAt]);

  // Anti-cheat listeners - recorded server-side, never used to auto-disqualify here.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) reportAudit("TAB_SWITCH");
    };
    const onBlur = () => reportAudit("WINDOW_BLUR");
    const onFocus = () => reportAudit("WINDOW_FOCUS");
    const onCopy = () => reportAudit("COPY_ATTEMPT");
    const onPaste = () => reportAudit("PASTE_ATTEMPT");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) reportAudit("FULLSCREEN_EXIT");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  async function handleSubmit() {
    if (submittedRef.current) return; // guard against double-click
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        })),
      };
      const res = await fetch("/api/round1/submit", {
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

  if (!status) {
    return <Centered>Loading contest status...</Centered>;
  }

  if (status.disqualified) {
    return <Centered>You have been disqualified from this contest.</Centered>;
  }

  if (submitted) {
    return (
      <Centered>
        <div className="space-y-2 text-center">
          <p className="text-xl font-semibold">Round 1 submitted ✅</p>
          <p className="text-slate-400 text-sm">
            Your answers have been recorded. Scores are released by the admin after the round closes.
          </p>
        </div>
      </Centered>
    );
  }

  if (!status.round1Active) {
    return <Centered>Waiting for the admin to start Round 1...</Centered>;
  }

  if (!questions) {
    return <Centered>Loading questions...</Centered>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <h1 className="font-semibold">Round 1 — Code Unlock</h1>
        <TimerBadge seconds={remainingSeconds} />
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Q{idx + 1}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  q.difficulty === "EASY" ? "bg-emerald-900 text-emerald-300" : "bg-amber-900 text-amber-300"
                }`}
              >
                {q.difficulty}
              </span>
            </div>
            <p className="mb-3 whitespace-pre-wrap font-medium">{q.text}</p>
            <div className="space-y-2">
              {(["A", "B", "C", "D"] as const).map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    answers[q.id] === opt
                      ? "border-indigo-500 bg-indigo-950"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="accent-indigo-500"
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  />
                  <span className="font-mono text-xs text-slate-500">{opt}</span>
                  <span>{q[`option${opt}` as "optionA"]}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Round 1"}
        </button>
      </div>
    </main>
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
  return <main className="flex min-h-screen items-center justify-center px-4 text-slate-300">{children}</main>;
}
