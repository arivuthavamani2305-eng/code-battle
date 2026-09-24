import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { computeRound1Score } from "@/lib/scoring";

type IncomingAnswer = { questionId: string; selectedOption: "A" | "B" | "C" | "D" };

export async function POST(req: NextRequest) {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const rawAnswers = Array.isArray(body?.answers) ? (body.answers as IncomingAnswer[]) : null;
  if (!rawAnswers) {
    return NextResponse.json({ error: "Malformed submission." }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      disqualified: true,
      contest: true,
      submissions: { where: { round: 1 }, select: { round: true } },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }
  if (participant.disqualified) {
    return NextResponse.json({ error: "Disqualified." }, { status: 403 });
  }

  const contest = participant.contest;
  const now = new Date();

  // Server is the sole authority on timing. Client-reported time is never trusted.
  const withinWindow =
    contest.round1Active &&
    contest.round1StartAt &&
    contest.round1EndAt &&
    now >= contest.round1StartAt &&
    now <= contest.round1EndAt;

  if (!withinWindow) {
    return NextResponse.json(
      { error: "Round 1 submission window is closed. Submission rejected." },
      { status: 403 }
    );
  }

  if (participant.submissions.length > 0) {
    return NextResponse.json({ error: "A submission already exists for Round 1." }, { status: 409 });
  }

  const questions = await prisma.question.findMany({ where: { contestId: contest.id } });
  const questionById = new Map(questions.map((q) => [q.id, q]));

  // Only accept answers for questions that actually belong to this contest,
  // and only one answer per question (last one wins if duplicated).
  const cleanedAnswers = new Map<string, "A" | "B" | "C" | "D">();
  for (const a of rawAnswers) {
    if (
      typeof a?.questionId === "string" &&
      questionById.has(a.questionId) &&
      typeof a?.selectedOption === "string" &&
      ["A", "B", "C", "D"].includes(a.selectedOption)
    ) {
      cleanedAnswers.set(a.questionId, a.selectedOption as "A" | "B" | "C" | "D");
    }
  }

  let correctCount = 0;
  const answerRows = questions.map((q) => {
    const selected = cleanedAnswers.get(q.id);
    const isCorrect = selected !== undefined && selected === q.correct;
    if (isCorrect) correctCount++;
    return {
      questionId: q.id,
      selectedOption: selected ?? "", // unanswered counts as wrong, never blocks submission
      isCorrect,
    };
  });

  const timeTakenSeconds = Math.max(
    0,
    (now.getTime() - contest.round1StartAt!.getTime()) / 1000
  );

  const { correctnessScore, timeScore, totalScore } = computeRound1Score({
    correctCount,
    totalQuestions: questions.length,
    timeTakenSeconds,
    durationSeconds: contest.round1DurationSeconds,
  });

  try {
    await prisma.$transaction(async (tx) => {
      const submission = await tx.submission.create({
        data: {
          participantId: participant.id,
          round: 1,
          correctnessScore,
          timeScore,
          totalScore,
        },
      });

      await tx.answer.createMany({
        data: answerRows.map((a) => ({ ...a, submissionId: submission.id })),
      });

      await tx.auditEvent.create({
        data: { participantId: participant.id, type: "SUBMISSION", detail: "round1" },
      });
    });
  } catch (err: any) {
    // Unique constraint on (participantId, round) guards against double submission
    // even under a race of two near-simultaneous requests.
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A submission already exists for Round 1." }, { status: 409 });
    }
    throw err;
  }

  // Score is intentionally NOT returned here - participants never see scores.
  return NextResponse.json({ ok: true, message: "Round 1 submitted successfully." });
}
