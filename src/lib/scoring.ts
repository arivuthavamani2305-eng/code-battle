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
  const timeScore = remainingFraction * 5;

  const totalScore = correctnessScore + timeScore;

  return {
    correctnessScore: Number(correctnessScore.toFixed(2)),
    timeScore: Number(timeScore.toFixed(2)),
    totalScore: Number(totalScore.toFixed(2)),
  };
}
