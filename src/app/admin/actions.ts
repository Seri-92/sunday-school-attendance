"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminTeacher } from "@/lib/auth/admin";
import { registerTeacher } from "./create-teacher";
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

  const { name } = parsed.data;
  const result = await registerTeacher(parsed.data);

  if (!result.ok) {
    redirect(buildAdminUrl({ error: result.error }));
  }

  revalidatePath("/admin");
  redirect(buildAdminUrl({ notice: `${name} を教師として登録しました。` }));
}
