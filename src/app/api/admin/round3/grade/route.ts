import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeRound3TotalScore } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
  const problemUnderstanding = Number(body?.problemUnderstanding);
  const logicAlgorithm = Number(body?.logicAlgorithm);
  const codeQuality = Number(body?.codeQuality);
  const timeSpaceOptimization = Number(body?.timeSpaceOptimization);

  if (
    !submissionId ||
    [problemUnderstanding, logicAlgorithm, codeQuality, timeSpaceOptimization].some((n) => Number.isNaN(n))
  ) {
    return NextResponse.json(
      { error: "submissionId, problemUnderstanding, logicAlgorithm, codeQuality and timeSpaceOptimization are required." },
      { status: 400 }
    );
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.round !== 3) {
    return NextResponse.json({ error: "Round 3 submission not found." }, { status: 404 });
  }

  const existing = (submission.criteriaScores as Record<string, number | null>) ?? {};
  const { criteria, totalScore } = computeRound3TotalScore({
    problemUnderstanding,
    logicAlgorithm,
    correctnessTestCases: Number(existing.correctnessTestCases ?? 0),
    codeQuality,
    timeSpaceOptimization,
  });

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      criteriaScores: criteria,
      totalScore,
      graded: true,
      gradedAt: new Date(),
    },
  });

  return NextResponse.json({ totalScore: updated.totalScore, criteriaScores: updated.criteriaScores });
}
