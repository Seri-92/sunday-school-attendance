import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGuardianAttendanceExtraInput,
  buildJuniorHighOtherAttendanceExtraInput,
} from "@/lib/attendance-extra";
import {
  buildAttendanceDraftInitialState,
  buildDashboardHref,
  buildAttendanceEditorItems,
  buildAttendanceSummaryBadges,
  buildHistoryByDate,
  buildStudentAttendanceHistory,
  buildWeeklyAttendanceHistory,
  getWeeklyAttendanceHistoryInputBadgeLabel,
  getWeeklyAttendanceHistorySummaryLabel,
  getAttendanceStatusTone,
  getAttendanceCounts,
  hasAttendanceDraftChanges,
  hasAttendanceExtraCountChanges,
  isAttendanceEditorReadonly,
  isWeekAttendanceReadonly,
  resolveDashboardSelectedDate,
  sortStudentsByGrade,
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
        firstName: "太郎",
        firstNameKana: "たろう",
        gradeCode: "elementary_3",
        lastName: "日曜",
        lastNameKana: "にちよう",
        studentId: "student-1",
        studentName: "日曜 太郎",
      },
      {
        firstName: "花子",
        firstNameKana: "はなこ",
        gradeCode: "elementary_1",
        lastName: "日曜",
        lastNameKana: "にちよう",
        studentId: "student-2",
        studentName: "日曜 花子",
      },
    ],
  });

  assert.deepEqual(items, [
    {
      defaultNote: "発熱のため",
      defaultStatus: "absent",
      firstName: "太郎",
      firstNameKana: "たろう",
      gradeLabel: "小学3年",
      hasExistingRecord: true,
      lastName: "日曜",
      lastNameKana: "にちよう",
      studentId: "student-1",
      studentName: "日曜 太郎",
    },
    {
      defaultNote: "",
      defaultStatus: "absent",
      firstName: "花子",
      firstNameKana: "はなこ",
      gradeLabel: "小学1年",
      hasExistingRecord: false,
      lastName: "日曜",
      lastNameKana: "にちよう",
      studentId: "student-2",
      studentName: "日曜 花子",
    },
  ]);
});

