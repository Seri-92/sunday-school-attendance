import { getIsoDateInJapan } from "@/lib/attendance";
import { isAttendanceReminderRequiredForDate } from "@/lib/attendance-reminder-service";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { sendAttendanceReminder } from "@/lib/line-messaging";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = getIsoDateInJapan();
  const shouldSendReminder = await isAttendanceReminderRequiredForDate(date);

  if (!shouldSendReminder) {
    return Response.json({ sent: false });
  }

  await sendAttendanceReminder(date);

  return Response.json({ sent: true });
}
