"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  attendanceDates,
  attendanceExtraCounts,
  attendanceRecords,
  studentClassAssignments,
  students,
  type GradeCode,
  weeklyAttendanceExtraCounts,
} from "@/db/schema";
import {
  formatAttendanceDateLabel,
  getActiveSchoolYear,
  getAuthorizedClass,
  getClassStudents,
  getSundaysInRange,
  getTeacherClassesForYear,
  isAttendanceDateInScope,
  isAttendanceStatus,
  isGradeCode,
  type LinkedTeacher,
} from "@/lib/attendance";
import {
  guardianAttendanceExtraFieldName,
  guardianAttendanceExtraCategory,
  isWeeklyAttendanceGroup,
  juniorHighOtherAttendanceExtraCategory,
  juniorHighOtherAttendanceExtraFieldName,
  parseAttendanceExtraHeadcount,
  supportsJuniorHighOtherAttendanceExtra,
} from "@/lib/attendance-extra";
import { requireSession } from "@/lib/auth/session";
import { syncTeacherAuthUser } from "@/lib/auth/teachers";
import { resolveDefaultClassForGrade } from "@/lib/student-class-assignment";
import { buildStudentName } from "@/lib/students";
import { checkAttendanceCompletionAfterSave } from "@/lib/attendance-notification-service";

