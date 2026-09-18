import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeRound3AutoScore } from "@/lib/scoring";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: { round: 3, participant: { disqualified: false } },
    include: { participant: { include: { contest: true } } },
    orderBy: { submittedAt: "asc" },
  });

  const rows = (await Promise.all(submissions.map(async (s) => {
    const existing = (s.criteriaScores as Record<string, number | null> | null) ?? {};
    if (existing.problemUnderstanding !== null && existing.problemUnderstanding !== undefined &&
        existing.logicAlgorithm !== null && existing.logicAlgorithm !== undefined &&
        existing.codeQuality !== null && existing.codeQuality !== undefined &&
        existing.timeSpaceOptimization !== null && existing.timeSpaceOptimization !== undefined) {
      return {
      submissionId: s.id,
      participantName: s.participant.name,
      accessCode: s.participant.accessCode,
      graded: s.graded,
      criteriaScores: s.criteriaScores,
      totalScore: s.totalScore,
      payload: s.payload,
      submittedAt: s.submittedAt,
      };
    }

    const payload = Array.isArray(s.payload) ? (s.payload as Array<{
      code?: string;
      passedCount?: number;
      totalCount?: number;
      totalDurationMs?: number;
    }>) : [];
    const passedCount = payload.reduce((sum, item) => sum + Number(item.passedCount ?? 0), 0);
    const totalCount = payload.reduce((sum, item) => sum + Number(item.totalCount ?? 0), 0);
    const totalDurationMs = payload.reduce((sum, item) => sum + Number(item.totalDurationMs ?? 0), 0);
    const code = payload[0]?.code ?? "";
    const criteriaScores = {
      ...existing,
      ...computeRound3AutoScore({ passedCount, totalCount, code, totalDurationMs }),
    };
    const totalScore = Number(Object.values(criteriaScores).reduce((sum, score) => sum + Number(score ?? 0), 0).toFixed(2));
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
