import assert from "node:assert/strict";
import test from "node:test";
import {
  createSingleFlight,
  requestSignInEmailCode,
} from "./email-otp-flow";

test("requestSignInEmailCode creates sign-in by identifier then prepares the email factor", async () => {
  const calls: string[] = [];
  const signIn = {
    async create(params: { identifier: string }) {
      calls.push(`create:${JSON.stringify(params)}`);

      return {
        supportedFirstFactors: [
          {
            emailAddressId: "email_123",
            strategy: "email_code",
          },
        ],
        async prepareFirstFactor(params: {
          strategy: "email_code";
          emailAddressId: string;
        }) {
          calls.push(`prepare:${JSON.stringify(params)}`);
        },
      };
    },
  };

  await requestSignInEmailCode({
    email: "teacher@example.com",
    signIn,
  });

  assert.deepEqual(calls, [
    'create:{"identifier":"teacher@example.com"}',
    'prepare:{"strategy":"email_code","emailAddressId":"email_123"}',
  ]);
});

test("requestSignInEmailCode rejects emails without an email code factor", async () => {
  const signIn = {
    async create() {
      return {
        supportedFirstFactors: [],
        async prepareFirstFactor() {
          throw new Error("should not be called");
        },
      };
    },
  };

  await assert.rejects(
    requestSignInEmailCode({
      email: "teacher@example.com",
      signIn,
    }),
    /email OTP のサインインを開始できません/,
  );
});

test("createSingleFlight ignores concurrent duplicate submissions and unlocks after completion", async () => {
  const runSingleFlight = createSingleFlight();
  let executionCount = 0;

  const first = runSingleFlight(async () => {
    executionCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return "done";
  });
  const second = runSingleFlight(async () => {
    executionCount += 1;
    return "duplicate";
  });

  assert.equal(await first, "done");
  assert.equal(await second, undefined);
  assert.equal(executionCount, 1);

  const third = await runSingleFlight(async () => {
    executionCount += 1;
    return "after";
  });

  assert.equal(third, "after");
  assert.equal(executionCount, 2);
});