function buildDashboardUrl(params: {
  tab?: string;
  classId?: string;
  date?: string;
  studentId?: string;
  mode?: string;
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

  if (params.studentId) {
    searchParams.set("studentId", params.studentId);
  }

  if (params.mode) {
    searchParams.set("mode", params.mode);
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

async function findOrCreateAttendanceDate(params: {
  date: string;
  schoolYearId: string;
  tx: Pick<typeof db, "insert" | "select">;
}) {
  let [attendanceDate] = await params.tx
    .select()
    .from(attendanceDates)
    .where(
      and(
        eq(attendanceDates.schoolYearId, params.schoolYearId),
        eq(attendanceDates.date, params.date),
      ),
    )
    .limit(1);

  if (!attendanceDate) {
    await params.tx
      .insert(attendanceDates)
      .values({
        schoolYearId: params.schoolYearId,
        date: params.date,
      })
      .onConflictDoNothing();

    [attendanceDate] = await params.tx
      .select()
      .from(attendanceDates)
      .where(
        and(
          eq(attendanceDates.schoolYearId, params.schoolYearId),
          eq(attendanceDates.date, params.date),
        ),
      )
      .limit(1);
  }

  if (!attendanceDate) {
    throw new Error("attendance_date の作成に失敗しました。");
  }

  return attendanceDate;
}

function getStudentNameInput(formData: FormData) {
  const lastName = String(formData.get("lastName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastNameKana = String(formData.get("lastNameKana") ?? "").trim();
  const firstNameKana = String(formData.get("firstNameKana") ?? "").trim();

  return {
    firstName,
    firstNameKana,
    lastName,
    lastNameKana,
  };
}

function validateStudentInput(params: {
  classId: string;
  date: string;
  formData: FormData;
  mode?: string;
  studentId?: string;
  tab: string;
}) {
  const nameInput = getStudentNameInput(params.formData);
  const gradeCode = String(params.formData.get("gradeCode") ?? "");

  if (!nameInput.lastName || !nameInput.firstName) {
    redirect(
      buildDashboardUrl({
        tab: params.tab,
        classId: params.classId,
        date: params.date,
        studentId: params.studentId,
        mode: params.mode,
        error: "姓と名を入力してください。",
      }),
    );
  }

  if (!nameInput.lastNameKana || !nameInput.firstNameKana) {
    redirect(
      buildDashboardUrl({
        tab: params.tab,
        classId: params.classId,
        date: params.date,
        studentId: params.studentId,
        mode: params.mode,
        error: "せいとめいのふりがなを入力してください。",
      }),
    );
  }

  if (!isGradeCode(gradeCode)) {
    redirect(
      buildDashboardUrl({
        tab: params.tab,
        classId: params.classId,
        date: params.date,
        studentId: params.studentId,
        mode: params.mode,
        error: "学年の指定が不正です。",
      }),
    );
  }

  return {
    ...nameInput,
    gradeCode: gradeCode as GradeCode,
    studentName: buildStudentName(nameInput),
  };
}

export async function createStudentAction(formData: FormData) {
  const teacher = await requireLinkedTeacherForAction();
  const activeSchoolYear = await getActiveSchoolYear();
  const tab = String(formData.get("tab") ?? "students");
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");

  if (!activeSchoolYear) {
    redirect(buildDashboardUrl({ error: "有効な年度がありません。" }));
  }

  const studentInput = validateStudentInput({ classId, date, formData, tab });

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
        lastName: studentInput.lastName,
        firstName: studentInput.firstName,
        lastNameKana: studentInput.lastNameKana,
        firstNameKana: studentInput.firstNameKana,
        currentGradeCode: studentInput.gradeCode,
        active: true,
      })
      .returning({ id: students.id });

    await tx.insert(studentClassAssignments).values({
      studentId: student.id,
      schoolYearId: activeSchoolYear.id,
      classId: classRecord.id,
      gradeCode: studentInput.gradeCode,
      assignmentType: "manual",
    });
  });

  revalidatePath("/dashboard");
  redirect(
    buildDashboardUrl({
      tab: "students",
      classId: classRecord.id,
      date,
      notice: `${studentInput.studentName} を ${classRecord.name} に登録しました。`,
    }),
  );
}

export async function updateStudentAction(formData: FormData) {
  const teacher = await requireLinkedTeacherForAction();
  const activeSchoolYear = await getActiveSchoolYear();
  const tab = "students";
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  if (!activeSchoolYear) {
    redirect(buildDashboardUrl({ error: "有効な年度がありません。" }));
  }

  const studentInput = validateStudentInput({
    classId,
    date,
    formData,
    mode: "edit",
    studentId,
    tab,
  });
  const classRecord = await getAuthorizedClass(teacher, activeSchoolYear.id, classId);

  if (!classRecord) {
    redirect(
      buildDashboardUrl({
        error: "対象クラスへのアクセス権がありません。",
      }),
    );
  }

  const teacherClasses = await getTeacherClassesForYear(teacher, activeSchoolYear.id);
  const teacherClassIds = new Set(teacherClasses.map((classItem) => classItem.id));
  const defaultClass = resolveDefaultClassForGrade(teacherClasses, studentInput.gradeCode);

  if (!defaultClass) {
    redirect(
      buildDashboardUrl({
        tab,
        classId,
        date,
        studentId,
        mode: "edit",
        error: "選択した学年に対応する通常クラスがありません。",
      }),
    );
  }

  const [assignment] = await db
    .select({
      assignmentId: studentClassAssignments.id,
      classId: studentClassAssignments.classId,
    })
    .from(studentClassAssignments)
    .where(
      and(
        eq(studentClassAssignments.schoolYearId, activeSchoolYear.id),
        eq(studentClassAssignments.studentId, studentId),
      ),
    )
    .limit(1);

  if (!assignment || !teacherClassIds.has(assignment.classId)) {
    redirect(
      buildDashboardUrl({
        tab,
        classId,
        error: "対象生徒へのアクセス権がありません。",
      }),
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(students)
      .set({
        lastName: studentInput.lastName,
        firstName: studentInput.firstName,
        lastNameKana: studentInput.lastNameKana,
        firstNameKana: studentInput.firstNameKana,
        currentGradeCode: studentInput.gradeCode,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId));

    await tx
      .update(studentClassAssignments)
      .set({
        classId: defaultClass.id,
        gradeCode: studentInput.gradeCode,
        assignmentType: "auto",
        updatedAt: new Date(),
      })
      .where(eq(studentClassAssignments.id, assignment.assignmentId));
  });

  revalidatePath("/dashboard");
  redirect(
    buildDashboardUrl({
      tab,
      classId: defaultClass.id,
      date,
      studentId,
      notice: `${studentInput.studentName} の生徒情報を保存しました。`,
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
  const supportsJuniorHighOtherCount = supportsJuniorHighOtherAttendanceExtra({
    className: classRecord.name,
    gradeCode: classRecord.gradeCode,
  });
  const juniorHighOtherHeadcount = supportsJuniorHighOtherCount
    ? parseAttendanceExtraHeadcount(formData.get(juniorHighOtherAttendanceExtraFieldName))
    : null;

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

  if (supportsJuniorHighOtherCount && juniorHighOtherHeadcount === null) {
    redirect(
      buildDashboardUrl({
        tab,
        classId: classRecord.id,
        date,
        error: "その他の人数は 0 以上の整数で入力してください。",
      }),
    );
  }

  await db.transaction(async (tx) => {
    const attendanceDate = await findOrCreateAttendanceDate({
      date,
      schoolYearId: activeSchoolYear.id,
      tx,
    });

    for (const student of classStudents) {
      const rawStatus = String(formData.get(`status:${student.studentId}`) ?? "absent");
      const normalizedStatus = isAttendanceStatus(rawStatus) ? rawStatus : "absent";

      await tx
        .insert(attendanceRecords)
        .values({
          attendanceDateId: attendanceDate.id,
          studentId: student.studentId,
          status: normalizedStatus,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.attendanceDateId, attendanceRecords.studentId],
          set: {
            status: normalizedStatus,
            updatedAt: new Date(),
          },
        });
    }

    if (supportsJuniorHighOtherCount) {
      await tx
        .insert(attendanceExtraCounts)
        .values({
          attendanceDateId: attendanceDate.id,
          category: juniorHighOtherAttendanceExtraCategory,
          classId: classRecord.id,
          headcount: juniorHighOtherHeadcount ?? 0,
        })
        .onConflictDoUpdate({
          target: [
            attendanceExtraCounts.attendanceDateId,
            attendanceExtraCounts.classId,
            attendanceExtraCounts.category,
          ],
          set: {
            headcount: juniorHighOtherHeadcount ?? 0,
            updatedAt: new Date(),
          },
        });
    }
  });

  checkAttendanceCompletionAfterSave(activeSchoolYear.id, date);
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

export async function saveWeeklyAttendanceExtraAction(
  group: "elementary" | "junior_high",
  formData: FormData,
) {
  const teacher = await requireLinkedTeacherForAction();
  const activeSchoolYear = await getActiveSchoolYear();
  const tab = String(formData.get("tab") ?? "week");
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  const guardianHeadcount = parseAttendanceExtraHeadcount(
    formData.get(guardianAttendanceExtraFieldName),
  );

  if (!activeSchoolYear) {
    redirect(buildDashboardUrl({ error: "有効な年度がありません。" }));
  }

  const classRecord = await getAuthorizedClass(teacher, activeSchoolYear.id, classId);

  if (!classRecord) {
    redirect(
      buildDashboardUrl({
        error: "対象クラスへのアクセス権がありません。",
      }),
    );
  }

  const validAttendanceDates = getSundaysInRange(activeSchoolYear.startDate, activeSchoolYear.endDate);

  if (!isWeeklyAttendanceGroup(group)) {
    redirect(
      buildDashboardUrl({
        tab,
        classId: classRecord.id,
        date,
        error: "週の補足情報の対象が不正です。",
      }),
    );
  }

  if (!isAttendanceDateInScope(date, validAttendanceDates)) {
    redirect(
      buildDashboardUrl({
        tab,
        classId,
        error: `${activeSchoolYear.label} の日曜を選択してください。`,
      }),
    );
  }

  if (guardianHeadcount === null) {
    redirect(
      buildDashboardUrl({
        tab,
        classId,
        date,
        error: "保護者の人数は 0 以上の整数で入力してください。",
      }),
    );
  }

  await db.transaction(async (tx) => {
    const attendanceDate = await findOrCreateAttendanceDate({
      date,
      schoolYearId: activeSchoolYear.id,
      tx,
    });

    await tx
      .insert(weeklyAttendanceExtraCounts)
      .values({
        attendanceDateId: attendanceDate.id,
        group,
        category: guardianAttendanceExtraCategory,
        headcount: guardianHeadcount,
      })
      .onConflictDoUpdate({
        target: [
          weeklyAttendanceExtraCounts.attendanceDateId,
          weeklyAttendanceExtraCounts.group,
          weeklyAttendanceExtraCounts.category,
        ],
        set: {
          headcount: guardianHeadcount,
          updatedAt: new Date(),
        },
      });
  });

  checkAttendanceCompletionAfterSave(activeSchoolYear.id, date);
  revalidatePath("/dashboard");
  redirect(
    buildDashboardUrl({
      tab,
      classId: classRecord.id,
      date,
      notice: `${formatAttendanceDateLabel(date)} の保護者人数を保存しました。`,
    }),
  );
}

export async function saveElementaryWeeklyAttendanceExtraAction(formData: FormData) {
  return saveWeeklyAttendanceExtraAction("elementary", formData);
}

export async function saveJuniorHighWeeklyAttendanceExtraAction(formData: FormData) {
  return saveWeeklyAttendanceExtraAction("junior_high", formData);
}
