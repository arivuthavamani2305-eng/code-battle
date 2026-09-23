import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { runPythonScriptCapturingOutput } from "@/lib/judge";

export async function POST(req: NextRequest) {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const bugQuestionId = typeof body?.bugQuestionId === "string" ? body.bugQuestionId : "";
  const code = typeof body?.code === "string" ? body.code.slice(0, 20000) : "";

  if (!bugQuestionId || !code.trim()) {
    return NextResponse.json({ error: "Missing bugQuestionId or code." }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    include: { contest: true, submissions: { where: { round: 2 } } },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }
  if (participant.disqualified) {
    return NextResponse.json({ error: "Disqualified." }, { status: 403 });
  }
  if (participant.submissions.length > 0) {
    return NextResponse.json({ error: "You have already submitted Round 2." }, { status: 409 });
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

  const bugQuestion = await prisma.bugQuestion.findUnique({ where: { id: bugQuestionId } });
  if (!bugQuestion || bugQuestion.contestId !== contest.id) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  if (bugQuestion.language !== "python") {
    return NextResponse.json({
      output: null,
      matched: null,
      error: "Live testing is only available for Python snippets in this round.",
    });
  }

  const result = runPythonScriptCapturingOutput(code);
  const matched = result.ok && result.output.trim() === bugQuestion.expectedOutput.trim();

  return NextResponse.json({
    output: result.output,
    matched,
    error: result.error,
  });
}
