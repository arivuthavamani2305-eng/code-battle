import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: { round: 2, participant: { disqualified: false } },
    include: { participant: true },
    orderBy: { submittedAt: "asc" },
  });

  const rows = submissions
    .map((s) => ({
      submissionId: s.id,
      participantName: s.participant.name,
      accessCode: s.participant.accessCode,
      graded: s.graded,
      criteriaScores: s.criteriaScores,
      totalScore: s.totalScore,
      payload: s.payload,
      submittedAt: s.submittedAt,
    }))
    .sort((a, b) => {
      // Graded submissions ranked by score; ungraded ones surface first so
      // the admin notices what still needs marks entered.
      if (a.graded !== b.graded) return a.graded ? 1 : -1;
      return b.totalScore - a.totalScore;
    });

  return NextResponse.json({ rows });
}
