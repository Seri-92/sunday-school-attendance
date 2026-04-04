import "server-only";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceDates,
  attendanceRecords,
  classes,
  schoolYears,
  studentClassAssignments,
  students,
  teachers,
} from "@/db/schema";
export {
  attendanceStatusLabels,
  gradeLabels,
  isAttendanceStatus,
  isGradeCode,
  normalizeAttendanceStatus,
} from "@/lib/attendance-shared";

type TeacherRecord = typeof teachers.$inferSelect;

export type LinkedTeacher = TeacherRecord & {
  role: "admin" | "teacher";
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getSundaysInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T00:00:00+09:00`);
  const offset = (7 - current.getDay()) % 7;

  current.setDate(current.getDate() + offset);

  while (current <= end) {
    dates.push(toIsoDate(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

export function getDefaultAttendanceDate(sundays: string[]) {
  const today = toIsoDate(new Date());
  const latestPastOrToday = [...sundays].reverse().find((date) => date <= today);

  return latestPastOrToday ?? sundays[0] ?? "";
}

export function isAttendanceDateInScope(date: string, sundays: string[]) {
  return isValidIsoDate(date) && sundays.includes(date);
}

export function formatAttendanceDateLabel(date: string) {
  const parsedDate = new Date(`${date}T00:00:00+09:00`);
  const monthDay = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(parsedDate);

  return `${monthDay}（${weekday}）`;
}

export async function getActiveSchoolYear() {
  const [activeYear] = await db
    .select()
    .from(schoolYears)
    .where(eq(schoolYears.isActive, true))
    .orderBy(desc(schoolYears.startDate))
    .limit(1);

  return activeYear ?? null;
}

export async function getTeacherClassesForYear(teacher: LinkedTeacher, schoolYearId: string) {
  const whereClause =
    teacher.role === "admin"
      ? eq(classes.schoolYearId, schoolYearId)
      : and(eq(classes.schoolYearId, schoolYearId), eq(classes.teacherId, teacher.id));

  return db.select().from(classes).where(whereClause).orderBy(asc(classes.name));
}

export async function getAuthorizedClass(
  teacher: LinkedTeacher,
  schoolYearId: string,
  classId: string,
) {
  const [classRecord] = await db
    .select()
    .from(classes)
    .where(
      teacher.role === "admin"
        ? and(eq(classes.id, classId), eq(classes.schoolYearId, schoolYearId))
        : and(
            eq(classes.id, classId),
            eq(classes.schoolYearId, schoolYearId),
            eq(classes.teacherId, teacher.id),
          ),
    )
    .limit(1);

  return classRecord ?? null;
}

export async function getClassStudents(classId: string, schoolYearId: string) {
  return db
    .select({
      assignmentId: studentClassAssignments.id,
      gradeCode: studentClassAssignments.gradeCode,
      studentId: students.id,
      studentName: students.name,
      active: students.active,
    })
    .from(studentClassAssignments)
    .innerJoin(students, eq(studentClassAssignments.studentId, students.id))
    .where(
      and(
        eq(studentClassAssignments.classId, classId),
        eq(studentClassAssignments.schoolYearId, schoolYearId),
      ),
    )
    .orderBy(asc(students.name));
}

export async function getClassAttendanceRecords(
  studentIds: string[],
  schoolYearId: string,
  startDate: string,
  endDate: string,
) {
  if (studentIds.length === 0) {
    return [];
  }

  return db
    .select({
      attendanceDate: attendanceDates.date,
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
      note: attendanceRecords.note,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceDates, eq(attendanceRecords.attendanceDateId, attendanceDates.id))
    .where(
      and(
        eq(attendanceDates.schoolYearId, schoolYearId),
        inArray(attendanceRecords.studentId, studentIds),
        gte(attendanceDates.date, startDate),
        lte(attendanceDates.date, endDate),
      ),
    );
}
