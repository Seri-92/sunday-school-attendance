import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultAttendanceDate,
  getIsoDateInJapan,
  getSundaysInRange,
} from "./attendance-date";

test("getIsoDateInJapan returns the calendar date in Japan time", () => {
  assert.equal(
    getIsoDateInJapan(new Date("2026-05-09T15:00:00.000Z")),
    "2026-05-10",
  );
});

test("getSundaysInRange returns Sunday dates without depending on server timezone", () => {
  assert.deepEqual(getSundaysInRange("2026-04-01", "2026-04-20"), [
    "2026-04-05",
    "2026-04-12",
    "2026-04-19",
  ]);
});

test("getDefaultAttendanceDate returns latest Sunday on or before today in Japan time", () => {
  assert.equal(
    getDefaultAttendanceDate(
      ["2026-05-03", "2026-05-10", "2026-05-17"],
      new Date("2026-05-09T15:00:00.000Z"),
    ),
    "2026-05-10",
  );
});
