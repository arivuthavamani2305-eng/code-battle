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

export async function runPythonScriptCapturingOutput(code: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RunResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs + 1000);
  const apiUrl = process.env.JUDGE0_API_URL ?? "https://ce.judge0.com";

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language_id: 71,
        source_code: code,
        cpu_time_limit: timeoutMs / 1000,
        wall_time_limit: timeoutMs / 1000,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null) as {
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      message?: string | null;
      status?: { id?: number; description?: string };
    } | null;
    const output = (payload?.stdout ?? "").replace(/\r\n/g, "\n").trim();
    const errorOutput = (payload?.compile_output ?? payload?.stderr ?? payload?.message ?? "").trim();
    const accepted = payload?.status?.id === 3;

    if (!response.ok) {
      return {
        ok: false,
        output,
        error: errorOutput || `Hosted judge request failed (${response.status}).`,
        timedOut: false,
        durationMs: Date.now() - start,
      };
    }

    return {
      ok: accepted,
      output,
      error: accepted ? null : (errorOutput || payload?.status?.description || "Python execution failed."),
      timedOut: payload?.status?.id === 5,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      output: "",
      error: timedOut ? "Time limit exceeded." : "Hosted Python judge is unavailable. Please try again.",
      timedOut,
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export type TestCase = { args: unknown[]; expectedOutput: unknown; hidden?: boolean };

export type ExternalTestCase = { stdin: string; expectedOutput: string; hidden?: boolean };

const JUDGE0_LANGUAGE_IDS = { python: 71, java: 62 } as const;

export async function runExternalCode(
  language: "python" | "java",
  code: string,
  stdin: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<RunResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs + 1000);
  const apiUrl = process.env.JUDGE0_API_URL ?? "https://ce.judge0.com";

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language_id: JUDGE0_LANGUAGE_IDS[language],
        source_code: code,
        stdin,
        cpu_time_limit: timeoutMs / 1000,
        wall_time_limit: timeoutMs / 1000,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as {
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      message?: string | null;
      status?: { id?: number; description?: string };
    } | null;
    const output = (payload?.stdout ?? "").replace(/\r\n/g, "\n").trim();
    const errorOutput = (payload?.compile_output ?? payload?.stderr ?? payload?.message ?? "").trim();
    const accepted = payload?.status?.id === 3;

    return {
      ok: response.ok && accepted,
      output,
      error: response.ok && accepted ? null : errorOutput || payload?.status?.description || `Hosted judge request failed (${response.status}).`,
      timedOut: payload?.status?.id === 5,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      output: "",
      error: timedOut ? "Time limit exceeded." : "Hosted code judge is unavailable. Please try again.",
      timedOut,
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timeout);
  }
}

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
