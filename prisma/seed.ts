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
  {
    title: "Valid Parentheses",
    statement:
      "Given a string containing (), {}, and [], return true when every opening bracket is closed in the correct order. Return false otherwise.\n\nWrite: function solve(s)",
    starterCode: `function solve(s) {
  // your code here
}`,
    testCases: [
      { args: ["()[]{}"], expectedOutput: true },
      { args: ["([)]"], expectedOutput: false },
      { args: ["{[]}"], expectedOutput: true, hidden: true },
      { args: ["("], expectedOutput: false, hidden: true },
    ],
  },
  {
    title: "Merge Sorted Arrays",
    statement:
      "Given two sorted arrays nums1 and nums2, return one sorted array containing all values from both arrays.\n\nWrite: function solve(nums1, nums2)",
    starterCode: `function solve(nums1, nums2) {
  // your code here
}`,
    testCases: [
      { args: [[1, 3, 5], [2, 4, 6]], expectedOutput: [1, 2, 3, 4, 5, 6] },
      { args: [[], [1, 2]], expectedOutput: [1, 2] },
      { args: [[-3, 0, 7], [-2, 4]], expectedOutput: [-3, -2, 0, 4, 7], hidden: true },
      { args: [[1], []], expectedOutput: [1], hidden: true },
    ],
  },
  {
    title: "Longest Word",
    statement:
      "Given a sentence, return the longest word. If multiple words have the same length, return the first one. Ignore punctuation at word boundaries.\n\nWrite: function solve(sentence)",
    starterCode: `function solve(sentence) {
  // your code here
}`,
    testCases: [
      { args: ["Code battles reward practice"], expectedOutput: "battles" },
      { args: ["small big"], expectedOutput: "small" },
      { args: ["Write clean solutions!"], expectedOutput: "solutions", hidden: true },
      { args: ["one"], expectedOutput: "one", hidden: true },
    ],
  },
  {
    title: "Rotate Array",
    statement:
      "Given an array and a non-negative integer k, rotate the array to the right by k positions and return the result.\n\nWrite: function solve(values, k)",
    starterCode: `function solve(values, k) {
  // your code here
}`,
    testCases: [
      { args: [[1, 2, 3, 4, 5], 2], expectedOutput: [4, 5, 1, 2, 3] },
      { args: [[1, 2], 3], expectedOutput: [2, 1] },
      { args: [[], 4], expectedOutput: [], hidden: true },
      { args: [[-1, -2, -3], 1], expectedOutput: [-3, -1, -2], hidden: true },
    ],
  },
  {
    title: "Contains Duplicate",
    statement:
      "Given an array of integers, return true if any value appears at least twice and false if every value is unique.\n\nWrite: function solve(values)",
    starterCode: `function solve(values) {
  // your code here
}`,
    testCases: [
      { args: [[1, 2, 3, 1]], expectedOutput: true },
      { args: [[1, 2, 3, 4]], expectedOutput: false },
      { args: [[-1, -1]], expectedOutput: true, hidden: true },
      { args: [[]], expectedOutput: false, hidden: true },
    ],
  },
  {
    title: "Maximum Subarray",
    statement:
      "Given an integer array, find the contiguous subarray with the largest sum and return that sum.\n\nWrite: function solve(values)",
    starterCode: `function solve(values) {
  // your code here
}`,
    testCases: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expectedOutput: 6 },
      { args: [[1]], expectedOutput: 1 },
      { args: [[5, 4, -1, 7, 8]], expectedOutput: 23, hidden: true },
      { args: [[-3, -2, -1]], expectedOutput: -1, hidden: true },
    ],
  },
  {
    title: "Palindrome Check",
    statement:
      "Return true if a string reads the same forward and backward, ignoring case and non-alphanumeric characters.\n\nWrite: function solve(text)",
    starterCode: `function solve(text) {
  // your code here
}`,
    testCases: [
      { args: ["A man, a plan, a canal: Panama"], expectedOutput: true },
      { args: ["race a car"], expectedOutput: false },
      { args: [""], expectedOutput: true, hidden: true },
      { args: ["No lemon, no melon!"], expectedOutput: true, hidden: true },
    ],
  },
  {
    title: "FizzBuzz",
    statement:
      "For integers from 1 through n, return an array where multiples of 3 become Fizz, multiples of 5 become Buzz, multiples of both become FizzBuzz, and other values remain numbers.\n\nWrite: function solve(n)",
    starterCode: `function solve(n) {
  // your code here
}`,
    testCases: [
      { args: [5], expectedOutput: [1, 2, "Fizz", 4, "Buzz"] },
      { args: [15], expectedOutput: [1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz", 11, "Fizz", 13, 14, "FizzBuzz"] },
      { args: [1], expectedOutput: [1], hidden: true },
      { args: [0], expectedOutput: [], hidden: true },
    ],
  },
  {
    title: "Binary Search",
    statement:
      "Given a sorted array and a target, return the target index or -1 when it is absent.\n\nWrite: function solve(values, target)",
    starterCode: `function solve(values, target) {
  // your code here
}`,
    testCases: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expectedOutput: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expectedOutput: -1 },
      { args: [[1], 1], expectedOutput: 0, hidden: true },
      { args: [[], 7], expectedOutput: -1, hidden: true },
    ],
  },
  {
    title: "Move Zeroes",
    statement:
      "Move every zero in an array to the end while preserving the relative order of non-zero values. Return the resulting array.\n\nWrite: function solve(values)",
    starterCode: `function solve(values) {
  // your code here
}`,
    testCases: [
      { args: [[0, 1, 0, 3, 12]], expectedOutput: [1, 3, 12, 0, 0] },
      { args: [[0]], expectedOutput: [0] },
      { args: [[1, 2, 3]], expectedOutput: [1, 2, 3], hidden: true },
      { args: [[0, 0, 1]], expectedOutput: [1, 0, 0], hidden: true },
    ],
  },
  {
    title: "Valid Anagram",
    statement:
      "Return true if two strings contain the same characters with the same frequencies.\n\nWrite: function solve(first, second)",
    starterCode: `function solve(first, second) {
  // your code here
}`,
    testCases: [
      { args: ["anagram", "nagaram"], expectedOutput: true },
      { args: ["rat", "car"], expectedOutput: false },
      { args: ["", ""], expectedOutput: true, hidden: true },
      { args: ["listen", "silent"], expectedOutput: true, hidden: true },
    ],
  },
  {
    title: "Climbing Stairs",
    statement:
      "You can climb one or two steps at a time. Return the number of distinct ways to reach the top of a staircase with n steps.\n\nWrite: function solve(n)",
    starterCode: `function solve(n) {
  // your code here
}`,
    testCases: [
      { args: [2], expectedOutput: 2 },
      { args: [3], expectedOutput: 3 },
      { args: [5], expectedOutput: 8, hidden: true },
      { args: [1], expectedOutput: 1, hidden: true },
    ],
  },
  {
    title: "Product Except Self",
    statement:
      "Return an array where each position contains the product of every input value except the value at that position. Do not use division.\n\nWrite: function solve(values)",
    starterCode: `function solve(values) {
  // your code here
}`,
    testCases: [
      { args: [[1, 2, 3, 4]], expectedOutput: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expectedOutput: [0, 0, 9, 0, 0] },
      { args: [[2, 3]], expectedOutput: [3, 2], hidden: true },
      { args: [[0, 0]], expectedOutput: [0, 0], hidden: true },
    ],
  },
  {
    title: "First Unique Character",
    statement:
      "Return the index of the first character that appears exactly once, or -1 if no such character exists.\n\nWrite: function solve(text)",
    starterCode: `function solve(text) {
  // your code here
}`,
    testCases: [
      { args: ["leetcode"], expectedOutput: 0 },
      { args: ["loveleetcode"], expectedOutput: 2 },
      { args: ["aabb"], expectedOutput: -1, hidden: true },
      { args: ["z"], expectedOutput: 0, hidden: true },
    ],
  },
  {
    title: "Array Intersection",
    statement:
      "Return the unique values that appear in both arrays. The result may be in any order.\n\nWrite: function solve(first, second)",
    starterCode: `function solve(first, second) {
  // your code here
}`,
    testCases: [
      { args: [[1, 2, 2, 1], [2, 2]], expectedOutput: [2] },
      { args: [[4, 9, 5], [9, 4, 9, 8, 4]], expectedOutput: [4, 9] },
      { args: [[], [1]], expectedOutput: [], hidden: true },
      { args: [[1, 2], [3, 4]], expectedOutput: [], hidden: true },
    ],
  },
  {
    title: "Majority Element",
    statement:
      "Return the value that appears more than half the time in an array. Assume a majority element always exists.\n\nWrite: function solve(values)",
    starterCode: `function solve(values) {
  // your code here
}`,
    testCases: [
      { args: [[3, 2, 3]], expectedOutput: 3 },
      { args: [[2, 2, 1, 1, 1, 2, 2]], expectedOutput: 2 },
      { args: [[1]], expectedOutput: 1, hidden: true },
      { args: [[5, 5, 4]], expectedOutput: 5, hidden: true },
    ],
  },
  {
    title: "Count Vowels",
    statement:
      "Return the number of vowels in a string. Count a, e, i, o, and u regardless of case.\n\nWrite: function solve(text)",
    starterCode: `function solve(text) {
  // your code here
}`,
    testCases: [
      { args: ["hello"], expectedOutput: 2 },
      { args: ["Programming"], expectedOutput: 3 },
      { args: ["AEIOU"], expectedOutput: 5, hidden: true },
      { args: ["rhythm"], expectedOutput: 0, hidden: true },
    ],
  },
  {
    title: "Reverse Words",
    statement:
      "Reverse the order of words in a sentence, removing extra spaces between words and at the ends.\n\nWrite: function solve(sentence)",
    starterCode: `function solve(sentence) {
  // your code here
}`,
    testCases: [
      { args: ["the sky is blue"], expectedOutput: "blue is sky the" },
      { args: ["  hello world  "], expectedOutput: "world hello" },
      { args: ["a"], expectedOutput: "a", hidden: true },
      { args: ["one   two   three"], expectedOutput: "three two one", hidden: true },
    ],
  },
  {
    title: "Missing Number",
    statement:
      "Given n distinct numbers from the range 0 through n, return the one number missing from the array.\n\nWrite: function solve(values)",
    starterCode: `function solve(values) {
  // your code here
}`,
    testCases: [
      { args: [[3, 0, 1]], expectedOutput: 2 },
      { args: [[0, 1]], expectedOutput: 2 },
      { args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], expectedOutput: 8, hidden: true },
      { args: [[0]], expectedOutput: 1, hidden: true },
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

  await prisma.bugQuestion.deleteMany({ where: { contestId: contest.id } });
  let bugOrder = 1;
  for (const b of BUG_QUESTIONS) {
    await prisma.bugQuestion.create({ data: { ...b, order: bugOrder++, contestId: contest.id } });
  }
  console.log(`Seeded ${BUG_QUESTIONS.length} bug questions.`);

  let problemOrder = (await prisma.codingProblem.aggregate({
    where: { contestId: contest.id },
    _max: { order: true },
  }))._max.order ?? 0;
  let seededProblems = 0;
  for (const p of CODING_PROBLEMS) {
    const exists = await prisma.codingProblem.findFirst({ where: { contestId: contest.id, title: p.title } });
    if (!exists) {
      await prisma.codingProblem.create({ data: { ...p, order: ++problemOrder, contestId: contest.id } });
      seededProblems++;
    }
  }
  console.log(`Coding problem pool ready: ${problemOrder} total, ${seededProblems} added.`);

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
