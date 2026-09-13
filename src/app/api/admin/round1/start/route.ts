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

  const now = new Date();
  const endAt = new Date(now.getTime() + contest.round1DurationSeconds * 1000);

  const updated = await prisma.contest.update({
    where: { id: contest.id },
    data: { round1StartAt: now, round1EndAt: endAt, round1Active: true },
  });

  return NextResponse.json({
    round1StartAt: updated.round1StartAt,
    round1EndAt: updated.round1EndAt,
  });
}
