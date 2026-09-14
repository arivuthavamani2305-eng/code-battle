"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContestRules } from "@/components/ContestRules";

export default function ParticipantLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);

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
    <main className="entry-shell">
      <div className="entry-grid" aria-hidden="true" />
      <div className="entry-scanline" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_430px] lg:px-12">
        <section className="entry-intro max-w-2xl">
          <div className="mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-lime-300">
            <span className="live-dot" /> Live arena access
          </div>
          <p className="mb-3 font-mono text-sm text-coral-300">COLLEGE SYMPOSIUM / 2026</p>
          <h1 className="entry-title">Think fast.<br /><span>Code fearless.</span></h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-300 md:text-lg">
            Three rounds. One access code. A room full of problems waiting to be cracked.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            <span className="entry-chip">01 / Unlock</span>
            <span className="entry-chip">02 / Debug</span>
            <span className="entry-chip">03 / Dominate</span>
          </div>

          <div className="entry-terminal mt-14 hidden max-w-md md:block" aria-hidden="true">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="terminal-dot bg-coral-300" /><span className="terminal-dot bg-amber-300" /><span className="terminal-dot bg-lime-300" />
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">arena_status.log</span>
            </div>
            <div className="space-y-2 px-4 py-4 font-mono text-xs leading-5">
              <p><span className="text-lime-300">$</span> boot contest_protocol</p>
              <p className="text-slate-500">&gt; waiting for your move<span className="cursor-block" /></p>
            </div>
          </div>
        </section>

        <section className="entry-card">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Participant portal</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Enter the arena</h2>
            </div>
            <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-lime-300">Ready?</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400" htmlFor="access-code">Access code</label>
              <input
                id="access-code"
                autoFocus
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="CB-0001"
                className="entry-input"
              />
            </div>

            <div className="entry-rule-box">
              <ContestRules compact />
              <label className="mt-4 flex items-start gap-3 border-t border-white/10 pt-4 text-xs leading-5 text-slate-300">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-lime-300"
                />
                <span>I have read the rules and agree to compete fairly.</span>
              </label>
            </div>

            {error && <p className="rounded-lg border border-coral-300/30 bg-coral-300/10 p-3 text-sm text-coral-200">{error}</p>}

            <button
              type="submit"
              disabled={loading || !accessCode || !rulesAccepted}
              className="entry-button"
            >
              <span>{loading ? "Checking access..." : "Enter contest"}</span>
              <span className="text-xl leading-none">↗</span>
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Organizer access? <a href="/admin" className="font-semibold text-slate-300 underline decoration-lime-300/50 underline-offset-4 hover:text-lime-300">Open admin portal</a>
          </p>
        </section>
      </div>
    </main>
  );
}
