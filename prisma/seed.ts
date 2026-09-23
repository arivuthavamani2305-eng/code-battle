import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const EASY_QUESTIONS = [
  {
    text: "What is the output of: print(5 + 3 * 2) in Python?",
    optionA: "16",
    optionB: "11",
    optionC: "13",
    optionD: "Error",
    correct: "B",
  },
  {
    text: "Which Python data structure follows FIFO order?",
    optionA: "Stack",
    optionB: "Queue",
    optionC: "Set",
    optionD: "Dictionary",
    correct: "B",
  },
  {
    text: "In Java, what does int x = 5 / 2; evaluate to?",
    optionA: "2.5",
    optionB: "2",
    optionC: "3",
    optionD: "Compile error",
    correct: "B",
  },
  {
    text: "Which data structure is best for implementing a LIFO stack?",
    optionA: "ArrayList",
    optionB: "Queue",
    optionC: "LinkedList",
    optionD: "HashMap",
    correct: "C",
  },
  {
    text: "What is the average time complexity of a Python dictionary lookup?",
    optionA: "O(log n)",
    optionB: "O(n)",
    optionC: "O(1)",
    optionD: "O(n^2)",
    correct: "C",
  },
  {
    text: "Which Java keyword prevents a method from being overridden?",
    optionA: "static",
    optionB: "final",
    optionC: "private",
    optionD: "abstract",
    correct: "B",
  },
  {
    text: "In Python, which expression correctly creates a tuple with one element?",
    optionA: "(1)",
    optionB: "[1]",
    optionC: "(1,)",
    optionD: "{1}",
    correct: "C",
  },
];

const HARD_QUESTIONS = [
  {
    text: "What is the time complexity of binary search on a sorted array of size n?",
    optionA: "O(1)",
    optionB: "O(log n)",
    optionC: "O(n)",
    optionD: "O(n log n)",
    correct: "B",
  },
  {
    text: "Which traversal of a binary tree visits the left subtree, then the root, then the right subtree?",
    optionA: "Preorder",
    optionB: "Inorder",
    optionC: "Postorder",
    optionD: "Level-order",
    correct: "B",
  },
  {
    text: "What is the space complexity of a recursive Fibonacci implementation without memoization for input n?",
    optionA: "O(1)",
    optionB: "O(n)",
    optionC: "O(2^n)",
    optionD: "O(n^2)",
    correct: "C",
  },
  {
    text: "Which data structure is used by breadth-first search to keep track of the next nodes to visit?",
    optionA: "Stack",
    optionB: "Queue",
    optionC: "Heap",
    optionD: "TreeSet",
    correct: "B",
  },
  {
    text: "What does the following Python code print?\nnums = [1, 2, 3]\nnums.append(4)\nprint(nums[-1])",
    optionA: "1",
    optionB: "3",
    optionC: "4",
    optionD: "Error",
    correct: "C",
  },
  {
    text: "Which sorting algorithm has worst-case time complexity O(n log n) while guaranteeing stability?",
    optionA: "Quick Sort",
    optionB: "Merge Sort",
    optionC: "Selection Sort",
    optionD: "Bubble Sort",
    correct: "B",
  },
  {
    text: "In a Python dictionary, what happens when you assign a new value to an existing key?",
    optionA: "The key is duplicated",
    optionB: "The old value is replaced",
    optionC: "An exception is raised",
    optionD: "The key is removed",
    correct: "B",
  },
];

