import type { LinkedTeacher } from "@/lib/attendance";
import type { syncTeacherAuthUser } from "./teachers";

export type LinkedTeacherResult = Awaited<ReturnType<typeof syncTeacherAuthUser>>;

export function getAdminTeacherAccess(result: LinkedTeacherResult): LinkedTeacher | null {
  if (result.status !== "linked") {
    return null;
  }

  if (result.teacher.role !== "admin" || !result.teacher.active) {
    return null;
  }

  return result.teacher;
}
