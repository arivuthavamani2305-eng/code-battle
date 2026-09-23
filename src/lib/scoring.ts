// Round 1 scoring: 15 marks correctness + 5 marks time efficiency = 20 total.
// Kept in one place so the weighting can change without touching route handlers.

export function computeRound1Score(params: {
  correctCount: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  durationSeconds: number;
}) {
  const { correctCount, totalQuestions, timeTakenSeconds, durationSeconds } = params;

  const correctnessScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 15 : 0;

  const remainingFraction = Math.max(
    0,
    Math.min(1, (durationSeconds - timeTakenSeconds) / durationSeconds)
  );
  const timeScore = correctCount > 0 ? remainingFraction * 5 : 0;

  const totalScore = correctnessScore + timeScore;

  return {
    correctnessScore: Number(correctnessScore.toFixed(2)),
    timeScore: Number(timeScore.toFixed(2)),
    totalScore: Number(totalScore.toFixed(2)),
  };
}

// Shared helper: fraction of the round's time remaining at submission,
// scaled to `maxMarks`. Same "server clock is the only source of truth"
// approach as Round 1.
function timeEfficiencyScore(timeTakenSeconds: number, durationSeconds: number, maxMarks: number) {
  const remainingFraction = Math.max(
    0,
    Math.min(1, (durationSeconds - timeTakenSeconds) / durationSeconds)
  );
  return Number((remainingFraction * maxMarks).toFixed(2));
}

// ---------------------------------------------------------------------------
// ROUND 2 - BUG WARFARE (max 30)
//   Bug Fix Quality            10  (auto - code changed in a meaningful way)
//   Correctness of Fix        10  (auto - fixed output matches expected output)
//   Expected Output             5  (auto - fixed code's output matches exactly)
//   Time Efficiency             5  (auto - same time-remaining formula as Round 1)
// ---------------------------------------------------------------------------

export const ROUND2_MAX_MARKS = {
  bugIdentification: 10,
  correctnessOfFix: 10,
  expectedOutput: 5,
  timeEfficiency: 5,
} as const;

// Called once at submit time. Both formerly manual pieces are derived from
// objective submission signals so every Round 2 submission is graded immediately.
export function computeRound2AutoScore(params: {
  bugQuestionResults: { outputMatched: boolean; codeChanged: boolean }[];
  timeTakenSeconds: number;
  durationSeconds: number;
}) {
  const { bugQuestionResults, timeTakenSeconds, durationSeconds } = params;

  const matchedCount = bugQuestionResults.filter((r) => r.outputMatched).length;
  const changedCount = bugQuestionResults.filter((r) => r.codeChanged).length;
  const totalCount = bugQuestionResults.length;
  const bugIdentification = totalCount > 0
    ? Number(((changedCount / totalCount) * ROUND2_MAX_MARKS.bugIdentification).toFixed(2))
    : 0;
  const correctnessOfFix = totalCount > 0
    ? Number(((matchedCount / totalCount) * ROUND2_MAX_MARKS.correctnessOfFix).toFixed(2))
    : 0;
  const expectedOutput =
    totalCount > 0
      ? Number(((matchedCount / totalCount) * ROUND2_MAX_MARKS.expectedOutput).toFixed(2))
      : 0;

  const timeEfficiency =
    matchedCount > 0
      ? timeEfficiencyScore(timeTakenSeconds, durationSeconds, ROUND2_MAX_MARKS.timeEfficiency)
      : 0;

  return { bugIdentification, correctnessOfFix, expectedOutput, timeEfficiency };
}

