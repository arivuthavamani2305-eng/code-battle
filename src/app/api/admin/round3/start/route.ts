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
  const endAt = new Date(now.getTime() + contest.round3DurationSeconds * 1000);

  const updated = await prisma.contest.update({
    where: { id: contest.id },
    data: { round3StartAt: now, round3EndAt: endAt, round3Active: true },
  });

  return NextResponse.json({
    round3StartAt: updated.round3StartAt,
    round3EndAt: updated.round3EndAt,
  });
}
