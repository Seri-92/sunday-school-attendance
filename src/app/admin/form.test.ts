import assert from "node:assert/strict";
import test from "node:test";
import { parseCreateTeacherInput } from "./form";

test("parseCreateTeacherInput trims and normalizes valid values", () => {
  const formData = new FormData();
  formData.set("name", "  山田 花子  ");
  formData.set("email", "  ADMIN@Example.COM  ");
  formData.set("role", "admin");
  formData.set("active", "on");

  assert.deepEqual(parseCreateTeacherInput(formData), {
    data: {
      active: true,
      email: "admin@example.com",
      name: "山田 花子",
      role: "admin",
    },
    ok: true,
  });
});

test("parseCreateTeacherInput requires a name", () => {
  const formData = new FormData();
  formData.set("email", "teacher@example.com");
  formData.set("role", "teacher");

  assert.deepEqual(parseCreateTeacherInput(formData), {
    error: "教師名を入力してください。",
    ok: false,
  });
});

test("parseCreateTeacherInput requires a valid email", () => {
  const formData = new FormData();
  formData.set("name", "教師");
  formData.set("email", "teacher.example.com");
  formData.set("role", "teacher");

  assert.deepEqual(parseCreateTeacherInput(formData), {
    error: "メールアドレスの形式が不正です。",
    ok: false,
  });
});

test("parseCreateTeacherInput requires a supported role", () => {
  const formData = new FormData();
  formData.set("name", "教師");
  formData.set("email", "teacher@example.com");
  formData.set("role", "owner");

  assert.deepEqual(parseCreateTeacherInput(formData), {
    error: "権限の指定が不正です。",
    ok: false,
  });
});
