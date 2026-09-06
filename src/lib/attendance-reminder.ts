import type {
  AttendanceExtraCategory,
  GradeCode,
  WeeklyAttendanceGroup,
} from "@/db/schema";
import {
  guardianAttendanceExtraCategory,
  juniorHighOtherAttendanceExtraCategory,
  supportsJuniorHighOtherAttendanceExtra,
} from "@/lib/attendance-extra";
import { getSundaysInRange } from "@/lib/attendance-date";

export type AttendanceReminderInput = {
  attendanceDateId: string | null;
  attendanceRecords: Array<{ studentId: string }>;
  classExtraCounts: Array<{
    category: AttendanceExtraCategory;
    classId: string;
  }>;
  classes: Array<{
    gradeCode: GradeCode;
    id: string;
    name: string;
  }>;
  studentClassAssignments: Array<{
    classId: string;
    studentId: string;
  }>;
  weeklyExtraCounts: Array<{
    category: AttendanceExtraCategory;
    group: WeeklyAttendanceGroup;
  }>;
};

export function isAttendanceReminderDateInScope(params: {
  date: string;
  endDate: string;
  startDate: string;
}) {
  return getSundaysInRange(params.startDate, params.endDate).includes(params.date);
}

export function isAttendanceReminderRequired(input: AttendanceReminderInput) {
  if (!input.attendanceDateId) {
    return true;
  }

  const recordedStudentIds = new Set(
    input.attendanceRecords.map((record) => record.studentId),
  );
  const enrolledStudentIdsByClass = new Map<string, string[]>();

  for (const assignment of input.studentClassAssignments) {
    const studentIds = enrolledStudentIdsByClass.get(assignment.classId) ?? [];
    studentIds.push(assignment.studentId);
    enrolledStudentIdsByClass.set(assignment.classId, studentIds);
  }

  for (const studentIds of enrolledStudentIdsByClass.values()) {
    if (studentIds.some((studentId) => !recordedStudentIds.has(studentId))) {
      return true;
    }
  }

  const recordedGuardianGroups = new Set(
    input.weeklyExtraCounts
      .filter((record) => record.category === guardianAttendanceExtraCategory)
      .map((record) => record.group),
  );

  for (const group of ["elementary", "junior_high"] as const) {
    if (!recordedGuardianGroups.has(group)) {
      return true;
    }
  }

  const otherCountClassIds = new Set(
    input.classExtraCounts
      .filter((record) => record.category === juniorHighOtherAttendanceExtraCategory)
      .map((record) => record.classId),
  );

  return input.classes.some(
    (classRecord) =>
      supportsJuniorHighOtherAttendanceExtra({
        className: classRecord.name,
        gradeCode: classRecord.gradeCode,
      }) &&
      !otherCountClassIds.has(classRecord.id),
  );
}
