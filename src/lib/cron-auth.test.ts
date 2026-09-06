import assert from "node:assert/strict";
import test from "node:test";
import { isCronRequestAuthorized } from "./cron-auth";

test("isCronRequestAuthorized accepts Vercel's matching bearer token", () => {
  assert.equal(isCronRequestAuthorized("Bearer secret-value", "secret-value"), true);
});

test("isCronRequestAuthorized rejects a missing secret or non-matching token", () => {
  assert.equal(isCronRequestAuthorized("Bearer secret-value", undefined), false);
  assert.equal(isCronRequestAuthorized("Bearer other-value", "secret-value"), false);
  assert.equal(isCronRequestAuthorized(null, "secret-value"), false);
});
