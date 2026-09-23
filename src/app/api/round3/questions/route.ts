import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import type { ExternalTestCase } from "@/lib/judge";
import { assignCodingProblem } from "@/lib/round3-assignment";

export async function GET() {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    include: { contest: true, submissions: { where: { round: { in: [2, 3] } } } },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }
  if (participant.disqualified) {
    return NextResponse.json({ error: "Disqualified." }, { status: 403 });
  }

  const round2Submitted = participant.submissions.some((s) => s.round === 2);
  if (!round2Submitted) {
    return NextResponse.json({ error: "Complete Round 2 first." }, { status: 403 });
  }

  const contest = participant.contest;
  const now = new Date();
  const withinWindow =
    contest.round3Active &&
    contest.round3StartAt &&
    contest.round3EndAt &&
    now >= contest.round3StartAt &&
    now <= contest.round3EndAt;

  if (!withinWindow) {
    return NextResponse.json({ error: "Round 3 is not currently active." }, { status: 403 });
  }

  if (participant.submissions.some((s) => s.round === 3)) {
    return NextResponse.json({ error: "You have already submitted Round 3." }, { status: 409 });
  }

  const problems = await prisma.codingProblem.findMany({
    where: { contestId: contest.id },
    orderBy: { order: "asc" },
  });

  const assignedProblem = assignCodingProblem(problems, participant.id);
  if (!assignedProblem) {
    return NextResponse.json({ error: "No Round 3 problems configured." }, { status: 404 });
  }

  // Hidden test cases (stdin + expectedOutput) are stripped out entirely here -
  // they only get used server-side, at submit time, in the judge.
  const sanitized = [{
    id: assignedProblem.id,
    title: assignedProblem.title,
    statement: assignedProblem.statement,
    starterCode: assignedProblem.starterCode,
    order: assignedProblem.order,
    visibleTestCases: (assignedProblem.testCases as unknown as ExternalTestCase[]).filter((tc) => !tc.hidden),
  }];

  return NextResponse.json({
    problems: sanitized,
    round3EndAt: contest.round3EndAt,
    serverTime: now.toISOString(),
  });
}
