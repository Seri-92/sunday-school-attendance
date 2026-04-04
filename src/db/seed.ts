import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  attendanceDates,
  attendanceRecords,
  classes,
  schoolYears,
  studentClassAssignments,
  students,
  teachers,
} from "@/db/schema";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local before seeding.",
  );
}

const schoolYearId = "20260000-0000-4000-8000-000000000001";

const teacherSeed = [
  {
    id: "20260000-0000-4000-8000-000000000101",
    authUserId: null,
    email: "test@gmail.com",
    role: "admin" as const,
    active: true,
  },
  {
    id: "20260000-0000-4000-8000-000000000102",
    authUserId: null,
    email: "teacher-kids@example.com",
    role: "teacher" as const,
    active: true,
  },
  {
    id: "20260000-0000-4000-8000-000000000103",
    authUserId: null,
    email: "teacher-junior@example.com",
    role: "teacher" as const,
    active: true,
  },
];

const classSeed = [
  {
    id: "20260000-0000-4000-8000-000000000201",
    schoolYearId,
    name: "幼稚科",
    gradeCode: "kindergarten" as const,
    teacherId: "20260000-0000-4000-8000-000000000102",
  },
  {
    id: "20260000-0000-4000-8000-000000000202",
    schoolYearId,
    name: "1・2年",
    gradeCode: "elementary_1" as const,
    teacherId: "20260000-0000-4000-8000-000000000101",
  },
  {
    id: "20260000-0000-4000-8000-000000000203",
    schoolYearId,
    name: "3・4年",
    gradeCode: "elementary_3" as const,
    teacherId: "20260000-0000-4000-8000-000000000101",
  },
  {
    id: "20260000-0000-4000-8000-000000000204",
    schoolYearId,
    name: "5・6年",
    gradeCode: "elementary_5" as const,
    teacherId: "20260000-0000-4000-8000-000000000102",
  },
  {
    id: "20260000-0000-4000-8000-000000000205",
    schoolYearId,
    name: "中学科",
    gradeCode: "junior_high_1" as const,
    teacherId: "20260000-0000-4000-8000-000000000103",
  },
];

const studentSeed = [
  {
    id: "20260000-0000-4000-8000-000000000301",
    name: "山田 花子",
    currentGradeCode: "kindergarten" as const,
    active: true,
  },
  {
    id: "20260000-0000-4000-8000-000000000302",
    name: "田中 一郎",
    currentGradeCode: "elementary_1" as const,
    active: true,
  },
  {
    id: "20260000-0000-4000-8000-000000000303",
    name: "鈴木 次郎",
    currentGradeCode: "elementary_3" as const,
    active: true,
  },
  {
    id: "20260000-0000-4000-8000-000000000304",
    name: "佐藤 美咲",
    currentGradeCode: "elementary_5" as const,
    active: true,
  },
  {
    id: "20260000-0000-4000-8000-000000000305",
    name: "高橋 健太",
    currentGradeCode: "junior_high_1" as const,
    active: true,
  },
];

const assignmentSeed = [
  {
    id: "20260000-0000-4000-8000-000000000401",
    studentId: "20260000-0000-4000-8000-000000000301",
    schoolYearId,
    classId: "20260000-0000-4000-8000-000000000201",
    assignmentType: "auto" as const,
  },
  {
    id: "20260000-0000-4000-8000-000000000402",
    studentId: "20260000-0000-4000-8000-000000000302",
    schoolYearId,
    classId: "20260000-0000-4000-8000-000000000202",
    assignmentType: "auto" as const,
  },
  {
    id: "20260000-0000-4000-8000-000000000403",
    studentId: "20260000-0000-4000-8000-000000000303",
    schoolYearId,
    classId: "20260000-0000-4000-8000-000000000203",
    assignmentType: "manual" as const,
  },
  {
    id: "20260000-0000-4000-8000-000000000404",
    studentId: "20260000-0000-4000-8000-000000000304",
    schoolYearId,
    classId: "20260000-0000-4000-8000-000000000204",
    assignmentType: "auto" as const,
  },
  {
    id: "20260000-0000-4000-8000-000000000405",
    studentId: "20260000-0000-4000-8000-000000000305",
    schoolYearId,
    classId: "20260000-0000-4000-8000-000000000205",
    assignmentType: "auto" as const,
  },
];

