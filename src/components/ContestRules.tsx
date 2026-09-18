export const CONTEST_RULES = [
  "Copying or attempting to copy code or content is prohibited.",
  "Unauthorized use of external websites, search engines, or resources is prohibited.",
  "Repeated unauthorized tab switching may result in a penalty or disqualification.",
  "Fullscreen is required during each round. Exiting fullscreen, including by pressing Esc, records a violation and automatically submits your current work.",
  "Communication or collaboration between teams during the round is prohibited.",
  "Any attempt to bypass the contest's monitoring or security mechanisms may result in immediate disqualification.",
  "The organizer's decision regarding violations and scoring will be final.",
];

export function ContestRules({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "space-y-2" : "space-y-3 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4"}>
      <div>
        <h2 className="font-semibold text-amber-200">Penalty & Disqualification Rules</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-300">
          {CONTEST_RULES.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
      </div>
      {!compact && (
        <p className="text-xs text-slate-400">
          Browser controls may detect and restrict tab switching, copy/paste, and external-resource access, but they cannot guarantee complete prevention. Participants remain responsible for following the rules.
        </p>
      )}
    </section>
  );
}
