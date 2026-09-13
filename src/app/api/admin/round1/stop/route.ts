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
    // Setting endAt to now means the submit route's server-side time check
    // rejects any further submissions immediately, regardless of client state.
    data: { round1Active: false, round1EndAt: now },
  });

  return NextResponse.json({ round1EndAt: updated.round1EndAt });
}
