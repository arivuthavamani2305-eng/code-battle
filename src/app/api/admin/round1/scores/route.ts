import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: { round: 1 },
    include: { participant: true },
    orderBy: { totalScore: "desc" },
  });

  const rows = submissions.map((s, index) => ({
    rank: index + 1,
    participantName: s.participant.name,
    accessCode: s.participant.accessCode,
    correctnessScore: s.correctnessScore,
    timeScore: s.timeScore,
    totalScore: s.totalScore,
    submittedAt: s.submittedAt,
  }));

  return NextResponse.json({ rows });
}
