import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { computeRound3AutoScore } from "@/lib/scoring";
import { runTestCases, type TestCase } from "@/lib/judge";

type IncomingSolution = { problemId: string; code: string };

export async function POST(req: NextRequest) {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const rawSolutions = Array.isArray(body?.solutions) ? (body.solutions as IncomingSolution[]) : null;
  if (!rawSolutions) {
    return NextResponse.json({ error: "Malformed submission." }, { status: 400 });
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
    return NextResponse.json(
      { error: "Round 3 submission window is closed. Submission rejected." },
      { status: 403 }
    );
  }

  if (participant.submissions.some((s) => s.round === 3)) {
    return NextResponse.json({ error: "A submission already exists for Round 3." }, { status: 409 });
  }

  const problems = await prisma.codingProblem.findMany({ where: { contestId: contest.id } });
  const problemById = new Map(problems.map((p) => [p.id, p]));

  const cleanedSolutions = new Map<string, string>();
  for (const s of rawSolutions) {
    if (typeof s?.problemId === "string" && problemById.has(s.problemId) && typeof s?.code === "string") {
      cleanedSolutions.set(s.problemId, s.code.slice(0, 20000));
    }
  }

  let totalPassed = 0;
  let totalCases = 0;

  const payloadItems = problems.map((p) => {
    const code = cleanedSolutions.get(p.id) ?? "";
    const testCases = p.testCases as unknown as TestCase[];

    if (!code.trim()) {
      totalCases += testCases.length;
      return {
        problemId: p.id,
        title: p.title,
        code,
        results: testCases.map((tc) => ({ hidden: !!tc.hidden, passed: false, error: "No code submitted.", timedOut: false })),
        passedCount: 0,
        totalCount: testCases.length,
      };
    }

    const { results, passedCount } = runTestCases(code, testCases);
    totalPassed += passedCount;
    totalCases += testCases.length;

    return {
      problemId: p.id,
      title: p.title,
      code,
      results,
      passedCount,
      totalCount: testCases.length,
    };
  });

  const { correctnessTestCases } = computeRound3AutoScore({
    passedCount: totalPassed,
    totalCount: totalCases,
  });

  const criteriaScores = {
    problemUnderstanding: null, // pending admin grading
    logicAlgorithm: null, // pending admin grading
    correctnessTestCases,
    codeQuality: null, // pending admin grading
    timeSpaceOptimization: null, // pending admin grading
  };

  try {
    await prisma.submission.create({
      data: {
        participantId: participant.id,
        round: 3,
        totalScore: 0, // finalized once the admin grades the manual criteria
        payload: payloadItems as Prisma.InputJsonValue,
        criteriaScores,
        graded: false,
      },
    });

    await prisma.auditEvent.create({
      data: { participantId: participant.id, type: "SUBMISSION", detail: "round3" },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A submission already exists for Round 3." }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, message: "Round 3 submitted successfully." });
}
