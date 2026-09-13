import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const accessCode = typeof body?.accessCode === "string" ? body.accessCode.trim() : "";

  if (!accessCode) {
    return NextResponse.json({ error: "Access code is required." }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({ where: { accessCode } });

  if (!participant) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
  }

  if (participant.disqualified) {
    return NextResponse.json({ error: "This participant has been disqualified." }, { status: 403 });
  }

  await createSessionCookie({ sub: participant.id, role: "participant" });

  await prisma.auditEvent.create({
    data: { participantId: participant.id, type: "LOGIN" },
  });

  return NextResponse.json({ name: participant.name });
}
