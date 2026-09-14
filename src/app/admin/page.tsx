"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell flex min-h-screen items-center justify-center px-5 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-5 flex items-center justify-between px-1">
          <span className="admin-mark">Control room</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">CB / 2026</span>
        </div>
        <div className="admin-card">
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Organizer portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Command the arena.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Start rounds, review submissions, and keep the competition moving.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400" htmlFor="admin-password">Secure passphrase</label>
              <input
                id="admin-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="entry-input"
              />
            </div>
            {error && <p className="rounded-lg border border-coral-300/30 bg-coral-300/10 p-3 text-sm text-coral-200">{error}</p>}
            <button type="submit" disabled={loading || !password} className="admin-button">
              <span>{loading ? "Authenticating..." : "Open control room"}</span>
              <span className="text-xl leading-none">↗</span>
            </button>
          </form>
          <p className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-slate-500">
            Participant? <a href="/" className="font-semibold text-slate-300 underline decoration-sky-300/50 underline-offset-4 hover:text-sky-300">Return to entry</a>
          </p>
        </div>
      </div>
    </main>
  );
}
