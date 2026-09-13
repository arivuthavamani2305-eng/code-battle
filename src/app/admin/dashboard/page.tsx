"use client";

import { useCallback, useEffect, useState } from "react";

type Participant = {
  id: string;
  name: string;
  accessCode: string;
  disqualified: boolean;
  hasSubmittedRound1: boolean;
};

type ScoreRow = {
  rank: number;
  participantName: string;
  accessCode: string;
  correctnessScore: number;
  timeScore: number;
  totalScore: number;
  submittedAt: string;
};

export default function AdminDashboardPage() {
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [scores, setScores] = useState<ScoreRow[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch("/api/admin/participants"),
      fetch("/api/admin/round1/scores"),
    ]);
    if (pRes.status === 401 || sRes.status === 401) {
      window.location.href = "/admin";
      return;
    }
    const pData = await pRes.json();
    const sData = await sRes.json();
    setParticipants(pData.participants);
    setScores(sData.rows);
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [loadAll]);

  async function callAdminAction(url: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, { method: "POST" });
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Code Battle — Admin</h1>
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => callAdminAction("/api/admin/round1/start")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            Start Round 1
          </button>
          <button
            disabled={busy}
            onClick={() => callAdminAction("/api/admin/round1/stop")}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50"
          >
            Stop Round 1
          </button>
        </div>
      </header>

      {message && <p className="text-sm text-indigo-300">{message}</p>}

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
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            Add
          </button>
        </form>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Name</th>
              <th className="py-1">Access Code</th>
              <th className="py-1">Submitted?</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {participants?.map((p) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="py-1.5">{p.name}</td>
                <td className="py-1.5 font-mono text-xs">{p.accessCode}</td>
                <td className="py-1.5">{p.hasSubmittedRound1 ? "Yes" : "No"}</td>
                <td className="py-1.5">{p.disqualified ? "Disqualified" : "Active"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 font-semibold">Round 1 Scores &amp; Ranking</h2>
        <table className="w-full text-sm">
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
      </section>
    </main>
  );
}
