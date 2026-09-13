import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const session = await requireParticipant();
  if (session) {
    await prisma.auditEvent.create({
      data: { participantId: session.sub, type: "LOGOUT" },
    });
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
