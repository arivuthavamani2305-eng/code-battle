import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const contest = await prisma.contest.findFirst({ orderBy: { createdAt: "asc" } });
  if (!contest) {
    return NextResponse.json({ error: "No contest configured." }, { status: 404 });
  }

  return NextResponse.json({
    round1: { active: contest.round1Active, startAt: contest.round1StartAt, endAt: contest.round1EndAt },
    round2: { active: contest.round2Active, startAt: contest.round2StartAt, endAt: contest.round2EndAt },
    round3: { active: contest.round3Active, startAt: contest.round3StartAt, endAt: contest.round3EndAt },
  });
}