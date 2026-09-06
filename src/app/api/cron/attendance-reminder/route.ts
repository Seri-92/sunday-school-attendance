import { getActiveSchoolYear, getIsoDateInJapan } from "@/lib/attendance";
import { notifyAttendanceForWeek } from "@/lib/attendance-notification-service";
import { isCronRequestAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = getIsoDateInJapan();
  const schoolYear = await getActiveSchoolYear();
  if (!schoolYear) return Response.json({ checked: false });
  await notifyAttendanceForWeek(schoolYear.id, date, "cron");
  return Response.json({ checked: true });
}
