import "server-only";

import { redirect } from "next/navigation";
import type { LinkedTeacher } from "@/lib/attendance";
import { requireSession } from "./session";
import { getAdminTeacherAccess } from "./admin-access";
import { syncTeacherAuthUser } from "./teachers";

export async function requireAdminTeacher(): Promise<LinkedTeacher> {
  const session = await requireSession();
  const linkedTeacher = await syncTeacherAuthUser({
    id: session.user.id,
    email: session.user.email,
  });
  const adminTeacher = getAdminTeacherAccess(linkedTeacher);

  if (!adminTeacher) {
    redirect("/dashboard");
  }

  return adminTeacher;
}
