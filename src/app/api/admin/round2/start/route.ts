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

  if (!contest.round1StartAt || contest.round1Active || !contest.round1EndAt) {
    return NextResponse.json({ error: "Complete Round 1 before starting Round 2." }, { status: 409 });
  }

  const now = new Date();
  const endAt = new Date(now.getTime() + contest.round2DurationSeconds * 1000);

  const updated = await prisma.contest.update({
    where: { id: contest.id },
    data: { round2StartAt: now, round2EndAt: endAt, round2Active: true },
  });

  return NextResponse.json({
    round2StartAt: updated.round2StartAt,
    round2EndAt: updated.round2EndAt,
  });
}
