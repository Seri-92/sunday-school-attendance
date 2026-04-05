"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { requireAdminTeacher } from "@/lib/auth/admin";
import { parseCreateTeacherInput } from "./form";

function buildAdminUrl(params: { error?: string; notice?: string }) {
  const searchParams = new URLSearchParams();

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();

  return query ? `/admin?${query}` : "/admin";
}

export async function createTeacherAction(formData: FormData) {
  await requireAdminTeacher();

  const parsed = parseCreateTeacherInput(formData);

  if (!parsed.ok) {
    redirect(buildAdminUrl({ error: parsed.error }));
  }

  const { active, email, name, role } = parsed.data;
  const [existingTeacher] = await db
    .select({
      email: teachers.email,
      id: teachers.id,
      name: teachers.name,
    })
    .from(teachers)
    .where(sql`lower(${teachers.email}) = ${email}`)
    .limit(1);

  if (existingTeacher) {
    redirect(
      buildAdminUrl({
        error: `${existingTeacher.email} はすでに ${existingTeacher.name} として登録されています。`,
      }),
    );
  }

  await db.insert(teachers).values({
    active,
    email,
    name,
    role,
  });

  revalidatePath("/admin");
  redirect(buildAdminUrl({ notice: `${name} を教師として登録しました。` }));
}
