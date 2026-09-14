// One-time fix for a specific situation: `npm run seed` was re-run and
// created a second, orphaned Contest row (because it wasn't idempotent
// yet) before failing on duplicate participant access codes. That stray
// contest is holding your Round 2 / Round 3 seed data, disconnected from
// the contest your real participants belong to.
//
// This script finds the contest WITH participants (the real one), moves
// any bug questions / coding problems from stray contest(s) onto it (only
// if the real contest doesn't already have them, so it's safe to run more
// than once), deletes the stray contest(s) and their duplicate MCQ
// questions, and leaves your real contest/participants untouched.
//
// Run with: npx tsx prisma/fix-duplicate-contest.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contests = await prisma.contest.findMany({
    include: {
      participants: true,
      bugQuestions: true,
      codingProblems: true,
      questions: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${contests.length} contest(s):`);
  for (const c of contests) {
    console.log(
      `  ${c.id} | created ${c.createdAt.toISOString()} | participants: ${c.participants.length} | bugQuestions: ${c.bugQuestions.length} | codingProblems: ${c.codingProblems.length} | mcqQuestions: ${c.questions.length}`
    );
  }

  if (contests.length <= 1) {
    console.log("Only one contest exists - nothing to fix.");
    return;
  }

  const real = contests.find((c) => c.participants.length > 0);
  if (!real) {
    console.log("No contest has any participants - can't tell which one is real. Stopping without changes.");
    return;
  }
  console.log(`\nKeeping contest ${real.id} (it has your real participants).`);

  const strays = contests.filter((c) => c.id !== real.id);

  let movedBugQuestions = real.bugQuestions.length > 0;
  let movedCodingProblems = real.codingProblems.length > 0;

  for (const stray of strays) {
    console.log(`\nCleaning up stray contest ${stray.id}...`);

    if (!movedBugQuestions && stray.bugQuestions.length > 0) {
      await prisma.bugQuestion.updateMany({
        where: { contestId: stray.id },
        data: { contestId: real.id },
      });
      console.log(`  Moved ${stray.bugQuestions.length} bug question(s) into ${real.id}`);
      movedBugQuestions = true;
    } else if (stray.bugQuestions.length > 0) {
      await prisma.bugQuestion.deleteMany({ where: { contestId: stray.id } });
      console.log(`  Deleted ${stray.bugQuestions.length} duplicate bug question(s)`);
    }

    if (!movedCodingProblems && stray.codingProblems.length > 0) {
      await prisma.codingProblem.updateMany({
        where: { contestId: stray.id },
        data: { contestId: real.id },
      });
      console.log(`  Moved ${stray.codingProblems.length} coding problem(s) into ${real.id}`);
      movedCodingProblems = true;
    } else if (stray.codingProblems.length > 0) {
      await prisma.codingProblem.deleteMany({ where: { contestId: stray.id } });
      console.log(`  Deleted ${stray.codingProblems.length} duplicate coding problem(s)`);
    }

    // Stray MCQ questions are just duplicates of what the real contest
    // already has (seed always adds all 15) - safe to delete outright.
    if (stray.questions.length > 0) {
      await prisma.question.deleteMany({ where: { contestId: stray.id } });
      console.log(`  Deleted ${stray.questions.length} duplicate MCQ question(s)`);
    }

    await prisma.contest.delete({ where: { id: stray.id } });
    console.log(`  Deleted stray contest ${stray.id}`);
  }

  const finalBugCount = await prisma.bugQuestion.count({ where: { contestId: real.id } });
  const finalProblemCount = await prisma.codingProblem.count({ where: { contestId: real.id } });
  console.log(
    `\nDone. Contest ${real.id} now has ${finalBugCount} bug question(s) and ${finalProblemCount} coding problem(s).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
