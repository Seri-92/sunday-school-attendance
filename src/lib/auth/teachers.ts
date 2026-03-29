import "server-only";

import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";

type AuthUser = {
  id: string;
  email: string;
};

type LinkedTeacherResult =
  | {
      status: "linked";
      teacher: typeof teachers.$inferSelect;
    }
  | {
      status: "inactive";
      teacher: typeof teachers.$inferSelect;
    }
  | {
      status: "missing";
      email: string;
    }
  | {
      status: "conflict";
      email: string;
      existingAuthUserId: string;
    };

export async function syncTeacherAuthUser(
  user: AuthUser,
): Promise<LinkedTeacherResult> {
  const normalizedEmail = user.email.trim().toLowerCase();

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(sql`lower(${teachers.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!teacher) {
    return {
      status: "missing",
      email: normalizedEmail,
    };
  }

  if (teacher.authUserId && teacher.authUserId !== user.id) {
    return {
      status: "conflict",
      email: normalizedEmail,
      existingAuthUserId: teacher.authUserId,
    };
  }

  if (!teacher.authUserId) {
    await db
      .update(teachers)
      .set({
        authUserId: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teachers.id, teacher.id),
          sql`lower(${teachers.email}) = ${normalizedEmail}`,
          or(isNull(teachers.authUserId), eq(teachers.authUserId, user.id)),
        ),
      );
  }

  const [refreshedTeacher] = await db
    .select()
    .from(teachers)
    .where(
      and(
        eq(teachers.id, teacher.id),
        or(eq(teachers.authUserId, user.id), isNull(teachers.authUserId)),
      ),
    )
    .limit(1);

  if (!refreshedTeacher) {
    const [conflictedTeacher] = await db
      .select()
      .from(teachers)
      .where(and(eq(teachers.id, teacher.id), ne(teachers.authUserId, user.id)))
      .limit(1);

    return {
      status: "conflict",
      email: normalizedEmail,
      existingAuthUserId: conflictedTeacher?.authUserId ?? "unknown",
    };
  }

  if (!refreshedTeacher.active) {
    return {
      status: "inactive",
      teacher: refreshedTeacher,
    };
  }

  return {
    status: "linked",
    teacher: refreshedTeacher,
  };
}
