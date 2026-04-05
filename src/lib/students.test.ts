import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudentName,
  buildStudentNameKana,
  compareStudentNames,
} from "./students";

test("buildStudentName joins last and first name with a space", () => {
  assert.equal(
    buildStudentName({
      firstName: "花子",
      lastName: "山田",
    }),
    "山田 花子",
  );
});

test("buildStudentName omits blank first name for migrated records", () => {
  assert.equal(
    buildStudentName({
      firstName: "",
      lastName: "山田 花子",
    }),
    "山田 花子",
  );
});

test("buildStudentNameKana joins last and first kana with a space", () => {
  assert.equal(
    buildStudentNameKana({
      firstNameKana: "はなこ",
      lastNameKana: "やまだ",
    }),
    "やまだ はなこ",
  );
});

test("compareStudentNames sorts by kana before display name", () => {
  const students = [
    {
      firstName: "花子",
      firstNameKana: "はなこ",
      lastName: "山田",
      lastNameKana: "やまだ",
    },
    {
      firstName: "一郎",
      firstNameKana: "いちろう",
      lastName: "田中",
      lastNameKana: "たなか",
    },
  ];

  students.sort(compareStudentNames);

  assert.deepEqual(students, [
    {
      firstName: "一郎",
      firstNameKana: "いちろう",
      lastName: "田中",
      lastNameKana: "たなか",
    },
    {
      firstName: "花子",
      firstNameKana: "はなこ",
      lastName: "山田",
      lastNameKana: "やまだ",
    },
  ]);
});
