import assert from "node:assert/strict";
import test from "node:test";
import { ensureClerkUser } from "./clerk-users";

test("ensureClerkUser reuses an existing Clerk user for the email", async () => {
  const calls: string[] = [];

  const userId = await ensureClerkUser({
    email: "teacher@example.com",
    users: {
      async createUser() {
        throw new Error("should not create");
      },
      async getUserList(params) {
        calls.push(`getUserList:${JSON.stringify(params)}`);

        return [
          {
            id: "user_existing",
          },
        ];
      },
    },
  });

  assert.equal(userId, "user_existing");
  assert.deepEqual(calls, [
    'getUserList:{"emailAddress":["teacher@example.com"],"limit":1}',
  ]);
});

test("ensureClerkUser creates a Clerk user when the email is missing", async () => {
  const calls: string[] = [];

  const userId = await ensureClerkUser({
    email: "teacher@example.com",
    users: {
      async createUser(params) {
        calls.push(`createUser:${JSON.stringify(params)}`);

        return {
          id: "user_created",
        };
      },
      async getUserList(params) {
        calls.push(`getUserList:${JSON.stringify(params)}`);

        return {
          data: [],
        };
      },
    },
  });

  assert.equal(userId, "user_created");
  assert.deepEqual(calls, [
    'getUserList:{"emailAddress":["teacher@example.com"],"limit":1}',
    'createUser:{"emailAddress":["teacher@example.com"]}',
  ]);
});
