import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuardianAttendanceExtraInput,
  buildJuniorHighOtherAttendanceExtraInput,
  getWeeklyAttendanceGroup,
  isWeeklyAttendanceGroup,
  parseAttendanceExtraHeadcount,
  supportsJuniorHighOtherAttendanceExtra,
} from "./attendance-extra";

test("buildGuardianAttendanceExtraInput builds elementary group input by default", () => {
  assert.deepEqual(buildGuardianAttendanceExtraInput({}), {
    category: "guardian",
    defaultValue: 0,
    description: "幼小科全体の保護者の人数を記録します。",
    group: "elementary",
    hasExistingValue: false,
    label: "幼小科の保護者",
    name: "guardianCount",
  });

  assert.deepEqual(
    buildGuardianAttendanceExtraInput({
      existingCount: 4,
      group: "junior_high",
    }),
    {
      category: "guardian",
      defaultValue: 4,
      description: "中学科全体の保護者の人数を記録します。",
      group: "junior_high",
      hasExistingValue: true,
      label: "中学科の保護者",
      name: "guardianCount",
    },
  );
});

test("getWeeklyAttendanceGroup treats the junior high class separately", () => {
  assert.equal(
    getWeeklyAttendanceGroup({
      className: "中学科",
      gradeCode: "junior_high_1",
    }),
    "junior_high",
  );

  assert.equal(
    getWeeklyAttendanceGroup({
      className: "5・6年",
      gradeCode: "elementary_5",
    }),
    "elementary",
  );
});

test("isWeeklyAttendanceGroup accepts only supported weekly groups", () => {
  assert.equal(isWeeklyAttendanceGroup("elementary"), true);
  assert.equal(isWeeklyAttendanceGroup("junior_high"), true);
  assert.equal(isWeeklyAttendanceGroup("guardian"), false);
});

test("supportsJuniorHighOtherAttendanceExtra returns true only for the junior high class", () => {
  assert.equal(
    supportsJuniorHighOtherAttendanceExtra({
      className: "中学科",
      gradeCode: "junior_high_1",
    }),
    true,
  );

  assert.equal(
    supportsJuniorHighOtherAttendanceExtra({
      className: "5・6年",
      gradeCode: "elementary_5",
    }),
    false,
  );
});

test("buildJuniorHighOtherAttendanceExtraInput only returns a record for the junior high class", () => {
  assert.deepEqual(
    buildJuniorHighOtherAttendanceExtraInput({
      className: "中学科",
      gradeCode: "junior_high_1",
    }),
    {
      category: "junior_high_other",
      defaultValue: 0,
      description: "中学科の出席と一緒に、その他人数を記録します。",
      hasExistingValue: false,
      label: "その他",
      name: "juniorHighOtherCount",
    },
  );

  assert.deepEqual(
    buildJuniorHighOtherAttendanceExtraInput({
      className: "中学科",
      existingCount: 2,
      gradeCode: "junior_high_1",
    }),
    {
      category: "junior_high_other",
      defaultValue: 2,
      description: "中学科の出席と一緒に、その他人数を記録します。",
      hasExistingValue: true,
      label: "その他",
      name: "juniorHighOtherCount",
    },
  );

  assert.equal(
    buildJuniorHighOtherAttendanceExtraInput({
      className: "1・2年",
      existingCount: 8,
      gradeCode: "elementary_1",
    }),
    null,
  );
});

test("parseAttendanceExtraHeadcount accepts blank and integer values", () => {
  assert.equal(parseAttendanceExtraHeadcount(undefined), 0);
  assert.equal(parseAttendanceExtraHeadcount(""), 0);
  assert.equal(parseAttendanceExtraHeadcount("0"), 0);
  assert.equal(parseAttendanceExtraHeadcount("12"), 12);
});

test("parseAttendanceExtraHeadcount rejects negative, decimal, and non-numeric values", () => {
  assert.equal(parseAttendanceExtraHeadcount("-1"), null);
  assert.equal(parseAttendanceExtraHeadcount("1.5"), null);
  assert.equal(parseAttendanceExtraHeadcount("abc"), null);
});