test("sortStudentsByGrade orders by grade and then by student kana", () => {
  const students = [
    {
      gradeCode: "junior_high_1" as const,
      studentId: "student-3",
      studentNameKana: "にちよう じろう",
      studentName: "日曜 次郎",
    },
    {
      gradeCode: "elementary_1" as const,
      studentId: "student-2",
      studentNameKana: "にちよう はなこ",
      studentName: "日曜 花子",
    },
    {
      gradeCode: "elementary_1" as const,
      studentId: "student-1",
      studentNameKana: "にちよう たろう",
      studentName: "日曜 太郎",
    },
  ];

  assert.deepEqual(sortStudentsByGrade(students), [
    {
      gradeCode: "elementary_1",
      studentId: "student-1",
      studentNameKana: "にちよう たろう",
      studentName: "日曜 太郎",
    },
    {
      gradeCode: "elementary_1",
      studentId: "student-2",
      studentNameKana: "にちよう はなこ",
      studentName: "日曜 花子",
    },
    {
      gradeCode: "junior_high_1",
      studentId: "student-3",
      studentNameKana: "にちよう じろう",
      studentName: "日曜 次郎",
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

test("getAttendanceStatusTone returns muted but readable tones for attendance states", () => {
  assert.deepEqual(getAttendanceStatusTone("present"), {
    badgeClassName: "border-teal-200 bg-teal-50 text-teal-900",
    optionCheckedClassName:
      "peer-checked:border-teal-700 peer-checked:bg-teal-700 peer-checked:text-white",
    optionIdleClassName: "border-teal-200 bg-white text-teal-900",
    summaryCardClassName: "border-teal-200 bg-teal-50",
    summaryLabelClassName: "text-teal-800",
    summaryValueClassName: "text-teal-950",
  });

  assert.deepEqual(getAttendanceStatusTone("absent"), {
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-900",
    optionCheckedClassName:
      "peer-checked:border-amber-600 peer-checked:bg-amber-600 peer-checked:text-white",
    optionIdleClassName: "border-amber-200 bg-white text-amber-900",
    summaryCardClassName: "border-amber-200 bg-amber-50",
    summaryLabelClassName: "text-amber-800",
    summaryValueClassName: "text-amber-950",
  });

  assert.deepEqual(getAttendanceStatusTone("unentered"), {
    badgeClassName: "border-zinc-200 bg-zinc-50 text-zinc-600",
    optionCheckedClassName: "",
    optionIdleClassName: "",
    summaryCardClassName: "border-zinc-200 bg-zinc-50",
    summaryLabelClassName: "text-zinc-700",
    summaryValueClassName: "text-zinc-950",
  });
});

test("buildAttendanceSummaryBadges returns compact status badges in display order", () => {
  assert.deepEqual(
    buildAttendanceSummaryBadges({
      absentCount: 2,
      enteredCount: 5,
      presentCount: 3,
      unenteredCount: 1,
    }),
    [
      {
        count: 3,
        label: "出席",
        tone: getAttendanceStatusTone("present"),
      },
      {
        count: 2,
        label: "欠席",
        tone: getAttendanceStatusTone("absent"),
      },
      {
        count: 1,
        label: "未入力",
        tone: getAttendanceStatusTone("unentered"),
      },
    ],
  );
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
        firstName: "太郎",
        firstNameKana: "たろう",
        gradeCode: "elementary_3",
        lastName: "日曜",
        lastNameKana: "にちよう",
        studentId: "student-1",
        studentName: "日曜 太郎",
      },
      {
        firstName: "花子",
        firstNameKana: "はなこ",
        gradeCode: "elementary_1",
        lastName: "日曜",
        lastNameKana: "にちよう",
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
      status: "absent",
    },
  });
});

test("isWeekAttendanceReadonly only locks the week tab until full edit mode starts", () => {
  assert.equal(
    isWeekAttendanceReadonly({
      currentTab: "week",
      hasExistingRecords: true,
      isEditingAll: false,
    }),
    true,
  );

  assert.equal(
    isWeekAttendanceReadonly({
      currentTab: "week",
      hasExistingRecords: true,
      isEditingAll: true,
    }),
    false,
  );

  assert.equal(
    isWeekAttendanceReadonly({
      currentTab: "week",
      hasExistingRecords: false,
      isEditingAll: false,
    }),
    false,
  );

  assert.equal(
    isWeekAttendanceReadonly({
      currentTab: "attendance",
      hasExistingRecords: true,
      isEditingAll: false,
    }),
    false,
  );
});

test("isAttendanceEditorReadonly locks entered week and attendance tabs until full edit mode starts", () => {
  assert.equal(
    isAttendanceEditorReadonly({
      currentTab: "attendance",
      hasExistingRecords: true,
      isEditingAll: false,
    }),
    true,
  );

  assert.equal(
    isAttendanceEditorReadonly({
      currentTab: "attendance",
      hasExistingRecords: true,
      isEditingAll: true,
    }),
    false,
  );

  assert.equal(
    isAttendanceEditorReadonly({
      currentTab: "attendance",
      hasExistingRecords: false,
      isEditingAll: false,
    }),
    false,
  );

  assert.equal(
    isAttendanceEditorReadonly({
      currentTab: "students",
      hasExistingRecords: true,
      isEditingAll: false,
    }),
    false,
  );
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

test("hasAttendanceExtraCountChanges only changes when the guardian count changes", () => {
  const extraCountInput = buildGuardianAttendanceExtraInput({
    existingCount: 3,
  });

  assert.equal(
    hasAttendanceExtraCountChanges({
      currentValue: "3",
      extraCountInput,
    }),
    false,
  );

  assert.equal(
    hasAttendanceExtraCountChanges({
      currentValue: "   ",
      extraCountInput: buildJuniorHighOtherAttendanceExtraInput({
        className: "中学科",
        gradeCode: "junior_high_1",
      }),
    }),
    false,
  );

  assert.equal(
    hasAttendanceExtraCountChanges({
      currentValue: "4",
      extraCountInput,
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

test("buildWeeklyAttendanceHistory returns readable weekly present-student summaries", () => {
  const history = buildWeeklyAttendanceHistory({
    records: [
      {
        attendanceDate: "2026-04-05",
        note: null,
        status: "present",
        studentId: "student-3",
      },
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
        attendanceDate: "2026-05-03",
        note: null,
        status: "present",
        studentId: "student-1",
      },
    ],
    students: [
      {
        firstName: "次郎",
        firstNameKana: "じろう",
        gradeCode: "junior_high_1",
        lastName: "日曜",
        lastNameKana: "にちよう",
        studentId: "student-3",
        studentName: "日曜 次郎",
        studentNameKana: "にちよう じろう",
      },
      {
        firstName: "花子",
        firstNameKana: "はなこ",
        gradeCode: "elementary_1",
        lastName: "日曜",
        lastNameKana: "にちよう",
        studentId: "student-2",
        studentName: "日曜 花子",
        studentNameKana: "にちよう はなこ",
      },
      {
        firstName: "太郎",
        firstNameKana: "たろう",
        gradeCode: "elementary_1",
        lastName: "日曜",
        lastNameKana: "にちよう",
        studentId: "student-1",
        studentName: "日曜 太郎",
        studentNameKana: "にちよう たろう",
      },
    ],
    sundays: ["2026-04-05", "2026-04-12"],
  });

  assert.deepEqual(history, [
    {
      absentCount: 1,
      date: "2026-04-05",
      enteredCount: 3,
      presentCount: 2,
      presentStudents: [
        {
          studentId: "student-1",
          studentName: "日曜 太郎",
        },
        {
          studentId: "student-3",
          studentName: "日曜 次郎",
        },
      ],
      unenteredCount: 0,
    },
    {
      absentCount: 0,
      date: "2026-04-12",
      enteredCount: 0,
      presentCount: 0,
      presentStudents: [],
      unenteredCount: 3,
    },
  ]);
});

test("weekly attendance history labels omit unentered headcounts and student-count denominators", () => {
  const week = {
    absentCount: 2,
    enteredCount: 7,
    presentCount: 5,
  };

  assert.equal(
    getWeeklyAttendanceHistorySummaryLabel(week),
    "出席 5 名 / 欠席 2 名",
  );
  assert.equal(getWeeklyAttendanceHistoryInputBadgeLabel(week), "7 名入力");
  assert.equal(
    getWeeklyAttendanceHistoryInputBadgeLabel({
      enteredCount: 0,
    }),
    "入力なし",
  );
});

test("buildStudentAttendanceHistory returns one student's records in sunday order", () => {
  const history = buildStudentAttendanceHistory({
    records: [
      {
        attendanceDate: "2026-04-05",
        note: "少し遅刻",
        status: "present",
        studentId: "student-1",
      },
      {
        attendanceDate: "2026-04-05",
        note: "別生徒のメモ",
        status: "absent",
        studentId: "student-2",
      },
      {
        attendanceDate: "2026-04-19",
        note: "連絡あり",
        status: "absent",
        studentId: "student-1",
      },
    ],
    studentId: "student-1",
    sundays: ["2026-04-05", "2026-04-12", "2026-04-19"],
  });

  assert.deepEqual(history, [
    {
      date: "2026-04-05",
      note: "少し遅刻",
      status: "present",
    },
    {
      date: "2026-04-12",
      note: "",
      status: "unentered",
    },
    {
      date: "2026-04-19",
      note: "連絡あり",
      status: "absent",
    },
  ]);
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

test("buildDashboardHref includes studentId only when provided", () => {
  assert.equal(
    buildDashboardHref({
      classId: "class-1",
      studentId: "student-1",
      tab: "students",
    }),
    "/dashboard?tab=students&classId=class-1&studentId=student-1",
  );

  assert.equal(
    buildDashboardHref({
      classId: "class-1",
      tab: "students",
    }),
    "/dashboard?tab=students&classId=class-1",
  );
});

test("buildDashboardHref omits date for week tab", () => {
  assert.equal(
    buildDashboardHref({
      classId: "class-1",
      date: "2026-04-05",
      tab: "week",
    }),
    "/dashboard?tab=week&classId=class-1",
  );
});

test("resolveDashboardSelectedDate ignores date query on week tab", () => {
  assert.equal(
    resolveDashboardSelectedDate({
      currentTab: "week",
      defaultDate: "2026-05-10",
      requestedDate: "2026-04-05",
      sundays: ["2026-04-05", "2026-05-10"],
    }),
    "2026-05-10",
  );
});

test("resolveDashboardSelectedDate keeps valid date query outside week tab", () => {
  assert.equal(
    resolveDashboardSelectedDate({
      currentTab: "attendance",
      defaultDate: "2026-05-10",
      requestedDate: "2026-04-05",
      sundays: ["2026-04-05", "2026-05-10"],
    }),
    "2026-04-05",
  );
});
