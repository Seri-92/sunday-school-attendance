import { attendanceStatusValues, gradeCodeValues, type AttendanceStatus, type GradeCode } from "@/db/schema";

export const gradeLabels: Record<GradeCode, string> = {
  kindergarten: "幼稚園 / 保育園",
  elementary_1: "小学1年",
  elementary_2: "小学2年",
  elementary_3: "小学3年",
  elementary_4: "小学4年",
  elementary_5: "小学5年",
  elementary_6: "小学6年",
  junior_high_1: "中学1年",
  junior_high_2: "中学2年",
  junior_high_3: "中学3年",
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "出席",
  absent: "欠席",
};

export function isGradeCode(value: string): value is GradeCode {
  return (gradeCodeValues as readonly string[]).includes(value);
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (attendanceStatusValues as readonly string[]).includes(value);
}

export function normalizeAttendanceStatus(value: string): AttendanceStatus {
  if (value === "excused") {
    return "absent";
  }

  return isAttendanceStatus(value) ? value : "present";
}
