import assert from "node:assert/strict";
import test from "node:test";
import { registerTeacher } from "./create-teacher";

const baseInput = {
  active: true,
  email: "teacher@example.com",
  name: "教師 太郎",
  role: "teacher" as const,
};

test("registerTeacher stores the Clerk user id with the teacher", async () => {
  const calls: string[] = [];

  const result = await registerTeacher(baseInput, {
    async ensureClerkUserId(email) {
      calls.push(`ensureClerkUserId:${email}`);
      return "user_123";
    },
    store: {
      async findByEmail(email) {
        calls.push(`findByEmail:${email}`);
        return null;
      },
      async insert(input) {
        calls.push(`insert:${JSON.stringify(input)}`);
      },
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [
    "findByEmail:teacher@example.com",
    "ensureClerkUserId:teacher@example.com",
    'insert:{"active":true,"email":"teacher@example.com","name":"教師 太郎","role":"teacher","authUserId":"user_123"}',
  ]);
});

test("registerTeacher rejects duplicate teacher emails before touching Clerk", async () => {
  const calls: string[] = [];

  const result = await registerTeacher(baseInput, {
    async ensureClerkUserId() {
      calls.push("ensureClerkUserId");
      return "user_123";
    },
    store: {
      async findByEmail(email) {
        calls.push(`findByEmail:${email}`);
        return {
          email,
          id: "teacher_existing",
          name: "既存教師",
        };
      },
      async insert() {
        calls.push("insert");
      },
    },
  });

  assert.deepEqual(result, {
    error: "teacher@example.com はすでに 既存教師 として登録されています。",
    ok: false,
  });
  assert.deepEqual(calls, ["findByEmail:teacher@example.com"]);
});

test("registerTeacher does not insert a teacher when Clerk user creation fails", async () => {
  const calls: string[] = [];

  await assert.rejects(
    registerTeacher(baseInput, {
      async ensureClerkUserId(email) {
        calls.push(`ensureClerkUserId:${email}`);
        throw new Error("clerk failed");
      },
      store: {
        async findByEmail(email) {
          calls.push(`findByEmail:${email}`);
          return null;
        },
        async insert() {
          calls.push("insert");
        },
      },
    }),
    /clerk failed/,
  );

  assert.deepEqual(calls, [
    "findByEmail:teacher@example.com",
    "ensureClerkUserId:teacher@example.com",
  ]);
});