const BUG_QUESTIONS = [
  {
    title: "Fibonacci with a wrong base case",
    language: "python",
    buggyCode: `def fib(n):
    if n <= 1:
        return 0
    return fib(n - 1) + fib(n - 2)

print(fib(7))`,
    expectedOutput: "13",
    hint: "The sequence should start with 0, 1, 1, 2, 3, ...",
  },
  {
    title: "String reversal that doesn't reverse",
    language: "python",
    buggyCode: `def reverse_string(s):
    return s

print(reverse_string("battle"))`,
    expectedOutput: "elttab",
    hint: "Use slicing or a loop to reverse the order of characters.",
  },
  {
    title: "Assignment instead of comparison",
    language: "python",
    buggyCode: `def is_adult(age):
    if age = 18:
        return True
    return age >= 18

print(is_adult(16))`,
    expectedOutput: "False",
    hint: "A comparison uses ==, not =.",
  },
  {
    title: "List deduplication bug",
    language: "python",
    buggyCode: `def unique_items(items):
    seen = set()
    result = []
    for item in items:
        if item in seen:
            result.append(item)
        seen.add(item)
    return result

print(unique_items([1, 2, 3, 2, 1, 4]))`,
    expectedOutput: "[1, 2, 3, 4]",
    hint: "Only add the item to the result when it has not been seen before.",
  },
  {
    title: "Palindrome check bug",
    language: "python",
    buggyCode: `def is_palindrome(text):
    cleaned = text.lower().replace(" ", "")
    return cleaned == cleaned[::-1]

print(is_palindrome("racecar"))`,
    expectedOutput: "True",
    hint: "Check the comparison logic carefully.",
  },
  {
    title: "Prime check bug",
    language: "python",
    buggyCode: `def is_prime(n):
    if n < 2:
        return False
    for i in range(2, n):
        if n % i == 0:
            return False
    return True

print(is_prime(13))`,
    expectedOutput: "True",
    hint: "The loop should stop before n, not at n itself.",
  },
];

