import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceDates,
  attendanceExtraCounts,
  attendanceRecords,
  classes,
  schoolYears,
  studentClassAssignments,
  weeklyAttendanceExtraCounts,
} from "@/db/schema";
import type { AttendanceState } from "@/lib/attendance-notifications";
import {
  isAttendanceReminderDateInScope,
  isAttendanceReminderRequired,
} from "@/lib/attendance-reminder";

export async function getAttendanceStateForDate(date: string, schoolYearId: string): Promise<AttendanceState> {
  const [activeSchoolYear] = await db.select().from(schoolYears).where(eq(schoolYears.id, schoolYearId)).limit(1);

  if (!activeSchoolYear) {
    return "not_applicable";
  }

  if (
    !isAttendanceReminderDateInScope({
      date,
      endDate: activeSchoolYear.endDate,
      startDate: activeSchoolYear.startDate,
    })
  ) {
    return "not_applicable";
  }

  const [attendanceDate] = await db
    .select({ id: attendanceDates.id })
    .from(attendanceDates)
    .where(
      and(
        eq(attendanceDates.schoolYearId, activeSchoolYear.id),
        eq(attendanceDates.date, date),
      ),
    )
    .limit(1);

  const classRecords = await db
    .select({
      gradeCode: classes.gradeCode,
      id: classes.id,
      name: classes.name,
    })
    .from(classes)
    .where(eq(classes.schoolYearId, activeSchoolYear.id));

  if (classRecords.length === 0) return "not_applicable";

  if (!attendanceDate) {
    return "incomplete";
  }

  const [studentAssignments, records, classExtraCounts, weeklyExtraCounts] =
    await Promise.all([
      db
        .select({
          classId: studentClassAssignments.classId,
          studentId: studentClassAssignments.studentId,
        })
        .from(studentClassAssignments)
        .where(eq(studentClassAssignments.schoolYearId, activeSchoolYear.id)),
      db
        .select({ studentId: attendanceRecords.studentId })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.attendanceDateId, attendanceDate.id)),
      db
        .select({
          category: attendanceExtraCounts.category,
          classId: attendanceExtraCounts.classId,
        })
        .from(attendanceExtraCounts)
        .where(eq(attendanceExtraCounts.attendanceDateId, attendanceDate.id)),
      db
        .select({
          category: weeklyAttendanceExtraCounts.category,
          group: weeklyAttendanceExtraCounts.group,
        })
        .from(weeklyAttendanceExtraCounts)
        .where(eq(weeklyAttendanceExtraCounts.attendanceDateId, attendanceDate.id)),
    ]);

  return isAttendanceReminderRequired({
    attendanceDateId: attendanceDate.id,
    attendanceRecords: records,
    classExtraCounts,
    classes: classRecords,
    studentClassAssignments: studentAssignments,
    weeklyExtraCounts,
  }) ? "incomplete" : "complete";
}
