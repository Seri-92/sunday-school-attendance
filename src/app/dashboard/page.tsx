import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { type AttendanceStatus } from "@/db/schema";
import {
  formatAttendanceDateLabel,
  getActiveSchoolYear,
  getClassAttendanceRecords,
  getClassStudents,
  getDefaultAttendanceDate,
  getSundaysInRange,
  getTeacherClassesForYear,
} from "@/lib/attendance";
import { gradeLabels, normalizeAttendanceStatus } from "@/lib/attendance-shared";
import { requireSession } from "@/lib/auth/session";
import { syncTeacherAuthUser } from "@/lib/auth/teachers";
import { createStudentAction, saveAttendanceAction } from "./actions";
import {
  AttendanceDateSwitcher,
  AttendanceEditor,
  DashboardClassSwitcher,
} from "./dashboard-client";
import {
  buildAttendanceEditorItems,
  buildDashboardHref,
  buildHistoryByDate,
  getAttendanceCounts,
  sortStudentsByGrade,
  type DashboardTab,
  type SelectedDateRecord,
} from "./view-model";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    classId?: string | string[];
    date?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDashboardTab(value: string | undefined): DashboardTab {
  if (value === "attendance" || value === "students" || value === "week") {
    return value;
  }

  return "week";
}

function getStatusBadgeClass(status: AttendanceStatus | "unentered") {
  switch (status) {
    case "present":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "absent":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
}

function getTabLabel(tab: DashboardTab) {
  switch (tab) {
    case "week":
      return "今週";
    case "attendance":
      return "出席";
    case "students":
      return "生徒";
  }
}

function renderClassSwitcher(params: {
  availableClasses: Awaited<ReturnType<typeof getTeacherClassesForYear>>;
  selectedClassId?: string;
  selectedDate: string;
  currentTab: DashboardTab;
}) {
  const { availableClasses, selectedClassId, selectedDate, currentTab } = params;

  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">クラス</h2>
          <p className="mt-1 text-sm text-zinc-600">操作対象のクラスを選びます。</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {availableClasses.length} 件
        </span>
      </div>

      {availableClasses.length > 0 ? (
        <div className="mt-5">
          <DashboardClassSwitcher
            currentTab={currentTab}
            options={availableClasses.map((classItem) => ({
              label: classItem.name,
              value: classItem.id,
            }))}
            selectedClassId={selectedClassId}
            selectedDate={selectedDate}
          />
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-zinc-600">
          現在の年度で担当クラスが割り当てられていません。
        </p>
      )}
    </article>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireSession();
  const linkedTeacher = await syncTeacherAuthUser({
    id: session.user.id,
    email: session.user.email,
  });
  const params = await searchParams;
  const currentTab = getDashboardTab(getSingleValue(params.tab));
  const notice = getSingleValue(params.notice);
  const error = getSingleValue(params.error);

  if (linkedTeacher.status !== "linked") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
          <header className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Dashboard
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                認証状態を確認してください
              </h1>
            </div>
            <SignOutButton />
          </header>

          <aside className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
            {linkedTeacher.status === "inactive" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p className="font-semibold">この教師アカウントは無効化されています。</p>
                <p className="mt-2">
                  ログイン自体は成功していますが、管理者が有効化するまで利用できません。
                </p>
              </div>
            ) : null}

            {linkedTeacher.status === "missing" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p className="font-semibold">教師テーブルに一致するメールが見つかりません。</p>
                <p className="mt-2">
                  {linkedTeacher.email} を `teachers.email` に登録してください。
                </p>
              </div>
            ) : null}

            {linkedTeacher.status === "conflict" ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
                <p className="font-semibold">
                  この教師メールには別の Auth ユーザー ID が紐付いています。
                </p>
                <p className="mt-2 break-all">
                  既存の `auth_user_id`: {linkedTeacher.existingAuthUserId}
                </p>
              </div>
            ) : null}
          </aside>
        </main>
      </div>
    );
  }

  const teacher = linkedTeacher.teacher;
  const activeSchoolYear = await getActiveSchoolYear();

  if (!activeSchoolYear) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
          <header className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Dashboard
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                有効な年度がありません
              </h1>
            </div>
            <SignOutButton />
          </header>
        </main>
      </div>
    );
  }

  const sundays = getSundaysInRange(activeSchoolYear.startDate, activeSchoolYear.endDate);
  const availableClasses = await getTeacherClassesForYear(teacher, activeSchoolYear.id);
  const requestedClassId = getSingleValue(params.classId);
  const selectedClass =
    availableClasses.find((classItem) => classItem.id === requestedClassId) ??
    availableClasses[0] ??
    null;
  const selectedDate = sundays.includes(getSingleValue(params.date) ?? "")
    ? (getSingleValue(params.date) as string)
    : getDefaultAttendanceDate(sundays);

  const students = selectedClass
    ? await getClassStudents(selectedClass.id, activeSchoolYear.id)
    : [];
  const studentsForTab = sortStudentsByGrade(students);
  const studentIds = students.map((student) => student.studentId);
  const records = selectedClass
    ? await getClassAttendanceRecords(
        studentIds,
        activeSchoolYear.id,
        activeSchoolYear.startDate,
        activeSchoolYear.endDate,
      )
    : [];

  const selectedDateRecords = new Map<string, SelectedDateRecord>(
    records
      .filter((record) => record.attendanceDate === selectedDate)
      .map((record) => [
        record.studentId,
        {
          status: normalizeAttendanceStatus(record.status),
          note: record.note ?? "",
        },
      ]),
  );

  const historyByDate = buildHistoryByDate({
    records,
    sundays,
  });
  const { absentCount, enteredCount, presentCount, unenteredCount } = getAttendanceCounts({
    selectedDateRecords: selectedDateRecords.values(),
    studentCount: students.length,
  });
  const attendanceEditorItems = buildAttendanceEditorItems({
    selectedDateRecords,
    students,
  });
  const attendanceEditorKey = JSON.stringify({
    currentTab,
    items: attendanceEditorItems,
    selectedClassId: selectedClass?.id ?? "",
    selectedDate,
  });
  const attendanceDateOptions = sundays.map((date) => ({
    label: formatAttendanceDateLabel(date),
    value: date,
  }));

  const tabs: DashboardTab[] = ["week", "attendance", "students"];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.18),_transparent_34%),linear-gradient(180deg,#f6f6ef_0%,#eef4ef_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Dashboard
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {activeSchoolYear.label} の出席管理
              </h1>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <p className="font-semibold">{teacher.email}</p>
                <p>{teacher.role === "admin" ? "管理者" : "教師"}</p>
              </div>
              <SignOutButton />
            </div>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const isActive = tab === currentTab;
              const href = buildDashboardHref({
                tab,
                classId: selectedClass?.id,
                date: selectedDate,
              });

              return (
                <Link
                  key={tab}
                  className={`inline-flex min-w-24 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                  href={href}
                >
                  {getTabLabel(tab)}
                </Link>
              );
            })}
          </nav>
        </header>

        {notice ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-950">
            {error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            {renderClassSwitcher({
              availableClasses,
              selectedClassId: selectedClass?.id,
              selectedDate,
              currentTab,
            })}
          </aside>

          <div className="space-y-6">
            {!selectedClass ? (
              <article className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm backdrop-blur">
                <h2 className="text-xl font-semibold text-zinc-950">担当クラスがありません</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  管理者が現在の年度にクラスを割り当てると、生徒登録と出席入力を開始できます。
                </p>
              </article>
            ) : null}

            {selectedClass && currentTab === "week" ? (
              <>
                <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                        This Week
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                        {formatAttendanceDateLabel(selectedDate)} を含む今週の入力
                      </h2>
                    </div>
                    <Link
                      className="inline-flex rounded-full bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-200"
                      href={buildDashboardHref({
                        tab: "attendance",
                        classId: selectedClass.id,
                        date: selectedDate,
                      })}
                    >
                      他の週を確認する
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm text-emerald-800">出席</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-950">{presentCount}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-sm text-rose-800">欠席</p>
                      <p className="mt-2 text-2xl font-semibold text-rose-950">{absentCount}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm text-zinc-700">未入力</p>
                      <p className="mt-2 text-2xl font-semibold text-zinc-950">{unenteredCount}</p>
                    </div>
                  </div>

                  <AttendanceEditor
                    key={attendanceEditorKey}
                    classId={selectedClass.id}
                    currentTab={currentTab}
                    description={`${formatAttendanceDateLabel(selectedDate)} の出席を保存します。`}
                    items={attendanceEditorItems}
                    saveAttendanceAction={saveAttendanceAction}
                    selectedDate={selectedDate}
                    summaryLabel={`${enteredCount}/${students.length} 名入力済み`}
                  />
                </article>
              </>
            ) : null}

            {selectedClass && currentTab === "attendance" ? (
              <>
                <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                        Attendance
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                        週ごとの確認と再編集
                      </h2>
                      <p className="mt-2 text-sm text-zinc-600">
                        対象週を切り替えて、過去分も含めて出席を見直せます。
                      </p>
                    </div>

                    <div className="w-full max-w-sm">
                      <AttendanceDateSwitcher
                        options={attendanceDateOptions}
                        selectedClassId={selectedClass.id}
                        selectedDate={selectedDate}
                      />
                    </div>
                  </div>

                  <AttendanceEditor
                    key={attendanceEditorKey}
                    classId={selectedClass.id}
                    currentTab={currentTab}
                    description={`${formatAttendanceDateLabel(selectedDate)} の内容を再保存します。`}
                    items={attendanceEditorItems}
                    saveAttendanceAction={saveAttendanceAction}
                    selectedDate={selectedDate}
                    summaryLabel={`${enteredCount}/${students.length} 名入力済み`}
                  />
                </article>

                <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-950">
                        {activeSchoolYear.label} の日曜一覧
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        入力済み件数と週ごとの状態を確認できます。
                      </p>
                    </div>
                    <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700">
                      全 {sundays.length} 週
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {sundays.map((date) => {
                      const summary = historyByDate.get(date)!;
                      const isSelected = date === selectedDate;
                      const state =
                        summary.enteredCount > 0 ? ("present" as const) : ("unentered" as const);

                      return (
                        <Link
                          key={date}
                          className={`block rounded-2xl border p-4 transition ${
                            isSelected
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white"
                          }`}
                          href={buildDashboardHref({
                            tab: "attendance",
                            classId: selectedClass.id,
                            date,
                          })}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-zinc-950">
                                {formatAttendanceDateLabel(date)}
                              </p>
                              <p className="mt-1 text-sm text-zinc-600">
                                出席 {summary.present} 名 / 欠席 {summary.absent} 名
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                  state,
                                )}`}
                              >
                                {summary.enteredCount > 0
                                  ? `${summary.enteredCount}/${students.length} 名入力`
                                  : "未入力"}
                              </span>
                              {isSelected ? (
                                <span className="text-xs font-medium text-emerald-800">表示中</span>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </article>
              </>
            ) : null}

            {selectedClass && currentTab === "students" ? (
              <>
                <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                        Students
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                        生徒一覧
                      </h2>
                      <p className="mt-2 text-sm text-zinc-600">
                        出席操作から切り離し、生徒の確認と登録に集中できるようにしました。
                      </p>
                    </div>
                    <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700">
                      {students.length} 名
                    </div>
                  </div>

                  {students.length > 0 ? (
                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      {studentsForTab.map((student) => (
                        <article
                          key={student.studentId}
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                        >
                          <p className="font-medium text-zinc-950">{student.studentName}</p>
                          <p className="mt-1 text-sm text-zinc-600">
                            {gradeLabels[student.gradeCode]}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-zinc-600">
                      まだ生徒がいません。下のフォームから追加してください。
                    </p>
                  )}
                </article>

                <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <h2 className="text-lg font-semibold text-zinc-950">新しい生徒を登録する</h2>
                  <form action={createStudentAction} className="mt-5 space-y-4">
                    <input type="hidden" name="tab" value="students" />
                    <input type="hidden" name="classId" value={selectedClass.id} />
                    <input type="hidden" name="date" value={selectedDate} />
                    <label className="block space-y-2 text-sm text-zinc-700">
                      <span className="font-medium">生徒名</span>
                      <input
                        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
                        name="studentName"
                        placeholder="例: 日曜 太郎"
                        required
                        type="text"
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-zinc-700">
                      <span className="font-medium">学年</span>
                      <select
                        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
                        defaultValue={selectedClass.gradeCode}
                        name="gradeCode"
                      >
                        {Object.entries(gradeLabels).map(([gradeCode, label]) => (
                          <option key={gradeCode} value={gradeCode}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                      type="submit"
                    >
                      このクラスへ登録する
                    </button>
                  </form>
                </article>
              </>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
