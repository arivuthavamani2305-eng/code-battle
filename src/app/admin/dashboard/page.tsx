"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { downloadCSV } from "@/lib/csv";

type Participant = {
  id: string;
  name: string;
  accessCode: string;
  disqualified: boolean;
  hasSubmittedRound1: boolean;
};

type AuditEvent = { id: string; type: string; detail: string | null; createdAt: string };

type ScoreRow = {
  rank: number;
  participantName: string;
  accessCode: string;
  correctnessScore: number;
  timeScore: number;
  totalScore: number;
  submittedAt: string;
};

type Round2Payload = {
  bugQuestionId: string;
  title: string;
  fixedCode: string;
  bugExplanation: string;
  actualOutput: string | null;
  runError: string | null;
  outputMatched: boolean;
}[];

type Round2Row = {
  submissionId: string;
  participantName: string;
  accessCode: string;
  graded: boolean;
  criteriaScores: {
    bugIdentification: number | null;
    correctnessOfFix: number | null;
    expectedOutput: number;
    timeEfficiency: number;
  };
  totalScore: number;
  payload: Round2Payload;
  submittedAt: string;
};

type Round3Payload = {
  problemId: string;
  title: string;
  code: string;
  results: { hidden: boolean; passed: boolean; error: string | null; timedOut: boolean; actualOutput?: unknown }[];
  passedCount: number;
  totalCount: number;
}[];

type Round3Row = {
  submissionId: string;
  participantName: string;
  accessCode: string;
  graded: boolean;
  criteriaScores: {
    problemUnderstanding: number | null;
    logicAlgorithm: number | null;
    correctnessTestCases: number;
    codeQuality: number | null;
    timeSpaceOptimization: number | null;
  };
  totalScore: number;
  payload: Round3Payload;
  submittedAt: string;
};

type RoundStatus = { active: boolean; startAt: string | null; endAt: string | null };
type ContestStatus = { round1: RoundStatus; round2: RoundStatus; round3: RoundStatus };

