import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const EASY_QUESTIONS = [
  {
    text: "What is the output of: print(2 + 3 * 4) in Python?",
    optionA: "20",
    optionB: "14",
    optionC: "24",
    optionD: "Error",
    correct: "B",
  },
  {
    text: "Which data structure uses LIFO (Last In First Out) order?",
    optionA: "Queue",
    optionB: "Array",
    optionC: "Stack",
    optionD: "Linked List",
    correct: "C",
  },
  {
    text: "What does 'int x = 5 / 2;' evaluate to in Java?",
    optionA: "2.5",
    optionB: "2",
    optionC: "3",
    optionD: "Compile error",
    correct: "B",
  },
  {
    text: "Which loop is guaranteed to execute at least once?",
    optionA: "for",
    optionB: "while",
    optionC: "do-while",
    optionD: "foreach",
    correct: "C",
  },
  {
    text: "What is the time complexity of binary search on a sorted array?",
    optionA: "O(n)",
    optionB: "O(n log n)",
    optionC: "O(log n)",
    optionD: "O(1)",
    correct: "C",
  },
  {
    text: "In Java, which keyword prevents a class from being extended?",
    optionA: "static",
    optionB: "final",
    optionC: "private",
    optionD: "abstract",
    correct: "B",
  },
  {
    text: "What will `console.log(typeof null)` print in JavaScript?",
    optionA: "'null'",
    optionB: "'undefined'",
    optionC: "'object'",
    optionD: "'number'",
    correct: "C",
  },
];

const HARD_QUESTIONS = [
  {
    text:
      "int a = 5; int b = a++ + ++a; What is the value of b (Java/C-style semantics)?",
    optionA: "10",
    optionB: "11",
    optionC: "12",
    optionD: "13",
    correct: "C",
  },
  {
    text:
      "What is the space complexity of a recursive Fibonacci implementation without memoization, for input n?",
    optionA: "O(1)",
    optionB: "O(n)",
    optionC: "O(2^n)",
    optionD: "O(n^2)",
    correct: "B",
  },
  {
    text:
      "Given a binary tree, which traversal visits nodes in the order: left, right, root?",
    optionA: "Preorder",
    optionB: "Inorder",
    optionC: "Postorder",
    optionD: "Level order",
    correct: "C",
  },
  {
    text:
      "Which sorting algorithm has the best worst-case time complexity: O(n log n)?",
    optionA: "Bubble Sort",
    optionB: "Quick Sort",
    optionC: "Merge Sort",
    optionD: "Insertion Sort",
    correct: "C",
  },
  {
    text:
      "In a hash map with open addressing and linear probing, what mainly causes performance degradation as load factor approaches 1?",
    optionA: "Increased memory usage",
    optionB: "Clustering causing longer probe sequences",
    optionC: "Hash function becomes invalid",
    optionD: "Keys become mutable",
    correct: "B",
  },
  {
    text:
      "What does the following regex match: ^[a-z]+\\d*$ (case-sensitive)?",
    optionA: "One or more lowercase letters optionally followed by digits",
    optionB: "Any string containing lowercase letters and digits",
    optionC: "Exactly one lowercase letter and one digit",
    optionD: "Digits followed by lowercase letters",
    correct: "A",
  },
  {
    text:
      "Which of these correctly describes a deadlock condition in concurrent programming?",
    optionA: "A thread runs forever without finishing",
    optionB: "Two or more threads wait on each other's held resources indefinitely",
    optionC: "A thread crashes due to a null pointer",
    optionD: "Multiple threads write the same value simultaneously",
    correct: "B",
  },
  {
    text:
      "What is the output of this Java snippet?\nString a = \"hello\";\nString b = \"hello\";\nSystem.out.println(a == b);",
    optionA: "true",
    optionB: "false",
    optionC: "Compile error",
    optionD: "Runtime exception",
    correct: "A",
  },
];

// Round 2 - Bug Warfare. Every fix below has been run through the actual
// judge (src/lib/judge.ts) to confirm: the buggy code does NOT already
// produce expectedOutput, and a correct fix does.
const BUG_QUESTIONS = [
  {
    title: "Off-by-one in a sum loop",
    language: "javascript",
    buggyCode: `function sumTo(n) {
  let total = 0;
  for (let i = 0; i < n; i++) { total += i; } // this loop stops one short
  return total;
}
console.log(sumTo(5));`,
    expectedOutput: "15",
    hint: "Should the sum of 1..5 include 5 itself?",
  },
  {
    title: "Assignment instead of comparison",
    language: "javascript",
    buggyCode: `function isAdult(age) {
  if (age = 18) { return true; } // = vs ==/>= ?
  return age >= 18;
}
console.log(isAdult(16));`,
    expectedOutput: "false",
    hint: "Look closely at the if-condition operator.",
  },
  {
    title: "String reversal that doesn't reverse",
    language: "javascript",
    buggyCode: `function reverse(str) {
  return str; // this just returns the input unchanged
}
console.log(reverse("battle"));`,
    expectedOutput: "elttab",
    hint: "You'll need to split, reverse, and join.",
  },
  {
    title: "Fibonacci with a wrong base case",
    language: "javascript",
    buggyCode: `function fib(n) {
  if (n <= 1) return 0; // fib(1) shouldn't be 0
  return fib(n - 1) + fib(n - 2);
}
console.log(fib(7));`,
    expectedOutput: "13",
    hint: "What should fib(0) and fib(1) actually return?",
  },
];

