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
import { buildStudentName } from "@/lib/students";

function buildDashboardUrl(params: {
  tab?: string;
  classId?: string;
  date?: string;
  notice?: string;
  error?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.tab) {
    searchParams.set("tab", params.tab);
  }

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
  const tab = String(formData.get("tab") ?? "students");
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  const lastName = String(formData.get("lastName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastNameKana = String(formData.get("lastNameKana") ?? "").trim();
  const firstNameKana = String(formData.get("firstNameKana") ?? "").trim();
  const gradeCode = String(formData.get("gradeCode") ?? "");
  const studentName = buildStudentName({ lastName, firstName });

  if (!activeSchoolYear) {
    redirect(buildDashboardUrl({ error: "有効な年度がありません。" }));
  }

  if (!lastName || !firstName) {
    redirect(
      buildDashboardUrl({
        tab,
        classId,
        date,
        error: "姓と名を入力してください。",
      }),
    );
  }

  if (!lastNameKana || !firstNameKana) {
    redirect(
      buildDashboardUrl({
        tab,
        classId,
        date,
        error: "せいとめいのふりがなを入力してください。",
      }),
    );
  }

  if (!isGradeCode(gradeCode)) {
    redirect(
      buildDashboardUrl({
        tab,
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
        lastName,
        firstName,
        lastNameKana,
        firstNameKana,
        currentGradeCode: gradeCode,
        active: true,
      })
      .returning({ id: students.id });

    await tx.insert(studentClassAssignments).values({
      studentId: student.id,
      schoolYearId: activeSchoolYear.id,
      classId: classRecord.id,
      gradeCode,
      assignmentType: "manual",
    });
  });

  revalidatePath("/dashboard");
  redirect(
    buildDashboardUrl({
      tab: "students",
      classId: classRecord.id,
      date,
      notice: `${studentName} を ${classRecord.name} に登録しました。`,
    }),
  );
}

export async function saveAttendanceAction(formData: FormData) {
  const teacher = await requireLinkedTeacherForAction();
  const activeSchoolYear = await getActiveSchoolYear();
  const tab = String(formData.get("tab") ?? "week");
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");

  if (!activeSchoolYear) {
    redirect(buildDashboardUrl({ error: "有効な年度がありません。" }));
  }

  const validAttendanceDates = getSundaysInRange(activeSchoolYear.startDate, activeSchoolYear.endDate);

  if (!isAttendanceDateInScope(date, validAttendanceDates)) {
    redirect(
      buildDashboardUrl({
        tab,
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
        tab,
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
      const rawStatus = String(formData.get(`status:${student.studentId}`) ?? "absent");
      const rawNote = String(formData.get(`note:${student.studentId}`) ?? "").trim();
      const normalizedStatus = isAttendanceStatus(rawStatus) ? rawStatus : "absent";

      await tx
        .insert(attendanceRecords)
        .values({
          attendanceDateId: attendanceDate.id,
          studentId: student.studentId,
          status: normalizedStatus,
          note: rawNote || null,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.attendanceDateId, attendanceRecords.studentId],
          set: {
            status: normalizedStatus,
            note: rawNote || null,
            updatedAt: new Date(),
          },
        });
    }
  });

  revalidatePath("/dashboard");
  redirect(
    buildDashboardUrl({
      tab,
      classId: classRecord.id,
      date,
      notice: `${classRecord.name} の ${formatAttendanceDateLabel(date)} の出席を保存しました。`,
    }),
  );
}
