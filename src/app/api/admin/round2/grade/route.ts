import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeRound2TotalScore } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
  const bugIdentification = Number(body?.bugIdentification);
  const correctnessOfFix = Number(body?.correctnessOfFix);

  if (!submissionId || Number.isNaN(bugIdentification) || Number.isNaN(correctnessOfFix)) {
    return NextResponse.json({ error: "submissionId, bugIdentification and correctnessOfFix are required." }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.round !== 2) {
    return NextResponse.json({ error: "Round 2 submission not found." }, { status: 404 });
  }

  const existing = (submission.criteriaScores as Record<string, number | null>) ?? {};
  const { criteria, totalScore } = computeRound2TotalScore({
    bugIdentification,
    correctnessOfFix,
    expectedOutput: Number(existing.expectedOutput ?? 0),
    timeEfficiency: Number(existing.timeEfficiency ?? 0),
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