// Round 3 - Code War. testCases were run against a correct reference
// solution (all pass) and a deliberately wrong one (all fail) to confirm
// they discriminate correctly. Participant code must define `solve`.
const CODING_PROBLEMS = [
  {
    title: "Two Sum",
    statement:
      "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target, as [i, j] with i < j. Assume exactly one solution exists.\n\nWrite: function solve(nums, target)",
    starterCode: `function solve(nums, target) {
  // your code here
}`,
    testCases: [
      { args: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] },
      { args: [[3, 2, 4], 6], expectedOutput: [1, 2] },
      { args: [[1, 5, 3, 8], 11], expectedOutput: [2, 3], hidden: true },
      { args: [[5, 5], 10], expectedOutput: [0, 1], hidden: true },
    ],
  },
];

async function main() {
  let contest = await prisma.contest.findFirst({ orderBy: { createdAt: "asc" } });

  if (!contest) {
    contest = await prisma.contest.create({
      data: {
        name: "Code Battle 2026",
        round1DurationSeconds: Number(process.env.ROUND1_DURATION_SECONDS ?? 1200),
        round2DurationSeconds: Number(process.env.ROUND2_DURATION_SECONDS ?? 1800),
        round3DurationSeconds: Number(process.env.ROUND3_DURATION_SECONDS ?? 2700),
      },
    });
    console.log("Created new contest:", contest.id);
  } else {
    console.log("Using existing contest:", contest.id, `(${contest.name})`);
  }

  const existingQuestionCount = await prisma.question.count({ where: { contestId: contest.id } });
  if (existingQuestionCount === 0) {
    let order = 1;
    for (const q of EASY_QUESTIONS) {
      await prisma.question.create({
        data: { ...q, difficulty: Difficulty.EASY, order: order++, contestId: contest.id },
      });
    }
    for (const q of HARD_QUESTIONS) {
      await prisma.question.create({
        data: { ...q, difficulty: Difficulty.HARD, order: order++, contestId: contest.id },
      });
    }
    console.log(`Seeded ${EASY_QUESTIONS.length + HARD_QUESTIONS.length} MCQ questions.`);
  } else {
    console.log(`Skipped MCQ questions - ${existingQuestionCount} already exist for this contest.`);
  }

  const existingBugCount = await prisma.bugQuestion.count({ where: { contestId: contest.id } });
  if (existingBugCount === 0) {
    let bugOrder = 1;
    for (const b of BUG_QUESTIONS) {
      await prisma.bugQuestion.create({ data: { ...b, order: bugOrder++, contestId: contest.id } });
    }
    console.log(`Seeded ${BUG_QUESTIONS.length} bug questions.`);
  } else {
    console.log(`Skipped bug questions - ${existingBugCount} already exist for this contest.`);
  }

  const existingProblemCount = await prisma.codingProblem.count({ where: { contestId: contest.id } });
  if (existingProblemCount === 0) {
    let problemOrder = 1;
    for (const p of CODING_PROBLEMS) {
      await prisma.codingProblem.create({ data: { ...p, order: problemOrder++, contestId: contest.id } });
    }
    console.log(`Seeded ${CODING_PROBLEMS.length} coding problem(s).`);
  } else {
    console.log(`Skipped coding problems - ${existingProblemCount} already exist for this contest.`);
  }

  const existingParticipantCount = await prisma.participant.count({ where: { contestId: contest.id } });
  if (existingParticipantCount === 0) {
    const demoParticipants = [
      { name: "Participant One", accessCode: "CB-0001" },
      { name: "Participant Two", accessCode: "CB-0002" },
      { name: "Participant Three", accessCode: "CB-0003" },
    ];
    for (const p of demoParticipants) {
      await prisma.participant.create({ data: { ...p, contestId: contest.id } });
    }
    console.log("Seeded demo participants:", demoParticipants.map((p) => p.accessCode).join(", "));
  } else {
    console.log(`Skipped demo participants - ${existingParticipantCount} already exist for this contest.`);
  }

  console.log("Seed complete. Contest ID:", contest.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
