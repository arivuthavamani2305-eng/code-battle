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

async function main() {
  const contest = await prisma.contest.create({
    data: {
      name: "Code Battle 2026",
      round1DurationSeconds: Number(process.env.ROUND1_DURATION_SECONDS ?? 1200),
    },
  });

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

  const demoParticipants = [
    { name: "Participant One", accessCode: "CB-0001" },
    { name: "Participant Two", accessCode: "CB-0002" },
    { name: "Participant Three", accessCode: "CB-0003" },
  ];

  for (const p of demoParticipants) {
    await prisma.participant.create({
      data: { ...p, contestId: contest.id },
    });
  }

  console.log("Seed complete.");
  console.log("Contest ID:", contest.id);
  console.log("Demo access codes:", demoParticipants.map((p) => p.accessCode).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