export default function AdminDashboardPage() {
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [scores, setScores] = useState<ScoreRow[] | null>(null);
  const [round2Rows, setRound2Rows] = useState<Round2Row[] | null>(null);
  const [round3Rows, setRound3Rows] = useState<Round3Row[] | null>(null);
  const [contestStatus, setContestStatus] = useState<ContestStatus | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [auditParticipantId, setAuditParticipantId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const loadAll = useCallback(async () => {
    const [pRes, sRes, r2Res, r3Res, cRes] = await Promise.all([
      fetch("/api/admin/participants"),
      fetch("/api/admin/round1/scores"),
      fetch("/api/admin/round2/scores"),
      fetch("/api/admin/round3/scores"),
      fetch("/api/admin/contest/status"),
    ]);
    if ([pRes, sRes, r2Res, r3Res, cRes].some((r) => r.status === 401)) {
      window.location.href = "/admin";
      return;
    }
    const pData = await pRes.json();
    const sData = await sRes.json();
    const r2Data = await r2Res.json();
    const r3Data = await r3Res.json();
    const cData = await cRes.json();
    setParticipants(pData.participants);
    setScores(sData.rows);
    setRound2Rows(r2Data.rows);
    setRound3Rows(r3Data.rows);
    if (cRes.ok) setContestStatus(cData);
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [loadAll]);

  async function callAdminAction(url: string, method = "POST") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, { method });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Action failed.");
        return;
      }
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function resetRound3() {
    const confirmed = window.confirm(
      "Reset Round 3? This permanently deletes all Round 3 submissions and scores, then clears the round timer."
    );
    if (!confirmed) return;
    await callAdminAction("/api/admin/round3/reset");
  }

  async function resetContest() {
    const confirmed = window.confirm(
      "Reset the entire contest? This permanently deletes all submissions, scores, answers, and audit history for every round, then clears all round timers. Participants and questions will be kept."
    );
    if (!confirmed) return;
    await callAdminAction("/api/admin/contest/reset");
  }

  async function removeParticipant(participant: Participant) {
    const confirmed = window.confirm(
      `Remove ${participant.name} permanently? This deletes their submissions, scores, answers, and audit history.`
    );
    if (!confirmed) return;
    await callAdminAction(`/api/admin/participants/${participant.id}`, "DELETE");
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewName("");
        await loadAll();
        setMessage(`Added ${data.name} — access code ${data.accessCode}`);
      } else {
        setMessage(data.error ?? "Failed to add participant.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function reviewAudit(participantId: string) {
    if (auditParticipantId === participantId) {
      setAuditParticipantId(null);
      return;
    }
    const res = await fetch(`/api/admin/participants/${participantId}/audit`);
    const data = await res.json();
    if (res.ok) {
      setAuditParticipantId(participantId);
      setAuditEvents(data.events);
    } else {
      setMessage(data.error ?? "Could not load audit events.");
    }
  }

  async function changeParticipantStatus(participant: Participant) {
    const disqualify = !participant.disqualified;
    const reason = disqualify ? window.prompt("Reason for disqualification:")?.trim() ?? "" : "Admin reinstatement";
    if (disqualify && !reason) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/participants/${participant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: disqualify ? "disqualify" : "reinstate", reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not update participant status.");
        return;
      }
      setMessage(disqualify ? `${participant.name} was disqualified.` : `${participant.name} was reinstated.`);
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  const leaderboard = useMemo(
    () => buildLeaderboard(participants, scores, round2Rows, round3Rows),
    [participants, scores, round2Rows, round3Rows]
  );

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 space-y-6 sm:px-4 sm:py-8 sm:space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Code Battle — Admin</h1>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {([1, 2, 3] as const).map((round) => {
            const key = `round${round}` as const;
            const rs = contestStatus?.[key];
            const isActive = rs?.active ?? false;
            const hasEnded = !isActive && !!rs?.endAt;
            return (
              <div key={round} className="flex items-center gap-1.5">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-900 text-emerald-300"
                      : hasEnded
                      ? "bg-slate-700 text-slate-300"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  R{round}: {isActive ? "● Active" : hasEnded ? "Ended" : "Not started"}
                </span>
                <button
                  disabled={busy || isActive}
                  onClick={() => callAdminAction(`/api/admin/round${round}/start`)}
                  title={isActive ? `Round ${round} is already running` : `Start Round ${round}`}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
                >
                  Start R{round}
                </button>
                <button
                  disabled={busy || !isActive}
                  onClick={() => callAdminAction(`/api/admin/round${round}/stop`)}
                  title={!isActive ? `Round ${round} isn't running` : `Stop Round ${round}`}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
                >
                  Stop R{round}
                </button>
              </div>
            );
          })}
        </div>
      </header>

      {message && <p className="text-sm text-indigo-300">{message}</p>}

      <div className="flex justify-end">
        <button
          disabled={busy || contestStatus?.round1.active || contestStatus?.round2.active || contestStatus?.round3.active}
          onClick={resetContest}
          title="Stop all rounds before resetting the entire contest"
          className="rounded-xl border border-red-400/80 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-red-950/40 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-red-900/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset All Rounds
        </button>
      </div>

      <LeaderboardSection rows={leaderboard} loading={!participants} />

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 font-semibold">Participants</h2>
        <form onSubmit={addParticipant} className="mb-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Participant name"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </form>
        <div className="admin-scroll overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1">Name</th>
                <th className="py-1">Access Code</th>
                <th className="py-1">Submitted?</th>
                <th className="py-1">Status</th>
                <th className="py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants === null && <SkeletonRows columns={4} />}
              {participants?.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-t border-slate-800">
                    <td className="py-1.5">{p.name}</td>
                    <td className="py-1.5 font-mono text-xs">{p.accessCode}</td>
                    <td className="py-1.5">{p.hasSubmittedRound1 ? "Yes" : "No"}</td>
                    <td className="py-1.5">{p.disqualified ? "Disqualified" : "Active"}</td>
                    <td className="py-1.5 space-x-2">
                      <button onClick={() => reviewAudit(p.id)} className="text-xs text-indigo-400 underline">
                        {auditParticipantId === p.id ? "Hide audit" : "Audit"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => changeParticipantStatus(p)}
                        className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600 disabled:opacity-50"
                      >
                        {p.disqualified ? "Reinstate" : "Disqualify"}
                      </button>
                      <button
                        disabled={busy || contestStatus?.round1.active || contestStatus?.round2.active || contestStatus?.round3.active}
                        onClick={() => removeParticipant(p)}
                        className="rounded bg-red-800 px-2 py-1 text-xs hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  {auditParticipantId === p.id && (
                    <tr className="border-t border-slate-800 bg-slate-950/50">
                      <td colSpan={5} className="p-3">
                        <div className="space-y-1 text-xs">
                          {auditEvents.length === 0 && <p className="text-slate-500">No audit events.</p>}
                          {auditEvents.map((event) => (
                            <p key={event.id} className="text-slate-300">
                              <span className="font-mono text-slate-500">{new Date(event.createdAt).toLocaleString()}</span>{" "}
                              <span className="font-medium text-amber-300">{event.type}</span>
                              {event.detail && <span className="text-slate-400"> — {event.detail}</span>}
                            </p>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {participants?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-slate-500">
                    No participants yet — add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Round 1 Scores &amp; Ranking</h2>
          <button
            disabled={!scores || scores.length === 0}
            onClick={() =>
              downloadCSV(
                "round1-scores",
                (scores ?? []).map((r) => ({
                  Rank: r.rank,
                  Name: r.participantName,
                  AccessCode: r.accessCode,
                  "Correctness/15": r.correctnessScore,
                  "Time/5": r.timeScore,
                  "Total/20": r.totalScore,
                }))
              )
            }
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
        <div className="admin-scroll overflow-x-auto">
          <table className="min-w-[540px] w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1">Rank</th>
                <th className="py-1">Name</th>
                <th className="py-1">Correctness /15</th>
                <th className="py-1">Time /5</th>
                <th className="py-1">Total /20</th>
              </tr>
            </thead>
            <tbody>
              {scores === null && <SkeletonRows columns={5} />}
              {scores?.map((r) => (
                <tr key={r.accessCode} className="border-t border-slate-800">
                  <td className="py-1.5">{r.rank}</td>
                  <td className="py-1.5">{r.participantName}</td>
                  <td className="py-1.5">{r.correctnessScore}</td>
                  <td className="py-1.5">{r.timeScore}</td>
                  <td className="py-1.5 font-semibold">{r.totalScore}</td>
                </tr>
              ))}
              {scores?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-slate-500">
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Round2Section rows={round2Rows} onGraded={loadAll} />
      <Round3Section rows={round3Rows} onGraded={loadAll} />
    </main>
  );
}

// Skeleton placeholder rows shown while a table's data is still loading
// (state === null). Not shown once loaded, even if the result is empty -
// the "No submissions yet" rows handle that case instead.
function SkeletonRows({ columns, rows = 3 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-slate-800">
          {Array.from({ length: columns }).map((__, j) => (
            <td key={j} className="py-2.5">
              <div className="h-3 w-full max-w-[5rem] animate-pulse rounded bg-slate-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

type LeaderboardRow = {
  accessCode: string;
  name: string;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  final: number;
};

function buildLeaderboard(
  participants: Participant[] | null,
  scores: ScoreRow[] | null,
  round2Rows: Round2Row[] | null,
  round3Rows: Round3Row[] | null
): LeaderboardRow[] {
  if (!participants) return [];
  const r1Map = new Map((scores ?? []).map((s) => [s.accessCode, s.totalScore]));
  const r2Map = new Map((round2Rows ?? []).map((r) => [r.accessCode, r.totalScore]));
  const r3Map = new Map((round3Rows ?? []).map((r) => [r.accessCode, r.totalScore]));

  return participants
    .filter((p) => !p.disqualified)
    .map((p) => {
      const r1 = r1Map.has(p.accessCode) ? r1Map.get(p.accessCode)! : null;
      const r2 = r2Map.has(p.accessCode) ? r2Map.get(p.accessCode)! : null;
      const r3 = r3Map.has(p.accessCode) ? r3Map.get(p.accessCode)! : null;
      const final = (r1 ?? 0) + (r2 ?? 0) + (r3 ?? 0);
      return { accessCode: p.accessCode, name: p.name, r1, r2, r3, final };
    })
    .sort((a, b) => b.final - a.final);
}

function LeaderboardSection({ rows, loading }: { rows: LeaderboardRow[]; loading: boolean }) {
  return (
    <section className="rounded-xl border border-indigo-800 bg-indigo-950/30 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold">🏆 Overall Leaderboard</h2>
        <button
          disabled={rows.length === 0}
          onClick={() =>
            downloadCSV(
              "leaderboard",
              rows.map((r, i) => ({
                Rank: i + 1,
                Name: r.name,
                AccessCode: r.accessCode,
                "Round1/20": r.r1 ?? "-",
                "Round2/30": r.r2 ?? "-",
                "Round3/50": r.r3 ?? "-",
                "Final/100": r.final,
              }))
            )
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Live — combines Round 1 + Round 2 + Round 3 totals (out of 100) and updates automatically as rounds are
        completed and graded. Missing rounds count as 0 until submitted/graded.
      </p>
      <div className="admin-scroll overflow-x-auto">
        <table className="min-w-[620px] w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Rank</th>
              <th className="py-1">Name</th>
              <th className="py-1">Round 1 /20</th>
              <th className="py-1">Round 2 /30</th>
              <th className="py-1">Round 3 /50</th>
              <th className="py-1">Final /100</th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonRows columns={6} />}
            {!loading &&
              rows.map((r, i) => (
                <tr key={r.accessCode} className="border-t border-indigo-900/50">
                  <td className="py-1.5">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="py-1.5">{r.name}</td>
                  <td className="py-1.5">{r.r1 ?? "—"}</td>
                  <td className="py-1.5">{r.r2 ?? "—"}</td>
                  <td className="py-1.5">{r.r3 ?? "—"}</td>
                  <td className="py-1.5 font-bold text-indigo-300">{r.final}</td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-center text-slate-500">
                  No participants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Round2Section({ rows, onGraded }: { rows: Round2Row[] | null; onGraded: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { bugIdentification: string; correctnessOfFix: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function draftFor(row: Round2Row) {
    return (
      drafts[row.submissionId] ?? {
        bugIdentification: row.criteriaScores.bugIdentification?.toString() ?? "",
        correctnessOfFix: row.criteriaScores.correctnessOfFix?.toString() ?? "",
      }
    );
  }

  async function saveGrade(row: Round2Row) {
    const d = draftFor(row);
    setSaving(row.submissionId);
    try {
      await fetch("/api/admin/round2/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: row.submissionId,
          bugIdentification: Number(d.bugIdentification || 0),
          correctnessOfFix: Number(d.correctnessOfFix || 0),
        }),
      });
      onGraded();
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Round 2 — Bug Warfare (30 marks: 10 Bug Identification + 10 Fix + 5 Output + 5 Time)</h2>
        <button
          disabled={!rows || rows.length === 0}
          onClick={() =>
            downloadCSV(
              "round2-scores",
              (rows ?? []).map((r) => ({
                Name: r.participantName,
                AccessCode: r.accessCode,
                "Bug Identification/10": r.criteriaScores.bugIdentification ?? "",
                "Fix/10": r.criteriaScores.correctnessOfFix ?? "",
                "Output/5": r.criteriaScores.expectedOutput,
                "Time/5": r.criteriaScores.timeEfficiency,
                "Total/30": r.totalScore,
                Status: r.graded ? "Graded" : "Pending",
              }))
            )
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <div className="admin-scroll overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Name</th>
              <th className="py-1 w-28 whitespace-nowrap">Bug Identify /10</th>
              <th className="py-1 w-20">Fix /10</th>
              <th className="py-1">Output /5</th>
              <th className="py-1">Time /5</th>
              <th className="py-1">Total /30</th>
              <th className="py-1">Status</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows === null && <SkeletonRows columns={8} />}
            {rows?.map((row) => {
              const d = draftFor(row);
              return (
                <Fragment key={row.submissionId}>
                  <tr className="border-t border-slate-800">
                    <td className="py-1.5">{row.participantName}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={d.bugIdentification}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.submissionId]: { ...d, bugIdentification: e.target.value },
                          }))
                        }
                        className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={d.correctnessOfFix}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.submissionId]: { ...d, correctnessOfFix: e.target.value },
                          }))
                        }
                        className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-1.5">{row.criteriaScores.expectedOutput}</td>
                    <td className="py-1.5">{row.criteriaScores.timeEfficiency}</td>
                    <td className="py-1.5 font-semibold">{row.totalScore}</td>
                    <td className="py-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          row.graded ? "bg-emerald-900 text-emerald-300" : "bg-amber-900 text-amber-300"
                        }`}
                      >
                        {row.graded ? "Graded" : "Pending"}
                      </span>
                    </td>
                    <td className="py-1.5 space-x-2">
                      <button
                        onClick={() => setExpanded(expanded === row.submissionId ? null : row.submissionId)}
                        className="text-xs text-indigo-400 underline"
                      >
                        {expanded === row.submissionId ? "Hide" : "Review"}
                      </button>
                      <button
                        disabled={saving === row.submissionId}
                        onClick={() => saveGrade(row)}
                        className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving === row.submissionId ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                  {expanded === row.submissionId && (
                    <tr key={`${row.submissionId}-detail`} className="border-t border-slate-800 bg-slate-950/50">
                      <td colSpan={8} className="p-3">
                        <div className="space-y-3">
                          {row.payload.map((item) => (
                            <div key={item.bugQuestionId} className="rounded-lg border border-slate-800 p-3">
                              <p className="mb-1 text-xs font-medium text-slate-300">{item.title}</p>
                              <p className="mb-1 text-xs text-slate-500">
                                Output match:{" "}
                                <span className={item.outputMatched ? "text-emerald-400" : "text-red-400"}>
                                  {item.outputMatched ? "yes" : "no"}
                                </span>
                                {item.runError && <span className="text-red-400"> — {item.runError}</span>}
                              </p>
                              <pre className="mb-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs text-slate-400">
                                {item.fixedCode}
                              </pre>
                              <p className="text-xs text-slate-500">
                                Explanation: <span className="text-slate-300">{item.bugExplanation || "(none given)"}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={8} className="py-3 text-center text-slate-500">
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Round3Section({ rows, onGraded }: { rows: Round3Row[] | null; onGraded: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        problemUnderstanding: string;
        logicAlgorithm: string;
        codeQuality: string;
        timeSpaceOptimization: string;
      }
    >
  >({});

  const [saving, setSaving] = useState<string | null>(null);

  function draftFor(row: Round3Row) {
    return (
      drafts[row.submissionId] ?? {
        problemUnderstanding: row.criteriaScores.problemUnderstanding?.toString() ?? "",
        logicAlgorithm: row.criteriaScores.logicAlgorithm?.toString() ?? "",
        codeQuality: row.criteriaScores.codeQuality?.toString() ?? "",
        timeSpaceOptimization: row.criteriaScores.timeSpaceOptimization?.toString() ?? "",
      }
    );
  }

  async function saveGrade(row: Round3Row) {
    const d = draftFor(row);
    setSaving(row.submissionId);
    try {
      await fetch("/api/admin/round3/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: row.submissionId,
          problemUnderstanding: Number(d.problemUnderstanding || 0),
          logicAlgorithm: Number(d.logicAlgorithm || 0),
          codeQuality: Number(d.codeQuality || 0),
          timeSpaceOptimization: Number(d.timeSpaceOptimization || 0),
        }),
      });
      onGraded();
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          Round 3 — Code War (50 marks: 5 Understanding + 15 Logic + 15 Tests + 5 Quality + 10 Time/Space)
        </h2>
        <button
          disabled={!rows || rows.length === 0}
          onClick={() =>
            downloadCSV(
              "round3-scores",
              (rows ?? []).map((r) => ({
                Name: r.participantName,
                AccessCode: r.accessCode,
                "Understanding/5": r.criteriaScores.problemUnderstanding ?? "",
                "Logic/15": r.criteriaScores.logicAlgorithm ?? "",
                "Tests/15": r.criteriaScores.correctnessTestCases,
                "Quality/5": r.criteriaScores.codeQuality ?? "",
                "TimeSpace/10": r.criteriaScores.timeSpaceOptimization ?? "",
                "Total/50": r.totalScore,
                Status: r.graded ? "Graded" : "Pending",
              }))
            )
          }
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <div className="admin-scroll overflow-x-auto">
        <table className="min-w-[820px] w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Name</th>
              <th className="py-1 w-16">Und /5</th>
              <th className="py-1 w-16">Logic /15</th>
              <th className="py-1">Tests /15</th>
              <th className="py-1 w-16">Quality /5</th>
              <th className="py-1 w-16">T/S /10</th>
              <th className="py-1">Total /50</th>
              <th className="py-1">Status</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows === null && <SkeletonRows columns={9} />}
            {rows?.map((row) => {
              const d = draftFor(row);
              return (
                <Fragment key={row.submissionId}>
                  <tr className="border-t border-slate-800">
                    <td className="py-1.5">{row.participantName}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={d.problemUnderstanding}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.submissionId]: { ...d, problemUnderstanding: e.target.value } }))
                        }
                        className="w-14 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={d.logicAlgorithm}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.submissionId]: { ...d, logicAlgorithm: e.target.value } }))
                        }
                        className="w-14 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-1.5">{row.criteriaScores.correctnessTestCases}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={d.codeQuality}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.submissionId]: { ...d, codeQuality: e.target.value } }))
                        }
                        className="w-14 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={d.timeSpaceOptimization}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.submissionId]: { ...d, timeSpaceOptimization: e.target.value } }))
                        }
                        className="w-14 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-1.5 font-semibold">{row.totalScore}</td>
                    <td className="py-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          row.graded ? "bg-emerald-900 text-emerald-300" : "bg-amber-900 text-amber-300"
                        }`}
                      >
                        {row.graded ? "Graded" : "Pending"}
                      </span>
                    </td>
                    <td className="py-1.5 space-x-2">
                      <button
                        onClick={() => setExpanded(expanded === row.submissionId ? null : row.submissionId)}
                        className="text-xs text-indigo-400 underline"
                      >
                        {expanded === row.submissionId ? "Hide" : "Review"}
                      </button>
                      <button
                        disabled={saving === row.submissionId}
                        onClick={() => saveGrade(row)}
                        className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving === row.submissionId ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                  {expanded === row.submissionId && (
                    <tr key={`${row.submissionId}-detail`} className="border-t border-slate-800 bg-slate-950/50">
                      <td colSpan={9} className="p-3">
                        <div className="space-y-3">
                          {row.payload.map((item) => (
                            <div key={item.problemId} className="rounded-lg border border-slate-800 p-3">
                              <p className="mb-1 text-xs font-medium text-slate-300">
                                {item.title} — {item.passedCount}/{item.totalCount} tests passed
                              </p>
                              <pre className="mb-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs text-slate-400">
                                {item.code}
                              </pre>
                              <div className="space-y-0.5">
                                {item.results.map((r, i) => (
                                  <p key={i} className={`text-xs ${r.passed ? "text-emerald-400" : "text-red-400"}`}>
                                    Test {i + 1} {r.hidden ? "(hidden)" : "(sample)"}:{" "}
                                    {r.passed ? "passed" : r.error ?? "failed"}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={9} className="py-3 text-center text-slate-500">
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}