const attendanceDateSeed = [
  {
    id: "20260000-0000-4000-8000-000000000501",
    schoolYearId,
    date: "2026-04-05",
  },
  {
    id: "20260000-0000-4000-8000-000000000502",
    schoolYearId,
    date: "2026-04-12",
  },
];

const attendanceRecordSeed = [
  {
    id: "20260000-0000-4000-8000-000000000601",
    attendanceDateId: "20260000-0000-4000-8000-000000000501",
    studentId: "20260000-0000-4000-8000-000000000301",
    status: "present",
    note: null,
  },
  {
    id: "20260000-0000-4000-8000-000000000602",
    attendanceDateId: "20260000-0000-4000-8000-000000000501",
    studentId: "20260000-0000-4000-8000-000000000302",
    status: "present",
    note: null,
  },
  {
    id: "20260000-0000-4000-8000-000000000603",
    attendanceDateId: "20260000-0000-4000-8000-000000000501",
    studentId: "20260000-0000-4000-8000-000000000303",
    status: "absent",
    note: "家族旅行",
  },
  {
    id: "20260000-0000-4000-8000-000000000604",
    attendanceDateId: "20260000-0000-4000-8000-000000000501",
    studentId: "20260000-0000-4000-8000-000000000304",
    status: "present",
    note: null,
  },
  {
    id: "20260000-0000-4000-8000-000000000609",
    attendanceDateId: "20260000-0000-4000-8000-000000000501",
    studentId: "20260000-0000-4000-8000-000000000305",
    status: "absent",
    note: "部活動の行事",
  },
  {
    id: "20260000-0000-4000-8000-000000000605",
    attendanceDateId: "20260000-0000-4000-8000-000000000502",
    studentId: "20260000-0000-4000-8000-000000000301",
    status: "present",
    note: null,
  },
  {
    id: "20260000-0000-4000-8000-000000000606",
    attendanceDateId: "20260000-0000-4000-8000-000000000502",
    studentId: "20260000-0000-4000-8000-000000000302",
    status: "absent",
    note: "体調不良",
  },
  {
    id: "20260000-0000-4000-8000-000000000607",
    attendanceDateId: "20260000-0000-4000-8000-000000000502",
    studentId: "20260000-0000-4000-8000-000000000303",
    status: "present",
    note: null,
  },
  {
    id: "20260000-0000-4000-8000-000000000608",
    attendanceDateId: "20260000-0000-4000-8000-000000000502",
    studentId: "20260000-0000-4000-8000-000000000304",
    status: "present",
    note: null,
  },
  {
    id: "20260000-0000-4000-8000-000000000610",
    attendanceDateId: "20260000-0000-4000-8000-000000000502",
    studentId: "20260000-0000-4000-8000-000000000305",
    status: "present",
    note: null,
  },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql);

  try {
    await db.transaction(async (tx) => {
      await tx.delete(attendanceRecords);
      await tx.delete(attendanceDates);
      await tx.delete(studentClassAssignments);
      await tx.delete(classes);
      await tx.delete(students);
      await tx.delete(schoolYears);
      await tx.delete(teachers);

      await tx.insert(teachers).values(teacherSeed);
      await tx.insert(schoolYears).values({
        id: schoolYearId,
        label: "2026年度",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        isActive: true,
      });
      await tx.insert(classes).values(classSeed);
      await tx.insert(students).values(studentSeed);
      await tx.insert(studentClassAssignments).values(assignmentSeed);
      await tx.insert(attendanceDates).values(attendanceDateSeed);
      await tx.insert(attendanceRecords).values(attendanceRecordSeed);
    });

    console.log("Seed completed.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Seed failed.");
  console.error(error);
  process.exit(1);
});
