import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttendanceDraftInitialState,
  buildDashboardHref,
  buildAttendanceEditorItems,
  buildHistoryByDate,
  getAttendanceCounts,
  hasAttendanceDraftChanges,
  type SelectedDateRecord,
} from "./view-model";

test("buildAttendanceEditorItems maps existing records and student metadata", () => {
  const selectedDateRecords = new Map<string, SelectedDateRecord>([
    [
      "student-1",
      {
        note: "発熱のため",
        status: "absent",
      },
    ],
  ]);

  const items = buildAttendanceEditorItems({
    selectedDateRecords,
    students: [
      {
        assignmentType: "manual",
        currentGradeCode: "elementary_3",
        studentId: "student-1",
        studentName: "日曜 太郎",
      },
      {
        assignmentType: "auto",
        currentGradeCode: "elementary_1",
        studentId: "student-2",
        studentName: "日曜 花子",
      },
    ],
  });

  assert.deepEqual(items, [
    {
      defaultNote: "発熱のため",
      defaultStatus: "absent",
      gradeLabel: "小学3年",
      hasExistingRecord: true,
      studentId: "student-1",
      studentName: "日曜 太郎",
    },
    {
      defaultNote: "",
      defaultStatus: "present",
      gradeLabel: "小学1年",
      hasExistingRecord: false,
      studentId: "student-2",
      studentName: "日曜 花子",
    },
  ]);
});

test("getAttendanceCounts returns counts without making unentered negative", () => {
  const counts = getAttendanceCounts({
    selectedDateRecords: [
      { note: "", status: "present" },
      { note: "", status: "absent" },
      { note: "", status: "present" },
    ],
    studentCount: 2,
  });

  assert.deepEqual(counts, {
    absentCount: 1,
    enteredCount: 3,
    presentCount: 2,
    unenteredCount: 0,
  });
});

test("buildAttendanceDraftInitialState uses existing values and defaults missing records", () => {
  const items = buildAttendanceEditorItems({
    selectedDateRecords: new Map<string, SelectedDateRecord>([
      [
        "student-1",
        {
          note: "発熱のため",
          status: "absent",
        },
      ],
    ]),
    students: [
      {
        assignmentType: "manual",
        currentGradeCode: "elementary_3",
        studentId: "student-1",
        studentName: "日曜 太郎",
      },
      {
        assignmentType: "auto",
        currentGradeCode: "elementary_1",
        studentId: "student-2",
        studentName: "日曜 花子",
      },
    ],
  });

  assert.deepEqual(buildAttendanceDraftInitialState(items), {
    "student-1": {
      note: "発熱のため",
      status: "absent",
    },
    "student-2": {
      note: "",
      status: "present",
    },
  });
});

test("hasAttendanceDraftChanges ignores note whitespace but detects status changes", () => {
  const initialState = {
    "student-1": {
      note: "連絡あり",
      status: "present" as const,
    },
    "student-2": {
      note: "",
      status: "absent" as const,
    },
  };

  assert.equal(
    hasAttendanceDraftChanges({
      draftState: {
        "student-1": {
          note: "  連絡あり  ",
          status: "present",
        },
        "student-2": {
          note: "",
          status: "absent",
        },
      },
      initialState,
    }),
    false,
  );

  assert.equal(
    hasAttendanceDraftChanges({
      draftState: {
        "student-1": {
          note: "連絡あり",
          status: "absent",
        },
        "student-2": {
          note: "",
          status: "absent",
        },
      },
      initialState,
    }),
    true,
  );
});

test("buildHistoryByDate aggregates only in-range dates and normalizes legacy absence values", () => {
  const history = buildHistoryByDate({
    records: [
      {
        attendanceDate: "2026-04-05",
        note: null,
        status: "present",
        studentId: "student-1",
      },
      {
        attendanceDate: "2026-04-05",
        note: "連絡あり",
        status: "excused",
        studentId: "student-2",
      },
      {
        attendanceDate: "2026-04-12",
        note: null,
        status: "absent",
        studentId: "student-1",
      },
      {
        attendanceDate: "2026-05-03",
        note: null,
        status: "present",
        studentId: "student-3",
      },
    ],
    sundays: ["2026-04-05", "2026-04-12"],
  });

  assert.deepEqual(history.get("2026-04-05"), {
    absent: 1,
    enteredCount: 2,
    present: 1,
  });
  assert.deepEqual(history.get("2026-04-12"), {
    absent: 1,
    enteredCount: 1,
    present: 0,
  });
  assert.equal(history.has("2026-05-03"), false);
});

test("buildDashboardHref keeps only provided dashboard params", () => {
  assert.equal(
    buildDashboardHref({
      classId: "class-1",
      date: "2026-04-05",
      tab: "attendance",
    }),
    "/dashboard?tab=attendance&classId=class-1&date=2026-04-05",
  );

  assert.equal(
    buildDashboardHref({
      classId: "class-1",
    }),
    "/dashboard?classId=class-1",
  );
});
