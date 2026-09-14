import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, disqualified: true },
  });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  const events = await prisma.auditEvent.findMany({
    where: { participantId: participant.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, type: true, detail: true, createdAt: true },
  });

  return NextResponse.json({ participant, events });
}
