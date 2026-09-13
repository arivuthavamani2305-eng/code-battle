import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

const ALLOWED_TYPES = new Set([
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "FULLSCREEN_EXIT",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
]);

export async function POST(req: NextRequest) {
  const session = await requireParticipant();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const type = typeof body?.type === "string" ? body.type : "";

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Unknown event type." }, { status: 400 });
  }

  // Recorded only. A single event NEVER triggers disqualification automatically -
  // that decision is left to the admin reviewing the audit trail.
  await prisma.auditEvent.create({
    data: { participantId: session.sub, type, detail: body?.detail ?? null },
  });

  return NextResponse.json({ ok: true });
}
