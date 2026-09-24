import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { computeRound3AutoScore } from "@/lib/scoring";
import { runExternalCode, type ExternalTestCase } from "@/lib/judge";
import { assignCodingProblem } from "@/lib/round3-assignment";

type IncomingSolution = { problemId: string; language: "python" | "java"; code: string };

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
    select: {
      id: true,
      disqualified: true,
      contest: true,
      submissions: { where: { round: { in: [2, 3] } }, select: { round: true } },
    },
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
  const assignedProblem = assignCodingProblem(problems, participant.id);
  if (!assignedProblem) {
    return NextResponse.json({ error: "No Round 3 problems configured." }, { status: 404 });
  }
  const problemById = new Map([[assignedProblem.id, assignedProblem]]);

  const cleanedSolutions = new Map<string, string>();
  for (const s of rawSolutions) {
    if (
      typeof s?.problemId === "string" &&
      problemById.has(s.problemId) &&
      (s.language === "python" || s.language === "java") &&
      typeof s?.code === "string"
    ) {
      cleanedSolutions.set(s.problemId, JSON.stringify({ language: s.language, code: s.code.slice(0, 20000) }));
    }
  }

  let totalPassed = 0;
  let totalCases = 0;

  const payloadItems = await Promise.all([assignedProblem].map(async (p) => {
    const submitted = cleanedSolutions.get(p.id);
    const parsed = submitted ? JSON.parse(submitted) as { language: "python" | "java"; code: string } : null;
    const language = parsed?.language ?? "python";
    const code = parsed?.code ?? "";
    const testCases = p.testCases as unknown as ExternalTestCase[];

    if (!code.trim()) {
      totalCases += testCases.length;
      return {
        problemId: p.id,
        title: p.title,
        language,
        code,
        results: testCases.map((tc) => ({ hidden: !!tc.hidden, passed: false, error: "No code submitted.", timedOut: false })),
        passedCount: 0,
        totalCount: testCases.length,
        totalDurationMs: 0,
      };
    }

    const results = [];
    let passedCount = 0;
    let totalDurationMs = 0;
    for (const testCase of testCases) {
      const result = await runExternalCode(language, code, testCase.stdin);
      const passed = result.ok && result.output === testCase.expectedOutput.trim();
      if (passed) passedCount++;
      totalDurationMs += result.durationMs;
      results.push({ hidden: !!testCase.hidden, passed, error: result.error, timedOut: result.timedOut });
    }
    totalPassed += passedCount;
    totalCases += testCases.length;

    return {
      problemId: p.id,
      title: p.title,
      language,
      code,
      results,
      passedCount,
      totalCount: testCases.length,
      totalDurationMs,
    };
  }));

  const criteriaScores = computeRound3AutoScore({
    passedCount: totalPassed,
    totalCount: totalCases,
    code: payloadItems[0]?.code ?? "",
    totalDurationMs: payloadItems[0]?.totalDurationMs ?? 0,
  });

  try {
    await prisma.submission.create({
      data: {
        participantId: participant.id,
        round: 3,
        totalScore: Number(Object.values(criteriaScores).reduce((sum, score) => sum + score, 0).toFixed(2)),
        payload: payloadItems as Prisma.InputJsonValue,
        criteriaScores,
        graded: true,
        gradedAt: now,
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
