import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { shuffleForParticipant } from "@/lib/round3-assignment";

export async function GET() {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    include: {
      contest: true,
      submissions: { where: { round: { in: [1, 2] } } },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }
  if (participant.disqualified) {
    return NextResponse.json({ error: "Disqualified." }, { status: 403 });
  }

  const round1Submitted = participant.submissions.some((s) => s.round === 1);
  if (!round1Submitted) {
    return NextResponse.json({ error: "Complete Round 1 first." }, { status: 403 });
  }

  const contest = participant.contest;
  const now = new Date();
  const withinWindow =
    contest.round2Active &&
    contest.round2StartAt &&
    contest.round2EndAt &&
    now >= contest.round2StartAt &&
    now <= contest.round2EndAt;

  if (!withinWindow) {
    return NextResponse.json({ error: "Round 2 is not currently active." }, { status: 403 });
  }

  if (participant.submissions.some((s) => s.round === 2)) {
    return NextResponse.json({ error: "You have already submitted Round 2." }, { status: 409 });
  }

  const bugQuestions = await prisma.bugQuestion.findMany({
    where: { contestId: contest.id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      language: true,
      buggyCode: true,
      hint: true,
      order: true,
      // expectedOutput is intentionally never selected here.
    },
  });

  return NextResponse.json({
    bugQuestions: shuffleForParticipant(bugQuestions, participant.id),
    round2EndAt: contest.round2EndAt,
    serverTime: now.toISOString(),
  });
}
