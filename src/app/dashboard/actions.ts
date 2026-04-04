"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { attendanceDates, attendanceRecords, studentClassAssignments, students } from "@/db/schema";
import {
  formatAttendanceDateLabel,
  getActiveSchoolYear,
  getAuthorizedClass,
  getClassStudents,
  getSundaysInRange,
  isAttendanceDateInScope,
  isAttendanceStatus,
  isGradeCode,
  type LinkedTeacher,
} from "@/lib/attendance";
import { requireSession } from "@/lib/auth/session";
import { syncTeacherAuthUser } from "@/lib/auth/teachers";

function buildDashboardUrl(params: {
  classId?: string;
  date?: string;
  notice?: string;
  error?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.classId) {
    searchParams.set("classId", params.classId);
  }

  if (params.date) {
    searchParams.set("date", params.date);
  }

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();

  return query ? `/dashboard?${query}` : "/dashboard";
}

async function requireLinkedTeacherForAction() {
  const session = await requireSession();
  const linkedTeacher = await syncTeacherAuthUser({
    id: session.user.id,
    email: session.user.email,
  });

  if (linkedTeacher.status !== "linked") {
    redirect(
      buildDashboardUrl({
        error: "教師アカウントの連携状態を確認してください。",
      }),
    );
  }

  return linkedTeacher.teacher as LinkedTeacher;
}

export async function createStudentAction(formData: FormData) {
  const teacher = await requireLinkedTeacherForAction();
  const activeSchoolYear = await getActiveSchoolYear();
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  const studentName = String(formData.get("studentName") ?? "").trim();
  const gradeCode = String(formData.get("gradeCode") ?? "");

  if (!activeSchoolYear) {
    redirect(buildDashboardUrl({ error: "有効な年度がありません。" }));
  }

  if (!studentName) {
    redirect(
      buildDashboardUrl({
        classId,
        date,
        error: "生徒名を入力してください。",
      }),
    );
  }

  if (!isGradeCode(gradeCode)) {
    redirect(
      buildDashboardUrl({
        classId,
        date,
        error: "学年の指定が不正です。",
      }),
    );
  }

  const classRecord = await getAuthorizedClass(teacher, activeSchoolYear.id, classId);

  if (!classRecord) {
    redirect(
      buildDashboardUrl({
        error: "対象クラスへのアクセス権がありません。",
      }),
    );
  }

  await db.transaction(async (tx) => {
    const [student] = await tx
      .insert(students)
      .values({
        name: studentName,
        currentGradeCode: gradeCode,
        active: true,
      })
      .returning({ id: students.id });

    await tx.insert(studentClassAssignments).values({
      studentId: student.id,
      schoolYearId: activeSchoolYear.id,
      classId: classRecord.id,
      assignmentType: "manual",
    });
  });

  revalidatePath("/dashboard");
  redirect(
    buildDashboardUrl({
      classId: classRecord.id,
      date,
      notice: `${studentName} を ${classRecord.name} に登録しました。`,
    }),
  );
}

export async function saveAttendanceAction(formData: FormData) {
  const teacher = await requireLinkedTeacherForAction();
  const activeSchoolYear = await getActiveSchoolYear();
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");

  if (!activeSchoolYear) {
    redirect(buildDashboardUrl({ error: "有効な年度がありません。" }));
  }

  const validAttendanceDates = getSundaysInRange(activeSchoolYear.startDate, activeSchoolYear.endDate);

  if (!isAttendanceDateInScope(date, validAttendanceDates)) {
    redirect(
      buildDashboardUrl({
        classId,
        error: `${activeSchoolYear.label} の日曜を選択してください。`,
      }),
    );
  }

  const classRecord = await getAuthorizedClass(teacher, activeSchoolYear.id, classId);

  if (!classRecord) {
    redirect(
      buildDashboardUrl({
        error: "対象クラスへのアクセス権がありません。",
      }),
    );
  }

  const classStudents = await getClassStudents(classRecord.id, activeSchoolYear.id);

  if (classStudents.length === 0) {
    redirect(
      buildDashboardUrl({
        classId: classRecord.id,
        date,
        error: "出席を登録する前に生徒を追加してください。",
      }),
    );
  }

  await db.transaction(async (tx) => {
    let [attendanceDate] = await tx
      .select()
      .from(attendanceDates)
      .where(
        and(eq(attendanceDates.schoolYearId, activeSchoolYear.id), eq(attendanceDates.date, date)),
      )
      .limit(1);

    if (!attendanceDate) {
      await tx
        .insert(attendanceDates)
        .values({
          schoolYearId: activeSchoolYear.id,
          date,
        })
        .onConflictDoNothing();

      [attendanceDate] = await tx
        .select()
        .from(attendanceDates)
        .where(
          and(eq(attendanceDates.schoolYearId, activeSchoolYear.id), eq(attendanceDates.date, date)),
        )
        .limit(1);
    }

    if (!attendanceDate) {
      throw new Error("attendance_date の作成に失敗しました。");
    }

    for (const student of classStudents) {
      const rawStatus = String(formData.get(`status:${student.studentId}`) ?? "present");
      const rawNote = String(formData.get(`note:${student.studentId}`) ?? "").trim();

      await tx
        .insert(attendanceRecords)
        .values({
          attendanceDateId: attendanceDate.id,
          studentId: student.studentId,
          status: isAttendanceStatus(rawStatus) ? rawStatus : "present",
          note: rawNote || null,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.attendanceDateId, attendanceRecords.studentId],
          set: {
            status: isAttendanceStatus(rawStatus) ? rawStatus : "present",
            note: rawNote || null,
            updatedAt: new Date(),
          },
        });
    }
  });

  revalidatePath("/dashboard");
  redirect(
    buildDashboardUrl({
      classId: classRecord.id,
      date,
      notice: `${classRecord.name} の ${formatAttendanceDateLabel(date)} の出席を保存しました。`,
    }),
  );
}
