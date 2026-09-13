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
  if (participant.disqualified) {
    return NextResponse.json({ error: "Disqualified." }, { status: 403 });
  }

  const contest = participant.contest;
  const now = new Date();
  const withinWindow =
    contest.round1Active &&
    contest.round1StartAt &&
    contest.round1EndAt &&
    now >= contest.round1StartAt &&
    now <= contest.round1EndAt;

  if (!withinWindow) {
    return NextResponse.json({ error: "Round 1 is not currently active." }, { status: 403 });
  }

  if (participant.submissions.length > 0) {
    return NextResponse.json({ error: "You have already submitted Round 1." }, { status: 409 });
  }

  const questions = await prisma.question.findMany({
    where: { contestId: contest.id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      text: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      difficulty: true,
      order: true,
      // "correct" is intentionally never selected here.
    },
  });

  return NextResponse.json({
    questions,
    round1EndAt: contest.round1EndAt,
    serverTime: now.toISOString(),
  });
}
