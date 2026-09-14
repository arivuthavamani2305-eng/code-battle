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

  const updated = await prisma.contest.update({
    where: { id: contest.id },
    data: { round3Active: false, round3EndAt: now },
  });

  return NextResponse.json({ round3EndAt: updated.round3EndAt });
}
