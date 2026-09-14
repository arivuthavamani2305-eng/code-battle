import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function generateAccessCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CB-${random}`;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const participants = await prisma.participant.findMany({
    orderBy: { createdAt: "asc" },
    include: { submissions: { where: { round: 1 } } },
  });

  return NextResponse.json({
    participants: participants.map((p) => ({
      id: p.id,
      name: p.name,
      accessCode: p.accessCode,
      disqualified: p.disqualified,
      hasSubmittedRound1: p.submissions.length > 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Participant name is required." }, { status: 400 });
  }

  const contest = await prisma.contest.findFirst();
  if (!contest) {
    return NextResponse.json({ error: "No contest configured." }, { status: 404 });
  }

  const participant = await prisma.participant.create({
    data: { name, accessCode: generateAccessCode(), contestId: contest.id },
  });

  return NextResponse.json({ id: participant.id, name: participant.name, accessCode: participant.accessCode });
}

