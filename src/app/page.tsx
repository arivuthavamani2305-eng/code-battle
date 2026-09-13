"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ParticipantLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/contest");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Code Battle</h1>
          <p className="text-slate-400 text-sm">Enter your access code to begin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Access Code</label>
            <input
              autoFocus
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="CB-0001"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !accessCode}
            className="w-full rounded-lg bg-indigo-600 py-2 font-medium transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Enter Contest"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Are you an admin? <a href="/admin" className="underline hover:text-slate-300">Go to admin login</a>
        </p>
      </div>
    </main>
  );
}
