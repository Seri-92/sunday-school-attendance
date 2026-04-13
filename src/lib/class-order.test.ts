import assert from "node:assert/strict";
import test from "node:test";
import { sortClassesByDisplayOrder } from "./class-order";

test("sortClassesByDisplayOrder orders by sort order and then by name", () => {
  const classes = [
    {
      id: "class-3",
      name: "中学科",
      sortOrder: 30,
    },
    {
      id: "class-2",
      name: "3・4年",
      sortOrder: 20,
    },
    {
      id: "class-1",
      name: "1・2年",
      sortOrder: 20,
    },
  ];

  assert.deepEqual(sortClassesByDisplayOrder(classes), [
    {
      id: "class-1",
      name: "1・2年",
      sortOrder: 20,
    },
    {
      id: "class-2",
      name: "3・4年",
      sortOrder: 20,
    },
    {
      id: "class-3",
      name: "中学科",
      sortOrder: 30,
    },
  ]);
});
