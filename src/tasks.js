export const tasks = [
  {
    id: "reverse-string",
    title: "Разворот строки",
    difficulty: "easy",
    description: "Напишите функцию `reverseString(str)`, которая принимает строку в качестве аргумента и возвращает её в перевернутом виде.",
    starterCode: "function reverseString(str) {\n  // Твой код здесь\n  \n}",
    tests: [
      { input: ["hello"], expected: "olleh" },
      { input: ["world"], expected: "dlrow" },
      { input: ["js"], expected: "sj" }
    ]
  },
  {
    id: "filter-array",
    title: "Фильтрация массива",
    difficulty: "easy",
    description: "Напишите функцию `filterPositive(arr)`, которая принимает массив чисел и возвращает новый массив, содержащий только положительные числа (больше 0).",
    starterCode: "function filterPositive(arr) {\n  // Твой код здесь\n  \n}",
    tests: [
      { input: [[1, -2, 3, -4, 5]], expected: [1, 3, 5] },
      { input: [[-1, -2, -3]], expected: [] },
      { input: [[0, 10, 20]], expected: [10, 20] }
    ]
  },
  {
    id: "factorial",
    title: "Факториал числа",
    difficulty: "medium",
    description: "Напишите функцию `factorial(n)`, которая возвращает факториал переданного целого числа $n$. Факториал нуля равен 1.",
    starterCode: "function factorial(n) {\n  // Твой код здесь\n  \n}",
    tests: [
      { input: [5], expected: 120 },
      { input: [3], expected: 6 },
      { input: [0], expected: 1 }
    ]
  }
];