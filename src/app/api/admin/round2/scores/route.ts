import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeRound2AutoScore } from "@/lib/scoring";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: { round: 2, participant: { disqualified: false } },
    include: { participant: { include: { contest: true } } },
    orderBy: { submittedAt: "asc" },
  });

  const contestIds = [...new Set(submissions.map((submission) => submission.participant.contestId))];
  const bugQuestions = await prisma.bugQuestion.findMany({
    where: { contestId: { in: contestIds } },
  });
  const questionsByContestId = new Map<string, typeof bugQuestions>();
  for (const question of bugQuestions) {
    const questions = questionsByContestId.get(question.contestId) ?? [];
    questions.push(question);
    questionsByContestId.set(question.contestId, questions);
  }

  const rows = (await Promise.all(submissions.map(async (s) => {
    const existing = (s.criteriaScores as Record<string, number | null> | null) ?? {};
    const contestQuestions = questionsByContestId.get(s.participant.contestId) ?? [];
    const payload = Array.isArray(s.payload) ? (s.payload as Array<{
      bugQuestionId?: string;
      fixedCode?: string;
      outputMatched?: boolean;
    }>) : [];
    const questionById = new Map(contestQuestions.map((question) => [question.id, question]));
    const results = payload.map((item) => {
      const question = item.bugQuestionId ? questionById.get(item.bugQuestionId) : undefined;
      return {
        outputMatched: item.outputMatched === true,
        codeChanged: !!question && (item.fixedCode ?? "").trim() !== question.buggyCode.trim(),
      };
    });
    const timeTakenSeconds = Math.max(0, (s.submittedAt.getTime() - (s.participant.contest.round2StartAt?.getTime() ?? s.submittedAt.getTime())) / 1000);
    const autoScore = computeRound2AutoScore({
      bugQuestionResults: results,
      timeTakenSeconds,
      durationSeconds: s.participant.contest.round2DurationSeconds,
    });
    const criteriaScores = { ...existing, ...autoScore };
    const totalScore = Number((autoScore.bugIdentification + autoScore.correctnessOfFix + autoScore.expectedOutput + autoScore.timeEfficiency).toFixed(2));
    await prisma.submission.update({
      where: { id: s.id },
      data: { criteriaScores, totalScore, graded: true, gradedAt: s.gradedAt ?? new Date() },
    });
    return {
      submissionId: s.id,
      participantName: s.participant.name,
      accessCode: s.participant.accessCode,
      graded: true,
      criteriaScores,
      totalScore,
      payload: s.payload,
      submittedAt: s.submittedAt,
    };
  })))
    .sort((a, b) => {
      if (a.graded !== b.graded) return a.graded ? 1 : -1;
      return b.totalScore - a.totalScore;
    });

  return NextResponse.json({ rows });
}
