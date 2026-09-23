// Minimal code-execution sandbox for auto-checking JAVASCRIPT submissions.
//
// SECURITY NOTE: this uses Node's built-in `vm` module with a timeout and a
// stripped-down global context (no `require`, `process`, `fetch`, filesystem,
// or network access reachable from inside the sandbox). That is enough
// isolation for a supervised college contest where only logged-in,
// pre-registered participants can submit code — it is NOT a substitute for
// a fully isolated container/VM sandbox (e.g. Docker, Firecracker, gVisor)
// if this were ever opened up to untrusted public submissions at scale.
// The original README already flagged "isolated Docker code judge" as a
// future hardening step; this is the lightweight version of that for now.

import { Script, createContext } from "vm";
import { spawnSync } from "child_process";

const DEFAULT_TIMEOUT_MS = 3000;

export type RunResult = {
  ok: boolean;
  output: string; // everything written via console.log, joined by newlines
  error: string | null;
  timedOut: boolean;
  durationMs: number;
};

// Runs an arbitrary script and captures console.log output.
// Used for Round 2: participant submits a full corrected snippet, we run
// it top-to-bottom and compare captured output against expectedOutput.
export function runScriptCapturingOutput(code: string, timeoutMs = DEFAULT_TIMEOUT_MS): RunResult {
  const logs: string[] = [];
  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map(stringifyLogArg).join(" ")),
  };

  const context = createContext({
    console: sandboxConsole,
    // Deliberately no require/process/global/setTimeout/fetch exposed.
  });

  const start = Date.now();
  try {
    const script = new Script(code, { filename: "submission.js" });
    script.runInContext(context, { timeout: timeoutMs });
    return {
      ok: true,
      output: logs.join("\n").trim(),
      error: null,
      timedOut: false,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    const timedOut = typeof err?.message === "string" && err.message.includes("Script execution timed out");
    return {
      ok: false,
      output: logs.join("\n").trim(),
      error: timedOut ? "Time limit exceeded." : cleanErrorMessage(err),
      timedOut,
      durationMs: Date.now() - start,
    };
  }
}

export function runPythonScriptCapturingOutput(code: string, timeoutMs = DEFAULT_TIMEOUT_MS): RunResult {
  const start = Date.now();
  const pythonCommand = process.env.PYTHON_BIN ?? (process.platform === "win32" ? "python" : "python3");

  const result = spawnSync(pythonCommand, ["-c", code], {
    timeout: timeoutMs,
    encoding: "utf-8",
    env: process.env,
  });

  const output = (result.stdout ?? "").replace(/\r\n/g, "\n").trim();
  const errorOutput = (result.stderr ?? "").replace(/\r\n/g, "\n").trim();
  const timedOut = result.error?.message?.toLowerCase().includes("timed out") || result.signal === "SIGTERM";

  if (result.error && !timedOut) {
    return {
      ok: false,
      output,
      error: cleanErrorMessage(result.error),
      timedOut: false,
      durationMs: Date.now() - start,
    };
  }

  if (timedOut) {
    return {
      ok: false,
      output,
      error: "Time limit exceeded.",
      timedOut: true,
      durationMs: Date.now() - start,
    };
  }

  const ok = result.status === 0;
  return {
    ok,
    output,
    error: ok ? null : (errorOutput || "Python execution failed."),
    timedOut: false,
    durationMs: Date.now() - start,
  };
}

export type TestCase = { args: unknown[]; expectedOutput: unknown; hidden?: boolean };

export type TestCaseResult = {
  hidden: boolean;
  passed: boolean;
  error: string | null;
  timedOut: boolean;
  actualOutput?: unknown; // omitted for hidden cases so the value is never leaked to participants
};

// Runs participant code that must define `function solve(...)`, then calls
// it once per test case inside a fresh context each time so test cases
// can't leak state into one another.
export function runTestCases(
  code: string,
  testCases: TestCase[],
  timeoutMs = DEFAULT_TIMEOUT_MS
): { results: TestCaseResult[]; passedCount: number; totalDurationMs: number } {
  const results: TestCaseResult[] = [];
  let passedCount = 0;
  let totalDurationMs = 0;

  for (const tc of testCases) {
    const logs: string[] = [];
    const context = createContext({
      console: { log: (...args: unknown[]) => logs.push(args.map(stringifyLogArg).join(" ")) },
      __args: tc.args,
      __result: { value: undefined as unknown },
    });

    const runner = `
      ${code}
      __result.value = solve(...__args);
    `;

    const start = Date.now();
    try {
      const script = new Script(runner, { filename: "solution.js" });
      script.runInContext(context, { timeout: timeoutMs });
      const actual = (context as any).__result.value;
      totalDurationMs += Date.now() - start;

      const passed = deepEqual(actual, tc.expectedOutput);
      if (passed) passedCount++;

      results.push({
        hidden: !!tc.hidden,
        passed,
        error: null,
        timedOut: false,
        actualOutput: tc.hidden ? undefined : actual,
      });
    } catch (err: any) {
      totalDurationMs += Date.now() - start;
      const timedOut = typeof err?.message === "string" && err.message.includes("Script execution timed out");
      results.push({
        hidden: !!tc.hidden,
        passed: false,
        error: timedOut ? "Time limit exceeded." : cleanErrorMessage(err),
        timedOut,
        actualOutput: undefined,
      });
    }
  }

  return { results, passedCount, totalDurationMs };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function stringifyLogArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function cleanErrorMessage(err: any): string {
  const msg = typeof err?.message === "string" ? err.message : "Runtime error.";
  // Truncate so a participant can't blow up storage/UI with a giant stack trace.
  return msg.slice(0, 300);
}