// Called by the admin grading endpoint once manual marks are entered.
// Clamps every value to its rubric max so a typo can't blow the round total.
export function computeRound2TotalScore(criteria: {
  bugIdentification: number;
  correctnessOfFix: number;
  expectedOutput: number;
  timeEfficiency: number;
}) {
  const clamped = {
    bugIdentification: clamp(criteria.bugIdentification, 0, ROUND2_MAX_MARKS.bugIdentification),
    correctnessOfFix: clamp(criteria.correctnessOfFix, 0, ROUND2_MAX_MARKS.correctnessOfFix),
    expectedOutput: clamp(criteria.expectedOutput, 0, ROUND2_MAX_MARKS.expectedOutput),
    timeEfficiency: criteria.expectedOutput > 0
      ? clamp(criteria.timeEfficiency, 0, ROUND2_MAX_MARKS.timeEfficiency)
      : 0,
  };
  const totalScore = Number(
    (
      clamped.bugIdentification +
      clamped.correctnessOfFix +
      clamped.expectedOutput +
      clamped.timeEfficiency
    ).toFixed(2)
  );
  return { criteria: clamped, totalScore };
}

// ---------------------------------------------------------------------------
// ROUND 3 - CODE WAR (max 50)
//   Problem Understanding      5  (auto - executable solution submitted)
//   Logic & Algorithm         15  (auto - test pass ratio)
//   Correctness & Test Cases  15  (auto - fraction of test cases passed)
//   Code Quality                5  (auto - executable solution)
//   Time & Space Optimization 10  (auto - measured runtime)
// ---------------------------------------------------------------------------

export const ROUND3_MAX_MARKS = {
  problemUnderstanding: 5,
  logicAlgorithm: 15,
  correctnessTestCases: 15,
  codeQuality: 5,
  timeSpaceOptimization: 10,
} as const;

export function computeRound3AutoScore(params: {
  passedCount: number;
  totalCount: number;
  code: string;
  totalDurationMs: number;
}) {
  const { passedCount, totalCount, code, totalDurationMs } = params;
  const correctnessTestCases =
    totalCount > 0
      ? Number(((passedCount / totalCount) * ROUND3_MAX_MARKS.correctnessTestCases).toFixed(2))
      : 0;
  const hasExecutableSubmission = code.trim().length > 0;
  const problemUnderstanding = hasExecutableSubmission ? ROUND3_MAX_MARKS.problemUnderstanding : 0;
  const logicAlgorithm = correctnessTestCases;
  const codeQuality = hasExecutableSubmission && totalCount > 0 ? ROUND3_MAX_MARKS.codeQuality : 0;
  const averageDurationMs = totalCount > 0 ? totalDurationMs / totalCount : 3000;
  const timeSpaceOptimization = passedCount > 0
    ? Number((Math.max(0, Math.min(1, 1 - averageDurationMs / 3000)) * ROUND3_MAX_MARKS.timeSpaceOptimization).toFixed(2))
    : 0;

  return { problemUnderstanding, logicAlgorithm, correctnessTestCases, codeQuality, timeSpaceOptimization };
}

export function computeRound3TotalScore(criteria: {
  problemUnderstanding: number;
  logicAlgorithm: number;
  correctnessTestCases: number;
  codeQuality: number;
  timeSpaceOptimization: number;
}) {
  const clamped = {
    problemUnderstanding: clamp(criteria.problemUnderstanding, 0, ROUND3_MAX_MARKS.problemUnderstanding),
    logicAlgorithm: clamp(criteria.logicAlgorithm, 0, ROUND3_MAX_MARKS.logicAlgorithm),
    correctnessTestCases: clamp(criteria.correctnessTestCases, 0, ROUND3_MAX_MARKS.correctnessTestCases),
    codeQuality: clamp(criteria.codeQuality, 0, ROUND3_MAX_MARKS.codeQuality),
    timeSpaceOptimization: criteria.correctnessTestCases > 0
      ? clamp(criteria.timeSpaceOptimization, 0, ROUND3_MAX_MARKS.timeSpaceOptimization)
      : 0,
  };
  const totalScore = Number(
    (
      clamped.problemUnderstanding +
      clamped.logicAlgorithm +
      clamped.correctnessTestCases +
      clamped.codeQuality +
      clamped.timeSpaceOptimization
    ).toFixed(2)
  );
  return { criteria: clamped, totalScore };
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}
