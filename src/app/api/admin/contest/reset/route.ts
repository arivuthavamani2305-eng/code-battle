import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const contest = await prisma.contest.findFirst();
  if (!contest) {
    return NextResponse.json({ error: "No contest configured." }, { status: 404 });
  }

  if (contest.round1Active || contest.round2Active || contest.round3Active) {
    return NextResponse.json({ error: "Stop all active rounds before resetting the contest." }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const participants = await tx.participant.findMany({
      where: { contestId: contest.id },
      select: { id: true },
    });
    const participantIds = participants.map((participant) => participant.id);

    const deletedAnswers = participantIds.length
      ? await tx.answer.deleteMany({ where: { submission: { participantId: { in: participantIds } } } })
      : { count: 0 };
    const deletedSubmissions = participantIds.length
      ? await tx.submission.deleteMany({ where: { participantId: { in: participantIds } } })
      : { count: 0 };
    const deletedAuditEvents = participantIds.length
      ? await tx.auditEvent.deleteMany({ where: { participantId: { in: participantIds } } })
      : { count: 0 };

    await tx.participant.updateMany({
      where: { contestId: contest.id },
      data: { disqualified: false },
    });

    await tx.contest.update({
      where: { id: contest.id },
      data: {
        round1StartAt: null,
        round1EndAt: null,
        round1Active: false,
        round2StartAt: null,
        round2EndAt: null,
        round2Active: false,
        round3StartAt: null,
        round3EndAt: null,
        round3Active: false,
      },
    });

    return {
      deletedAnswers: deletedAnswers.count,
      deletedSubmissions: deletedSubmissions.count,
      deletedAuditEvents: deletedAuditEvents.count,
    };
  });

  return NextResponse.json({ ok: true, ...result });
}
