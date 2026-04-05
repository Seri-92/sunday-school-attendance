import { teacherRoleValues, type TeacherRole } from "@/db/schema";

export type CreateTeacherInput = {
  active: boolean;
  email: string;
  name: string;
  role: TeacherRole;
};

type ParseSuccess = {
  data: CreateTeacherInput;
  ok: true;
};

type ParseFailure = {
  error: string;
  ok: false;
};

function isTeacherRole(value: string): value is TeacherRole {
  return teacherRoleValues.includes(value as TeacherRole);
}

export function parseCreateTeacherInput(formData: FormData): ParseSuccess | ParseFailure {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const active = String(formData.get("active") ?? "") === "on";

  if (!name) {
    return {
      error: "教師名を入力してください。",
      ok: false,
    };
  }

  if (!email) {
    return {
      error: "メールアドレスを入力してください。",
      ok: false,
    };
  }

  if (!email.includes("@")) {
    return {
      error: "メールアドレスの形式が不正です。",
      ok: false,
    };
  }

  if (!isTeacherRole(role)) {
    return {
      error: "権限の指定が不正です。",
      ok: false,
    };
  }

  return {
    data: {
      active,
      email,
      name,
      role,
    },
    ok: true,
  };
}