const CODING_PROBLEMS = [
  { title: "Two Sum", statement: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.\n\nWrite: function solve(nums, target)", starterCode: "function solve(nums, target) {\n  // your code here\n}", testCases: [{ args: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] }, { args: [[3, 2, 4], 6], expectedOutput: [1, 2] }, { args: [[1, 5, 3, 8], 11], expectedOutput: [2, 3], hidden: true }, { args: [[5, 5], 10], expectedOutput: [0, 1], hidden: true }] },
  { title: "Valid Parentheses", statement: "Given a string containing (), {}, and [], return true when every opening bracket is closed in the correct order.\n\nWrite: function solve(s)", starterCode: "function solve(s) {\n  // your code here\n}", testCases: [{ args: ["()[]{}"], expectedOutput: true }, { args: ["([)]"], expectedOutput: false }, { args: ["{[]}"], expectedOutput: true, hidden: true }, { args: ["("], expectedOutput: false, hidden: true }] },
  { title: "Merge Sorted Arrays", statement: "Given two sorted arrays nums1 and nums2, return one sorted array containing all values from both arrays.\n\nWrite: function solve(nums1, nums2)", starterCode: "function solve(nums1, nums2) {\n  // your code here\n}", testCases: [{ args: [[1, 3, 5], [2, 4, 6]], expectedOutput: [1, 2, 3, 4, 5, 6] }, { args: [[], [1, 2]], expectedOutput: [1, 2] }, { args: [[-3, 0, 7], [-2, 4]], expectedOutput: [-3, -2, 0, 4, 7], hidden: true }, { args: [[1], []], expectedOutput: [1], hidden: true }] },
  { title: "FizzBuzz", statement: "For integers from 1 through n, return an array where multiples of 3 become Fizz, multiples of 5 become Buzz, and both become FizzBuzz.\n\nWrite: function solve(n)", starterCode: "function solve(n) {\n  // your code here\n}", testCases: [{ args: [5], expectedOutput: [1, 2, "Fizz", 4, "Buzz"] }, { args: [15], expectedOutput: [1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz", 11, "Fizz", 13, 14, "FizzBuzz"] }, { args: [1], expectedOutput: [1], hidden: true }, { args: [0], expectedOutput: [], hidden: true }] },
  { title: "Binary Search", statement: "Given a sorted array and a target, return the target index or -1 when it is absent.\n\nWrite: function solve(values, target)", starterCode: "function solve(values, target) {\n  // your code here\n}", testCases: [{ args: [[-1, 0, 3, 5, 9, 12], 9], expectedOutput: 4 }, { args: [[-1, 0, 3, 5, 9, 12], 2], expectedOutput: -1 }, { args: [[1], 1], expectedOutput: 0, hidden: true }, { args: [[], 7], expectedOutput: -1, hidden: true }] },
  { title: "Move Zeroes", statement: "Move every zero in an array to the end while preserving the relative order of non-zero values.\n\nWrite: function solve(values)", starterCode: "function solve(values) {\n  // your code here\n}", testCases: [{ args: [[0, 1, 0, 3, 12]], expectedOutput: [1, 3, 12, 0, 0] }, { args: [[0]], expectedOutput: [0] }, { args: [[1, 2, 3]], expectedOutput: [1, 2, 3], hidden: true }, { args: [[0, 0, 1]], expectedOutput: [1, 0, 0], hidden: true }] },
  { title: "Palindrome Check", statement: "Return true if a string reads the same forward and backward, ignoring case and non-alphanumeric characters.\n\nWrite: function solve(text)", starterCode: "function solve(text) {\n  // your code here\n}", testCases: [{ args: ["A man, a plan, a canal: Panama"], expectedOutput: true }, { args: ["race a car"], expectedOutput: false }, { args: [""], expectedOutput: true, hidden: true }, { args: ["No lemon, no melon!"], expectedOutput: true, hidden: true }] },
  { title: "Count Vowels", statement: "Return the number of vowels in a string. Count a, e, i, o, and u regardless of case.\n\nWrite: function solve(text)", starterCode: "function solve(text) {\n  // your code here\n}", testCases: [{ args: ["hello"], expectedOutput: 2 }, { args: ["Programming"], expectedOutput: 3 }, { args: ["AEIOU"], expectedOutput: 5, hidden: true }, { args: ["rhythm"], expectedOutput: 0, hidden: true }] },
  { title: "Reverse Words", statement: "Reverse the order of words in a sentence, removing extra spaces between words and at the ends.\n\nWrite: function solve(sentence)", starterCode: "function solve(sentence) {\n  // your code here\n}", testCases: [{ args: ["the sky is blue"], expectedOutput: "blue is sky the" }, { args: ["  hello world  "], expectedOutput: "world hello" }, { args: ["a"], expectedOutput: "a", hidden: true }, { args: ["one   two   three"], expectedOutput: "three two one", hidden: true }] },
  { title: "Missing Number", statement: "Given n distinct numbers from the range 0 through n, return the one number missing from the array.\n\nWrite: function solve(values)", starterCode: "function solve(values) {\n  // your code here\n}", testCases: [{ args: [[3, 0, 1]], expectedOutput: 2 }, { args: [[0, 1]], expectedOutput: 2 }, { args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], expectedOutput: 8, hidden: true }, { args: [[0]], expectedOutput: 1, hidden: true }] },
  { title: "Array Intersection", statement: "Return the unique values that appear in both arrays. The result may be in any order.\n\nWrite: function solve(first, second)", starterCode: "function solve(first, second) {\n  // your code here\n}", testCases: [{ args: [[1, 2, 2, 1], [2, 2]], expectedOutput: [2] }, { args: [[4, 9, 5], [9, 4, 9, 8, 4]], expectedOutput: [4, 9] }, { args: [[], [1]], expectedOutput: [], hidden: true }, { args: [[1, 2], [3, 4]], expectedOutput: [], hidden: true }] },
  { title: "Majority Element", statement: "Return the value that appears more than half the time in an array. Assume a majority element always exists.\n\nWrite: function solve(values)", starterCode: "function solve(values) {\n  // your code here\n}", testCases: [{ args: [[3, 2, 3]], expectedOutput: 3 }, { args: [[2, 2, 1, 1, 1, 2, 2]], expectedOutput: 2 }, { args: [[1]], expectedOutput: 1, hidden: true }, { args: [[5, 5, 4]], expectedOutput: 5, hidden: true }] },
  { title: "Climbing Stairs", statement: "You can climb one or two steps at a time. Return the number of distinct ways to reach the top of a staircase with n steps.\n\nWrite: function solve(n)", starterCode: "function solve(n) {\n  // your code here\n}", testCases: [{ args: [2], expectedOutput: 2 }, { args: [3], expectedOutput: 3 }, { args: [5], expectedOutput: 8, hidden: true }, { args: [1], expectedOutput: 1, hidden: true }] },
  { title: "Length of Last Word", statement: "Return the length of the last word in a string, ignoring trailing spaces.\n\nWrite: function solve(text)", starterCode: "function solve(text) {\n  // your code here\n}", testCases: [{ args: ["Hello World"], expectedOutput: 5 }, { args: ["   fly me   to   the moon  "], expectedOutput: 4 }, { args: ["a"], expectedOutput: 1, hidden: true }, { args: [""], expectedOutput: 0, hidden: true }] },
  { title: "Plus One", statement: "Given a non-empty array of digits representing a non-negative integer, increment the number by one and return the result as an array.\n\nWrite: function solve(digits)", starterCode: "function solve(digits) {\n  // your code here\n}", testCases: [{ args: [[1, 2, 3]], expectedOutput: [1, 2, 4] }, { args: [[9, 9]], expectedOutput: [1, 0, 0] }, { args: [[4, 3, 2, 1]], expectedOutput: [4, 3, 2, 2], hidden: true }, { args: [[0]], expectedOutput: [1], hidden: true }] },
  { title: "Best Time to Buy and Sell Stock", statement: "Given prices, find the maximum profit by selecting one buy and one sell day.\n\nWrite: function solve(prices)", starterCode: "function solve(prices) {\n  // your code here\n}", testCases: [{ args: [[7, 1, 5, 3, 6, 4]], expectedOutput: 5 }, { args: [[7, 6, 4, 3, 1]], expectedOutput: 0 }, { args: [[2, 4, 1]], expectedOutput: 2, hidden: true }, { args: [[1, 2]], expectedOutput: 1, hidden: true }] },
  { title: "Contains Duplicate", statement: "Return true if any value appears at least twice and false otherwise.\n\nWrite: function solve(values)", starterCode: "function solve(values) {\n  // your code here\n}", testCases: [{ args: [[1, 2, 3, 1]], expectedOutput: true }, { args: [[1, 2, 3, 4]], expectedOutput: false }, { args: [[-1, -1]], expectedOutput: true, hidden: true }, { args: [[]], expectedOutput: false, hidden: true }] },
  { title: "Single Number", statement: "Return the unique number that appears exactly once while every other number appears twice.\n\nWrite: function solve(values)", starterCode: "function solve(values) {\n  // your code here\n}", testCases: [{ args: [[2, 2, 1]], expectedOutput: 1 }, { args: [[4, 1, 2, 1, 2]], expectedOutput: 4 }, { args: [[0]], expectedOutput: 0, hidden: true }, { args: [[1, 2, 3, 2, 1]], expectedOutput: 3, hidden: true }] },
  { title: "Group Anagrams", statement: "Group the strings by anagram classification and return the groups as arrays.\n\nWrite: function solve(words)", starterCode: "function solve(words) {\n  // your code here\n}", testCases: [{ args: [["eat", "tea", "tan", "ate", "nat", "bat"]], expectedOutput: [["eat","tea","ate"],["tan","nat"],["bat"]] }, { args: [[""], ["a"]], expectedOutput: [[""],["a"]] }, { args: [["ab", "ba"]], expectedOutput: [["ab","ba"]], hidden: true }, { args: [["abc", "cba", "cab"]], expectedOutput: [["abc","cba","cab"]], hidden: true }] },
  { title: "Valid Sudoku", statement: "Return true when a 9x9 board is valid according to Sudoku rules.\n\nWrite: function solve(board)", starterCode: "function solve(board) {\n  // your code here\n}", testCases: [{ args: [[['5','3','.','.','7','.','.','.','.'],['6','.','.','1','9','5','.','.','.'],['.','9','8','.','.','.','.','6','.'],['8','.','.','.','6','.','.','.','3'],['4','.','.','8','.','3','.','.','1'],['7','.','.','.','2','.','.','.','6'],['.','6','.','.','.','.','2','8','.'],['.','.','.','4','1','9','.','.','5'],['.','.','.','.','8','.','.','7','9']]], expectedOutput: true }, { args: [[['8','3','.','.','7','.','.','.','.'],['6','.','.','1','9','5','.','.','.'],['.','9','8','.','.','.','.','6','.'],['8','.','.','.','6','.','.','.','3'],['4','.','.','8','.','3','.','.','1'],['7','.','.','.','2','.','.','.','6'],['.','6','.','.','.','.','2','8','.'],['.','.','.','4','1','9','.','.','5'],['.','.','.','.','8','.','.','7','9']]], expectedOutput: false }, { args: [[['5','3','.','.','7','.','.','.'],['6','.','.','1','9','5','.','.','.'],['.','9','8','.','.','.','.','6','.'],['8','.','.','.','6','.','.','3'],['4','.','.','8','.','3','.','.','1'],['7','.','.','.','2','.','.','.','6'],['.','6','.','.','.','.','2','8','.'],['.','.','.','4','1','9','.','.','5'],['.','.','.','.','8','.','.','7','9']]], expectedOutput: false, hidden: true }] },
  { title: "Top K Frequent", statement: "Return the k most frequent elements in the array, ordered by frequency descending.\n\nWrite: function solve(values, k)", starterCode: "function solve(values, k) {\n  // your code here\n}", testCases: [{ args: [[1, 1, 1, 2, 2, 3], 2], expectedOutput: [1, 2] }, { args: [[-1, -1], 1], expectedOutput: [-1] }, { args: [[1, 2, 3], 1], expectedOutput: [1], hidden: true }, { args: [[4, 4, 5, 5, 6], 2], expectedOutput: [4, 5], hidden: true }] },
  { title: "Product of Array Except Self", statement: "Return a new array where each element is the product of all values except itself.\n\nWrite: function solve(values)", starterCode: "function solve(values) {\n  // your code here\n}", testCases: [{ args: [[1, 2, 3, 4]], expectedOutput: [24, 12, 8, 6] }, { args: [[-1, 1, 0, -3, 3]], expectedOutput: [0, 0, 9, 0, 0] }, { args: [[2, 3]], expectedOutput: [3, 2], hidden: true }, { args: [[0, 0]], expectedOutput: [0, 0], hidden: true }] },
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
  }

  await prisma.bugQuestion.deleteMany({ where: { contestId: contest.id } });
  let bugOrder = 1;
  for (const bug of BUG_QUESTIONS) {
    await prisma.bugQuestion.create({
      data: { ...bug, order: bugOrder++, contestId: contest.id },
    });
  }

  const existingProblemCount = await prisma.codingProblem.count({ where: { contestId: contest.id } });
  if (existingProblemCount === 0) {
    let problemOrder = 1;
    for (const problem of CODING_PROBLEMS) {
      await prisma.codingProblem.create({
        data: { ...problem, order: problemOrder++, contestId: contest.id },
      });
    }
  }

  const participantCount = await prisma.participant.count({ where: { contestId: contest.id } });
  if (participantCount === 0) {
    await prisma.participant.createMany({
      data: [
        { contestId: contest.id, name: "Participant One", accessCode: "CB-0001" },
        { contestId: contest.id, name: "Participant Two", accessCode: "CB-0002" },
        { contestId: contest.id, name: "Participant Three", accessCode: "CB-0003" },
      ],
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });