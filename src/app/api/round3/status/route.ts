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
      submissions: { where: { round: { in: [2, 3] } }, select: { round: true } },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  const contest = participant.contest;
  const now = new Date();

  const round2Submitted = participant.submissions.some((s) => s.round === 2);
  const hasSubmitted = participant.submissions.some((s) => s.round === 3);

  return NextResponse.json({
    serverTime: now.toISOString(),
    round3Active: contest.round3Active,
    round3StartAt: contest.round3StartAt,
    round3EndAt: contest.round3EndAt,
    round3DurationSeconds: contest.round3DurationSeconds,
    round2Submitted,
    hasSubmitted,
    disqualified: participant.disqualified,
  });
}
