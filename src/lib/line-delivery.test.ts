import assert from "node:assert/strict";
import test from "node:test";
import { deliverLineNotification, sendLineMessage } from "./line-delivery";

const message = { to: "Ctest", text: "9月6日の日曜学校の出席入力が完了しています。", retryKey: "00000000-0000-4000-8000-000000000001" };

test("LINE retries transient failures with identical content, recipient and key", async () => {
  const requests: RequestInit[] = [];
  await sendLineMessage(message, "token", {
    fetch: async (_url, init) => { requests.push(init!); return new Response("", { status: requests.length === 1 ? 500 : 200 }); },
    wait: async () => {},
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body, requests[1].body);
  assert.deepEqual(requests[0].headers, requests[1].headers);
  assert.deepEqual(JSON.parse(String(requests[0].body)), { to: "Ctest", messages: [{ type: "text", text: message.text }] });
});

test("an accepted retry response counts as success; other 4xx errors do not retry", async () => {
  await sendLineMessage(message, "token", { fetch: async () => new Response("", { status: 409, headers: { "x-line-accepted-request-id": "accepted" } }) });
  for (const status of [400, 401, 409, 429]) {
    let calls = 0;
    await assert.rejects(sendLineMessage(message, "token", { fetch: async () => { calls++; return new Response("", { status }); } }));
    assert.equal(calls, 1);
  }
});

test("network failures retry once and then fail without exposing token or response body", async () => {
  let calls = 0;
  await assert.rejects(sendLineMessage(message, "secret-token", {
    fetch: async () => { calls++; throw new Error("secret-token"); }, wait: async () => {},
  }), /LINE request failed/);
  assert.equal(calls, 2);
});

test("already sent notifications remain suppressed even weeks later", async () => {
  let calls = 0;
  const oldDate = new Date("2026-09-06T12:00:00Z");
  await deliverLineNotification({ ...message, createdAt: oldDate, sentAt: oldDate }, {
    now: new Date("2026-09-20T12:00:00Z"), send: async () => { calls++; }, markSent: async () => { calls++; },
  });
  assert.equal(calls, 0);
});

test("failed sends stay pending and a later successful attempt marks sent", async () => {
  const now = new Date();
  const row = { ...message, createdAt: now, sentAt: null };
  let marked = 0;
  await assert.rejects(deliverLineNotification(row, { now, send: async () => { throw new Error("failed"); }, markSent: async () => { marked++; } }));
  assert.equal(marked, 0);
  await deliverLineNotification(row, { now, send: async () => {}, markSent: async () => { marked++; } });
  assert.equal(marked, 1);
});

test("uncertain notifications are not resent beyond the safe retry window", async () => {
  let sent = false;
  await assert.rejects(deliverLineNotification({ ...message, createdAt: new Date("2026-09-06T12:00:00Z"), sentAt: null }, {
    now: new Date("2026-09-07T12:00:00Z"), send: async () => { sent = true; }, markSent: async () => {},
  }), /retry window expired/);
  assert.equal(sent, false);
});
