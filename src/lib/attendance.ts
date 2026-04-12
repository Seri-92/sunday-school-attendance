import "server-only";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceDates,
  attendanceExtraCounts,
  attendanceRecords,
  classTeacherAssignments,
  classes,
  schoolYears,
  studentClassAssignments,
  students,
  teachers,
  weeklyAttendanceExtraCounts,
} from "@/db/schema";
import { shouldFilterClassesByAssignment } from "@/lib/class-access";
import { buildStudentName, buildStudentNameKana } from "@/lib/students";
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
  if (!shouldFilterClassesByAssignment(teacher.role)) {
    return db
      .select()
      .from(classes)
      .where(eq(classes.schoolYearId, schoolYearId))
      .orderBy(asc(classes.name));
  }

  return db
    .select({
      id: classes.id,
      schoolYearId: classes.schoolYearId,
      name: classes.name,
      gradeCode: classes.gradeCode,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
    })
    .from(classes)
    .innerJoin(
      classTeacherAssignments,
      eq(classTeacherAssignments.classId, classes.id),
    )
    .where(
      and(
        eq(classes.schoolYearId, schoolYearId),
        eq(classTeacherAssignments.teacherId, teacher.id),
      ),
    )
    .orderBy(asc(classes.name));
}

export async function getAuthorizedClass(
  teacher: LinkedTeacher,
  schoolYearId: string,
  classId: string,
) {
  const [classRecord] = await db
    .select({
      id: classes.id,
      schoolYearId: classes.schoolYearId,
      name: classes.name,
      gradeCode: classes.gradeCode,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
    })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolYearId, schoolYearId)))
    .limit(1);

  if (!classRecord || !shouldFilterClassesByAssignment(teacher.role)) {
    return classRecord ?? null;
  }

  const [assignment] = await db
    .select({ classId: classTeacherAssignments.classId })
    .from(classTeacherAssignments)
    .where(
      and(
        eq(classTeacherAssignments.classId, classId),
        eq(classTeacherAssignments.teacherId, teacher.id),
      ),
    )
    .limit(1);

  if (!assignment) {
    return null;
  }

  return classRecord ?? null;
}

export async function getClassStudents(classId: string, schoolYearId: string) {
  const classStudents = await db
    .select({
      assignmentId: studentClassAssignments.id,
      gradeCode: studentClassAssignments.gradeCode,
      studentId: students.id,
      lastName: students.lastName,
      firstName: students.firstName,
      lastNameKana: students.lastNameKana,
      firstNameKana: students.firstNameKana,
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
    .orderBy(
      asc(students.lastNameKana),
      asc(students.firstNameKana),
      asc(students.lastName),
      asc(students.firstName),
    );

  return classStudents.map((student) => ({
    active: student.active,
    assignmentId: student.assignmentId,
    firstName: student.firstName,
    firstNameKana: student.firstNameKana,
    gradeCode: student.gradeCode,
    lastName: student.lastName,
    lastNameKana: student.lastNameKana,
    studentId: student.studentId,
    studentName: buildStudentName(student),
    studentNameKana: buildStudentNameKana(student),
  }));
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

export async function getClassAttendanceExtraCounts(
  classId: string,
  schoolYearId: string,
  date: string,
) {
  return db
    .select({
      category: attendanceExtraCounts.category,
      classId: attendanceExtraCounts.classId,
      headcount: attendanceExtraCounts.headcount,
    })
    .from(attendanceExtraCounts)
    .innerJoin(attendanceDates, eq(attendanceExtraCounts.attendanceDateId, attendanceDates.id))
    .where(
      and(
        eq(attendanceExtraCounts.classId, classId),
        eq(attendanceDates.schoolYearId, schoolYearId),
        eq(attendanceDates.date, date),
      ),
    );
}

export async function getWeeklyAttendanceExtraCounts(
  schoolYearId: string,
  date: string,
) {
  return db
    .select({
      category: weeklyAttendanceExtraCounts.category,
      headcount: weeklyAttendanceExtraCounts.headcount,
    })
    .from(weeklyAttendanceExtraCounts)
    .innerJoin(
      attendanceDates,
      eq(weeklyAttendanceExtraCounts.attendanceDateId, attendanceDates.id),
    )
    .where(
      and(
        eq(attendanceDates.schoolYearId, schoolYearId),
        eq(attendanceDates.date, date),
      ),
    );
}
