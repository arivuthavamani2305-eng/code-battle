import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { runExternalCode, type ExternalTestCase } from "@/lib/judge";
import { assignCodingProblem } from "@/lib/round3-assignment";

export async function POST(req: NextRequest) {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const problemId = typeof body?.problemId === "string" ? body.problemId : "";
  const code = typeof body?.code === "string" ? body.code.slice(0, 20000) : "";
  const language = body?.language === "java" ? "java" : body?.language === "python" ? "python" : "";

  if (!problemId || !code.trim() || !language) {
    return NextResponse.json({ error: "Missing problemId, language, or code." }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      disqualified: true,
      contest: true,
      submissions: { where: { round: 3 }, select: { round: true } },
    },
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

  const problems = await prisma.codingProblem.findMany({ where: { contestId: contest.id } });
  const problem = assignCodingProblem(problems, participant.id);
  if (!problem || problem.id !== problemId) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  const visibleTestCases = (problem.testCases as unknown as ExternalTestCase[]).filter((tc) => !tc.hidden);
  const results = [];
  let passedCount = 0;
  for (const testCase of visibleTestCases) {
    const result = await runExternalCode(language, code, testCase.stdin);
    const passed = result.ok && result.output === testCase.expectedOutput.trim();
    if (passed) passedCount++;
    results.push({ hidden: false, passed, error: result.error, timedOut: result.timedOut, actualOutput: result.output });
  }

  return NextResponse.json({
    results,
    passedCount,
    totalCount: visibleTestCases.length,
  });
}
