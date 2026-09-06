// Run only against a disposable, empty PostgreSQL database; this creates fixtures.
// NODE_PATH=./node_modules/next/dist/compiled DATABASE_URL=... node --conditions=react-server --import tsx --test tests/attendance-notifications.integration.ts
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

test("notifications with real PostgreSQL transactions and mocked LINE transport", async (t) => {
  assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL to a disposable test database");
  const client = postgres(process.env.DATABASE_URL, { max: 8, prepare: false });
  (globalThis as typeof globalThis & { postgresClient: typeof client }).postgresClient = client;
  const originalFetch = globalThis.fetch;
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    const { db } = await import("../src/db/index");
    const schema = await import("../src/db/schema");
    const { notifyAttendanceForWeek } = await import("../src/lib/attendance-notification-service");
    const { getAttendanceStateForDate } = await import("../src/lib/attendance-reminder-service");
    const { sendAttendanceNotificationOnce } = await import("../src/lib/line-messaging");
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-token";
    process.env.LINE_ATTENDANCE_GROUP_ID = "Ctest";
    const messages: Array<{ messages: Array<{ text: string }> }> = [];
    globalThis.fetch = async (_url, init) => {
      messages.push(JSON.parse(String(init?.body)));
      await new Promise((resolve) => setTimeout(resolve, 30));
      return new Response("{}", { status: 200 });
    };
    const [year] = await db.insert(schema.schoolYears).values({ label: "notification-test", startDate: "2026-04-01", endDate: "2027-03-31" }).returning();
    const [classRecord] = await db.insert(schema.classes).values({ schoolYearId: year.id, name: "中学科", gradeCode: "junior_high_1" }).returning();
    const [student] = await db.insert(schema.students).values({ lastName: "Test", firstName: "Student", lastNameKana: "てすと", firstNameKana: "せいと", currentGradeCode: "elementary_6" }).returning();
    await db.insert(schema.studentClassAssignments).values({ schoolYearId: year.id, classId: classRecord.id, studentId: student.id, gradeCode: "elementary_6" });
    const date = "2026-09-06";

    await t.test("missing date reminds once even with concurrent cron executions", async () => {
      await Promise.all(Array.from({ length: 4 }, () => notifyAttendanceForWeek(year.id, date, "cron")));
      assert.equal(messages.length, 1);
      assert.equal(messages[0].messages[0].text, "9月6日の日曜学校の出席を入力してください。");
    });
    const [attendanceDate] = await db.insert(schema.attendanceDates).values({ schoolYearId: year.id, date }).returning();
    await db.insert(schema.attendanceRecords).values({ attendanceDateId: attendanceDate.id, studentId: student.id, status: "absent" });
    await db.insert(schema.attendanceExtraCounts).values({ attendanceDateId: attendanceDate.id, classId: classRecord.id, category: "junior_high_other", headcount: 0 });
    await db.insert(schema.weeklyAttendanceExtraCounts).values({ attendanceDateId: attendanceDate.id, group: "elementary", category: "guardian", headcount: 0 });
    await t.test("missing guardian input prevents completion even with every student recorded", async () => {
      await notifyAttendanceForWeek(year.id, date, "save");
      assert.equal(messages.length, 1);
    });
    await db.insert(schema.weeklyAttendanceExtraCounts).values({ attendanceDateId: attendanceDate.id, group: "junior_high", category: "guardian", headcount: 0 });
    await t.test("zero counts complete the saved Sunday and simultaneous saves only send once", async () => {
      await Promise.all(Array.from({ length: 6 }, () => notifyAttendanceForWeek(year.id, date, "save")));
      assert.equal(messages.length, 2);
      assert.equal(messages[1].messages[0].text, "9月6日の日曜学校の出席入力が完了しています。");
      await notifyAttendanceForWeek(year.id, date, "cron");
      await notifyAttendanceForWeek(year.id, date, "save");
      assert.equal(messages.length, 2);
    });
    await t.test("out-of-year and non-Sunday dates are never complete", async () => {
      assert.equal(await getAttendanceStateForDate("2026-03-29", year.id), "not_applicable");
      assert.equal(await getAttendanceStateForDate("2026-09-07", year.id), "not_applicable");
    });
    await t.test("failure persists intent and retry uses same key, recipient and message", async () => {
      const attempts: RequestInit[] = [];
      globalThis.fetch = async (_url, init) => { attempts.push(init!); return new Response("", { status: 401 }); };
      const params = { schoolYearId: year.id, date: "2026-09-13", kind: "reminder" as const };
      await assert.rejects(sendAttendanceNotificationOnce(params));
      process.env.LINE_ATTENDANCE_GROUP_ID = "Cchanged";
      globalThis.fetch = async (_url, init) => { attempts.push(init!); return new Response("", { status: 409, headers: { "x-line-accepted-request-id": "accepted" } }); };
      await sendAttendanceNotificationOnce(params);
      assert.equal(attempts[0].body, attempts[1].body);
      assert.deepEqual(attempts[0].headers, attempts[1].headers);
      await sendAttendanceNotificationOnce(params);
      assert.equal(attempts.length, 2);
    });
  } finally {
    globalThis.fetch = originalFetch;
    await client.end();
  }
});
