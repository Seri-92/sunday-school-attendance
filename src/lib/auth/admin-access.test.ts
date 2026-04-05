import assert from "node:assert/strict";
import test from "node:test";
import { getAdminTeacherAccess, type LinkedTeacherResult } from "./admin-access";

const baseTeacher = {
  active: true,
  authUserId: "user_123",
  createdAt: new Date("2026-04-01T00:00:00Z"),
  email: "admin@example.com",
  id: "teacher-1",
  name: "管理者",
  role: "admin" as const,
  updatedAt: new Date("2026-04-01T00:00:00Z"),
};

test("getAdminTeacherAccess returns linked admin teachers", () => {
  const result: LinkedTeacherResult = {
    status: "linked",
    teacher: baseTeacher,
  };

  assert.equal(getAdminTeacherAccess(result), baseTeacher);
});

test("getAdminTeacherAccess rejects linked non-admin teachers", () => {
  const result: LinkedTeacherResult = {
    status: "linked",
    teacher: {
      ...baseTeacher,
      role: "teacher",
    },
  };

  assert.equal(getAdminTeacherAccess(result), null);
});

test("getAdminTeacherAccess rejects inactive teachers", () => {
  const result: LinkedTeacherResult = {
    status: "inactive",
    teacher: {
      ...baseTeacher,
      active: false,
    },
  };

  assert.equal(getAdminTeacherAccess(result), null);
});

test("getAdminTeacherAccess rejects missing and conflicted teachers", () => {
  assert.equal(
    getAdminTeacherAccess({
      email: "missing@example.com",
      status: "missing",
    }),
    null,
  );

  assert.equal(
    getAdminTeacherAccess({
      email: "conflict@example.com",
      existingAuthUserId: "user_other",
      status: "conflict",
    }),
    null,
  );
});
