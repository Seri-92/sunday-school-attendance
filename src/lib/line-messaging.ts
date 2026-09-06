import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendanceNotifications } from "@/db/schema";
import { buildAttendanceMessage, type AttendanceNotificationKind } from "@/lib/attendance-notifications";
import { deliverLineNotification, sendLineMessage } from "@/lib/line-delivery";

export async function sendAttendanceNotificationOnce(params: {
  schoolYearId: string;
  date: string;
  kind: AttendanceNotificationKind;
}) {
  const recipient = process.env.LINE_ATTENDANCE_GROUP_ID;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!recipient || !token) throw new Error("LINE notification environment is not configured");

  // Persist the key, recipient and exact message BEFORE calling LINE so a process
  // crash or failed DB commit can retry the same request, never a new one.
  await db.insert(attendanceNotifications).values({
    ...params,
    recipient,
    message: buildAttendanceMessage(params.date, params.kind),
  }).onConflictDoNothing();

  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(attendanceNotifications).where(and(
      eq(attendanceNotifications.schoolYearId, params.schoolYearId),
      eq(attendanceNotifications.date, params.date),
      eq(attendanceNotifications.kind, params.kind),
    )).for("update");
    if (!row) throw new Error("Notification intent not found");

    // Concurrent saves serialize on this row; the next caller sees sentAt.
    await deliverLineNotification({
      to: row.recipient, text: row.message, retryKey: row.id,
      createdAt: row.createdAt, sentAt: row.sentAt,
    }, {
      now: new Date(),
      send: (message) => sendLineMessage(message, token),
      markSent: async () => {
        await tx.update(attendanceNotifications).set({ sentAt: new Date() }).where(eq(attendanceNotifications.id, row.id));
      },
    });
  });
}
