import assert from "node:assert/strict";
import test from "node:test";
import {
  createSingleFlight,
  requestSignInEmailCode,
  requestSignUpEmailCode,
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

test("requestSignUpEmailCode creates sign-up then prepares email verification once", async () => {
  const calls: string[] = [];
  const signUp = {
    async create(params: { emailAddress: string }) {
      calls.push(`create:${JSON.stringify(params)}`);
    },
    async prepareEmailAddressVerification(params: {
      strategy: "email_code";
    }) {
      calls.push(`prepare:${JSON.stringify(params)}`);
    },
  };

  await requestSignUpEmailCode({
    email: "teacher@example.com",
    signUp,
  });

  assert.deepEqual(calls, [
    'create:{"emailAddress":"teacher@example.com"}',
    'prepare:{"strategy":"email_code"}',
  ]);
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
