"use client";

import { useEffect, useState } from "react";

export function FocusGuard({ active }: { active: boolean }) {
  const [focused, setFocused] = useState(false);
  const [interrupted, setInterrupted] = useState(false);

  useEffect(() => {
    if (!active) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        setInterrupted(true);
      }
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && focused) {
        setFocused(false);
        setInterrupted(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [active, focused]);

  if (!active || focused && !interrupted) return null;

  async function enterFocusMode() {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Fullscreen can be unavailable in embedded or restricted browsers.
    }
    setFocused(true);
    setInterrupted(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101214]/[.98] px-5 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-lime-300/30 bg-lime-300/10 text-3xl text-lime-300">
          ⛶
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-lime-300">Focus mode required</p>
        <h2 className="mt-3 text-2xl font-bold text-white">
          {interrupted ? "You left the arena" : "Lock in before you start"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Stay on this screen during the round. Switching tabs and exiting fullscreen are recorded for organizer review.
        </p>
        <button
          onClick={enterFocusMode}
          className="mt-7 w-full rounded-xl bg-lime-300 px-5 py-3 font-bold text-[#101214] transition hover:bg-lime-200"
        >
          {interrupted ? "Return to focus mode" : "Enter fullscreen & continue"}
        </button>
        <p className="mt-4 text-xs text-slate-600">Your browser may ask for fullscreen permission.</p>
      </div>
    </div>
  );
}
