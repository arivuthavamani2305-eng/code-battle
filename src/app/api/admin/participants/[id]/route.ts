import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action === "reinstate" ? "reinstate" : body?.action === "disqualify" ? "disqualify" : null;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!action) {
    return NextResponse.json({ error: "Action must be disqualify or reinstate." }, { status: 400 });
  }
  if (action === "disqualify" && !reason) {
    return NextResponse.json({ error: "A disqualification reason is required." }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({ where: { id: params.id } });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  const disqualified = action === "disqualify";
  const updated = await prisma.participant.update({
    where: { id: participant.id },
    data: { disqualified },
  });

  await prisma.auditEvent.create({
    data: {
      participantId: participant.id,
      type: disqualified ? "DISQUALIFICATION" : "REINSTATEMENT",
      detail: reason || "Admin decision",
    },
  });

  return NextResponse.json({ id: updated.id, disqualified: updated.disqualified });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: params.id },
    include: { contest: true },
  });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  if (participant.contest.round1Active || participant.contest.round2Active || participant.contest.round3Active) {
    return NextResponse.json({ error: "Stop all active rounds before removing participants." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.answer.deleteMany({ where: { submission: { participantId: participant.id } } });
    await tx.submission.deleteMany({ where: { participantId: participant.id } });
    await tx.auditEvent.deleteMany({ where: { participantId: participant.id } });
    await tx.participant.delete({ where: { id: participant.id } });
  });

  return NextResponse.json({ ok: true, id: participant.id });
}
