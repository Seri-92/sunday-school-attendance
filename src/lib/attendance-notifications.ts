export type AttendanceNotificationKind = "reminder" | "completion";
export type AttendanceState = "incomplete" | "complete" | "not_applicable";

export function buildAttendanceMessage(date: string, kind: AttendanceNotificationKind) {
  const [, month, day] = date.split("-");
  const label = `${Number(month)}月${Number(day)}日`;
  return kind === "reminder"
    ? `${label}の日曜学校の出席を入力してください。`
    : `${label}の日曜学校の出席入力が完了しています。`;
}

export async function runAttendanceNotifications(
  trigger: "cron" | "save",
  deps: {
    getState: () => Promise<AttendanceState>;
    hasReminder: () => Promise<boolean>;
    sendOnce: (kind: AttendanceNotificationKind) => Promise<void>;
  },
) {
  const hasReminder = await deps.hasReminder();
  if (trigger === "save" && !hasReminder) return;

  const state = await deps.getState();
  if (state === "not_applicable") return;

  if (!hasReminder && !(trigger === "cron" && state === "incomplete")) return;

  // Also reconciles a previously timed-out reminder before sending completion.
  await deps.sendOnce("reminder");
  // A teacher may have saved the final entry while the reminder was being sent.
  if (await deps.getState() === "complete") {
    await deps.sendOnce("completion");
  }
}
