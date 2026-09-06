import "server-only";

import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendanceNotifications } from "@/db/schema";
import { runAttendanceNotifications } from "@/lib/attendance-notifications";
import { getAttendanceStateForDate } from "@/lib/attendance-reminder-service";
import { sendAttendanceNotificationOnce } from "@/lib/line-messaging";

export async function notifyAttendanceForWeek(schoolYearId: string, date: string, trigger: "cron" | "save") {
  await runAttendanceNotifications(trigger, {
    getState: () => getAttendanceStateForDate(date, schoolYearId),
    hasReminder: async () => {
      const [row] = await db.select({ id: attendanceNotifications.id }).from(attendanceNotifications).where(and(
        eq(attendanceNotifications.schoolYearId, schoolYearId),
        eq(attendanceNotifications.date, date),
        eq(attendanceNotifications.kind, "reminder"),
      )).limit(1);
      return Boolean(row);
    },
    sendOnce: (kind) => sendAttendanceNotificationOnce({ schoolYearId, date, kind }),
  });
}

// Register only after the attendance transaction commits. A redirect still runs after().
export function checkAttendanceCompletionAfterSave(schoolYearId: string, date: string) {
  after(async () => {
    try {
      await notifyAttendanceForWeek(schoolYearId, date, "save");
    } catch (error) {
      // Attendance has already been saved; delivery failures must not fail the form.
      console.error("Attendance notification failed", {
        schoolYearId, date,
        error: error instanceof Error ? error.message : "Unknown notification failure",
      });
    }
  });
}
