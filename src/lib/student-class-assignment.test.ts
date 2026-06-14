import assert from "node:assert/strict";
import test from "node:test";
import { resolveDefaultClassForGrade } from "./student-class-assignment";

test("resolveDefaultClassForGrade chooses the first display-ordered class for the grade", () => {
  const classes = [
    {
      gradeCode: "elementary_2" as const,
      id: "class-elementary-2",
      name: "2年",
      sortOrder: 20,
    },
    {
      gradeCode: "elementary_1" as const,
      id: "class-elementary-1-b",
      name: "1年B",
      sortOrder: 20,
    },
    {
      gradeCode: "elementary_1" as const,
      id: "class-elementary-1-a",
      name: "1年A",
      sortOrder: 10,
    },
  ];

  assert.deepEqual(resolveDefaultClassForGrade(classes, "elementary_1"), {
    gradeCode: "elementary_1",
    id: "class-elementary-1-a",
    name: "1年A",
    sortOrder: 10,
  });
});

test("resolveDefaultClassForGrade returns null when no class matches the grade", () => {
  assert.equal(
    resolveDefaultClassForGrade(
      [
        {
          gradeCode: "elementary_2" as const,
          id: "class-elementary-2",
          name: "2年",
          sortOrder: 20,
        },
      ],
      "elementary_1",
    ),
    null,
  );
});
