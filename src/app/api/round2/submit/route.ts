import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { computeRound2AutoScore } from "@/lib/scoring";
import { runScriptCapturingOutput } from "@/lib/judge";

type IncomingFix = { bugQuestionId: string; fixedCode: string; bugExplanation?: string };

export async function POST(req: NextRequest) {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const rawFixes = Array.isArray(body?.fixes) ? (body.fixes as IncomingFix[]) : null;
  if (!rawFixes) {
    return NextResponse.json({ error: "Malformed submission." }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    include: { contest: true, submissions: { where: { round: { in: [1, 2] } } } },
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
    return NextResponse.json(
      { error: "Round 2 submission window is closed. Submission rejected." },
      { status: 403 }
    );
  }

  if (participant.submissions.some((s) => s.round === 2)) {
    return NextResponse.json({ error: "A submission already exists for Round 2." }, { status: 409 });
  }

  const bugQuestions = await prisma.bugQuestion.findMany({ where: { contestId: contest.id } });
  const questionById = new Map(bugQuestions.map((q) => [q.id, q]));

  const cleanedFixes = new Map<string, { fixedCode: string; bugExplanation: string }>();
  for (const f of rawFixes) {
    if (typeof f?.bugQuestionId === "string" && questionById.has(f.bugQuestionId) && typeof f?.fixedCode === "string") {
      cleanedFixes.set(f.bugQuestionId, {
        fixedCode: f.fixedCode.slice(0, 20000), // guard against absurdly large payloads
        bugExplanation: typeof f.bugExplanation === "string" ? f.bugExplanation.slice(0, 2000) : "",
      });
    }
  }

  // Run each JS fix through the sandbox and compare its output to the
  // expected output. Non-JS snippets (or code that doesn't run) simply
  // don't get auto credit here - the admin's manual "Correctness of Fix"
  // mark is what covers those.
  const payloadItems = bugQuestions.map((q) => {
    const fix = cleanedFixes.get(q.id);
    const fixedCode = fix?.fixedCode ?? "";
    const bugExplanation = fix?.bugExplanation ?? "";

    let actualOutput: string | null = null;
    let outputMatched = false;
    let runError: string | null = null;

    if (fixedCode.trim() && q.language === "javascript") {
      const result = runScriptCapturingOutput(fixedCode);
      actualOutput = result.output;
      runError = result.error;
      outputMatched = result.ok && result.output.trim() === q.expectedOutput.trim();
    }

    return {
      bugQuestionId: q.id,
      title: q.title,
      fixedCode,
      bugExplanation,
      actualOutput,
      runError,
      outputMatched,
    };
  });

  const timeTakenSeconds = Math.max(0, (now.getTime() - contest.round2StartAt!.getTime()) / 1000);

  const { expectedOutput, timeEfficiency } = computeRound2AutoScore({
    bugQuestionResults: payloadItems.map((p) => ({ outputMatched: p.outputMatched })),
    timeTakenSeconds,
    durationSeconds: contest.round2DurationSeconds,
  });

  const criteriaScores = {
    bugIdentification: null, // pending admin grading
    correctnessOfFix: null, // pending admin grading
    expectedOutput,
    timeEfficiency,
  };

  try {
    await prisma.submission.create({
      data: {
        participantId: participant.id,
        round: 2,
        totalScore: 0, // finalized once the admin grades the manual criteria
        payload: payloadItems,
        criteriaScores,
        graded: false,
      },
    });

    await prisma.auditEvent.create({
      data: { participantId: participant.id, type: "SUBMISSION", detail: "round2" },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A submission already exists for Round 2." }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, message: "Round 2 submitted successfully." });
}
