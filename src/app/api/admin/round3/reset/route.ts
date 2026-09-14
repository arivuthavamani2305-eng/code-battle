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

  if (contest.round3Active) {
    return NextResponse.json({ error: "Stop Round 3 before resetting it." }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.submission.deleteMany({
      where: {
        round: 3,
        participant: { contestId: contest.id },
      },
    });

    await tx.contest.update({
      where: { id: contest.id },
      data: { round3StartAt: null, round3EndAt: null, round3Active: false },
    });

    return deleted.count;
  });

  return NextResponse.json({ ok: true, deletedSubmissions: result });
}
