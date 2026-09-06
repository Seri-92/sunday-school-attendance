import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceDates,
  attendanceExtraCounts,
  attendanceRecords,
  classes,
  studentClassAssignments,
  weeklyAttendanceExtraCounts,
} from "@/db/schema";
import { getActiveSchoolYear } from "@/lib/attendance";
import {
  isAttendanceReminderDateInScope,
  isAttendanceReminderRequired,
} from "@/lib/attendance-reminder";

export async function isAttendanceReminderRequiredForDate(date: string) {
  const activeSchoolYear = await getActiveSchoolYear();

  if (!activeSchoolYear) {
    return false;
  }

  if (
    !isAttendanceReminderDateInScope({
      date,
      endDate: activeSchoolYear.endDate,
      startDate: activeSchoolYear.startDate,
    })
  ) {
    return false;
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

  if (!attendanceDate) {
    return isAttendanceReminderRequired({
      attendanceDateId: null,
      attendanceRecords: [],
      classExtraCounts: [],
      classes: classRecords,
      studentClassAssignments: [],
      weeklyExtraCounts: [],
    });
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
  });
}
