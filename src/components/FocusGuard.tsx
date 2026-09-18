"use client";

import { useEffect, useRef, useState } from "react";

export function FocusGuard({ active, onViolationSubmit }: { active: boolean; onViolationSubmit: () => Promise<void> }) {
  const [focused, setFocused] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const submitRef = useRef(onViolationSubmit);
  const submittedForExitRef = useRef(false);

  useEffect(() => {
    submitRef.current = onViolationSubmit;
  }, [onViolationSubmit]);

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
        fetch("/api/round1/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "FULLSCREEN_EXIT" }),
        }).catch(() => {});
        if (!submittedForExitRef.current) {
          submittedForExitRef.current = true;
          setAutoSubmitting(true);
          submitRef.current().catch(() => {
            setAutoSubmitting(false);
            submittedForExitRef.current = false;
          });
        }
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
          {interrupted ? "Fullscreen exited" : "Lock in before you start"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {interrupted
            ? autoSubmitting
              ? "Your submission is being recorded automatically because fullscreen was exited."
              : "Your submission could not be recorded. Return to fullscreen to continue."
            : "Stay on this screen during the round. Exiting fullscreen submits your current work automatically."}
        </p>
        {!autoSubmitting && (
          <button
            onClick={enterFocusMode}
            className="mt-7 w-full rounded-xl bg-lime-300 px-5 py-3 font-bold text-[#101214] transition hover:bg-lime-200"
          >
            {interrupted ? "Return to focus mode" : "Enter fullscreen & continue"}
          </button>
        )}
        <p className="mt-4 text-xs text-slate-600">Your browser may ask for fullscreen permission.</p>
      </div>
    </div>
  );
}
