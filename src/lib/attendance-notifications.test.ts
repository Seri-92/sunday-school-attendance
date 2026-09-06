import assert from "node:assert/strict";
import test from "node:test";
import { buildAttendanceMessage, runAttendanceNotifications, type AttendanceState } from "./attendance-notifications";

test("messages identify the saved Sunday, including when saved on a later day", () => {
  assert.equal(buildAttendanceMessage("2026-09-06", "reminder"), "9月6日の日曜学校の出席を入力してください。");
  assert.equal(buildAttendanceMessage("2026-09-06", "completion"), "9月6日の日曜学校の出席入力が完了しています。");
});

function fixture(states: AttendanceState[], reminded = false) {
  const sent: string[] = [];
  return {
    sent,
    deps: {
      getState: async () => states.length > 1 ? states.shift()! : states[0],
      hasReminder: async () => reminded,
      sendOnce: async (kind: "reminder" | "completion") => { sent.push(kind); },
    },
  };
}

test("cron reminds only an incomplete week", async () => {
  const f = fixture(["incomplete"]);
  await runAttendanceNotifications("cron", f.deps);
  assert.deepEqual(f.sent, ["reminder"]);
});

test("no completion message before any reminder, or for out-of-scope dates", async () => {
  for (const trigger of ["cron", "save"] as const) {
    for (const state of ["complete", "not_applicable"] as const) {
      const f = fixture([state]);
      await runAttendanceNotifications(trigger, f.deps);
      assert.deepEqual(f.sent, []);
    }
  }
});

test("saving the last required entry after a reminder sends completion", async () => {
  const f = fixture(["complete"], true);
  await runAttendanceNotifications("save", f.deps);
  assert.deepEqual(f.sent, ["reminder", "completion"]); // sendOnce skips an accepted reminder
});

test("partial saves do not send completion", async () => {
  const f = fixture(["incomplete"], true);
  await runAttendanceNotifications("save", f.deps);
  assert.deepEqual(f.sent, ["reminder"]);
});

test("saving before any reminder does not load all attendance data", async () => {
  const f = fixture(["incomplete"]);
  f.deps.getState = async () => { throw new Error("should not query attendance"); };
  await runAttendanceNotifications("save", f.deps);
  assert.deepEqual(f.sent, []);
});

test("cron rechecks completion to cover a save during reminder delivery", async () => {
  const f = fixture(["incomplete", "complete"]);
  await runAttendanceNotifications("cron", f.deps);
  assert.deepEqual(f.sent, ["reminder", "completion"]);
});

test("a failed reminder never produces a completion notification", async () => {
  const f = fixture(["complete"], true);
  f.deps.sendOnce = async () => { throw new Error("delivery failed"); };
  await assert.rejects(runAttendanceNotifications("save", f.deps));
  assert.deepEqual(f.sent, []);
});
