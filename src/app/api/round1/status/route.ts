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
    include: { contest: true, submissions: { where: { round: 1 } } },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  const contest = participant.contest;
  const now = new Date();

  const hasSubmitted = participant.submissions.length > 0;

  return NextResponse.json({
    serverTime: now.toISOString(),
    round1Active: contest.round1Active,
    round1StartAt: contest.round1StartAt,
    round1EndAt: contest.round1EndAt,
    round1DurationSeconds: contest.round1DurationSeconds,
    hasSubmitted,
    disqualified: participant.disqualified,
  });
}
