import assert from "node:assert/strict";
import test from "node:test";
import {
  isAttendanceReminderDateInScope,
  isAttendanceReminderRequired,
} from "./attendance-reminder";

const completeReminderInput = {
  attendanceDateId: "attendance-date-1",
  attendanceRecords: [{ studentId: "student-1" }],
  classExtraCounts: [{ category: "junior_high_other" as const, classId: "class-1" }],
  classes: [
    {
      gradeCode: "junior_high_1" as const,
      id: "class-1",
      name: "中学科",
    },
  ],
  studentClassAssignments: [{ classId: "class-1", studentId: "student-1" }],
  weeklyExtraCounts: [
    { category: "guardian" as const, group: "elementary" as const },
    { category: "guardian" as const, group: "junior_high" as const },
  ],
};

test("isAttendanceReminderRequired returns false when every required input is present", () => {
  assert.equal(isAttendanceReminderRequired(completeReminderInput), false);
});

test("isAttendanceReminderDateInScope accepts only Sundays within the active school year", () => {
  assert.equal(
    isAttendanceReminderDateInScope({
      date: "2026-04-05",
      endDate: "2027-03-31",
      startDate: "2026-04-01",
    }),
    true,
  );
  assert.equal(
    isAttendanceReminderDateInScope({
      date: "2026-04-06",
      endDate: "2027-03-31",
      startDate: "2026-04-01",
    }),
    false,
  );
});

test("isAttendanceReminderRequired returns true when no attendance date was created", () => {
  assert.equal(
    isAttendanceReminderRequired({
      ...completeReminderInput,
      attendanceDateId: null,
    }),
    true,
  );
});

test("isAttendanceReminderRequired returns true when a student attendance is missing", () => {
  assert.equal(
    isAttendanceReminderRequired({
      ...completeReminderInput,
      attendanceRecords: [],
    }),
    true,
  );
});

test("isAttendanceReminderRequired returns true when either guardian count is missing", () => {
  assert.equal(
    isAttendanceReminderRequired({
      ...completeReminderInput,
      weeklyExtraCounts: [{ category: "guardian", group: "elementary" }],
    }),
    true,
  );
});

test("isAttendanceReminderRequired returns true when the junior high other count is missing", () => {
  assert.equal(
    isAttendanceReminderRequired({
      ...completeReminderInput,
      classExtraCounts: [],
    }),
    true,
  );
});
