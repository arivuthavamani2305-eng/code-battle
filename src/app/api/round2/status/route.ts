import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

export async function GET() {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    select: {
      disqualified: true,
      contest: true,
      submissions: { where: { round: { in: [1, 2] } }, select: { round: true } },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  const contest = participant.contest;
  const now = new Date();

  const round1Submitted = participant.submissions.some((s) => s.round === 1);
  const hasSubmitted = participant.submissions.some((s) => s.round === 2);

  return NextResponse.json({
    serverTime: now.toISOString(),
    round2Active: contest.round2Active,
    round2StartAt: contest.round2StartAt,
    round2EndAt: contest.round2EndAt,
    round2DurationSeconds: contest.round2DurationSeconds,
    round1Submitted,
    hasSubmitted,
    disqualified: participant.disqualified,
  });
}
