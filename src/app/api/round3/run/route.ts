import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { runTestCases, type TestCase } from "@/lib/judge";

export async function POST(req: NextRequest) {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const problemId = typeof body?.problemId === "string" ? body.problemId : "";
  const code = typeof body?.code === "string" ? body.code.slice(0, 20000) : "";

  if (!problemId || !code.trim()) {
    return NextResponse.json({ error: "Missing problemId or code." }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    include: { contest: true, submissions: { where: { round: 3 } } },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }
  if (participant.disqualified) {
    return NextResponse.json({ error: "Disqualified." }, { status: 403 });
  }
  if (participant.submissions.length > 0) {
    return NextResponse.json({ error: "You have already submitted Round 3." }, { status: 409 });
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

  const problem = await prisma.codingProblem.findUnique({ where: { id: problemId } });
  if (!problem || problem.contestId !== contest.id) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  const visibleTestCases = (problem.testCases as unknown as TestCase[]).filter((tc) => !tc.hidden);
  const { results, passedCount } = runTestCases(code, visibleTestCases);

  return NextResponse.json({
    results,
    passedCount,
    totalCount: visibleTestCases.length,
  });
}
