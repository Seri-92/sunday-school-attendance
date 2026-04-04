import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { attendanceStatusValues, type AttendanceStatus } from "@/db/schema";
import {
  attendanceStatusLabels,
  formatAttendanceDateLabel,
  getActiveSchoolYear,
  getClassAttendanceRecords,
  getClassStudents,
  getDefaultAttendanceDate,
  getSundaysInRange,
  getTeacherClassesForYear,
  gradeLabels,
  normalizeAttendanceStatus,
} from "@/lib/attendance";
import { requireSession } from "@/lib/auth/session";
import { syncTeacherAuthUser } from "@/lib/auth/teachers";
import { createStudentAction, saveAttendanceAction } from "./actions";

export const dynamic = "force-dynamic";

type DashboardTab = "week" | "attendance" | "students";

type DashboardPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    classId?: string | string[];
    date?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

type StudentRecord = Awaited<ReturnType<typeof getClassStudents>>[number];

type SelectedDateRecord = {
  status: AttendanceStatus;
  note: string;
};

type HistorySummary = {
  present: number;
  absent: number;
  enteredCount: number;
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

function buildDashboardHref(params: {
  tab?: DashboardTab;
  classId?: string;
  date?: string;
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

  const query = searchParams.toString();

  return query ? `/dashboard?${query}` : "/dashboard";
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
        <form action="/dashboard" className="mt-5 space-y-4">
          <input type="hidden" name="tab" value={currentTab} />
          <input type="hidden" name="date" value={selectedDate} />
          <label className="block space-y-2 text-sm text-zinc-700">
            <span className="font-medium">対象クラス</span>
            <select
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
              defaultValue={selectedClassId}
              name="classId"
            >
              {availableClasses.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="w-full rounded-full bg-zinc-950 px-4 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            表示を切り替える
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm leading-6 text-zinc-600">
          現在の年度で担当クラスが割り当てられていません。
        </p>
      )}
    </article>
  );
}

function renderAttendanceEditor(params: {
  selectedClass: Awaited<ReturnType<typeof getTeacherClassesForYear>>[number];
  students: StudentRecord[];
  selectedDate: string;
  selectedDateRecords: Map<string, SelectedDateRecord>;
  currentTab: DashboardTab;
  description: string;
}) {
  const { selectedClass, students, selectedDate, selectedDateRecords, currentTab, description } = params;

  return (
    <form action={saveAttendanceAction} className="mt-6">
      <input type="hidden" name="tab" value={currentTab} />
      <input type="hidden" name="classId" value={selectedClass.id} />
      <input type="hidden" name="date" value={selectedDate} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="px-3 py-3 font-medium">生徒</th>
              <th className="px-3 py-3 font-medium">学年</th>
              <th className="px-3 py-3 font-medium">状態</th>
              <th className="px-3 py-3 font-medium">メモ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const existing = selectedDateRecords.get(student.studentId);

              return (
                <tr key={student.studentId} className="border-b border-zinc-100 align-top">
                  <td className="px-3 py-4">
                    <p className="font-medium text-zinc-950">{student.studentName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {student.assignmentType === "manual" ? "手動登録" : "自動割当"}
                    </p>
                  </td>
                  <td className="px-3 py-4 text-zinc-700">
                    {gradeLabels[student.currentGradeCode]}
                  </td>
                  <td className="px-3 py-4">
                    <select
                      className="w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-zinc-950"
                      defaultValue={existing?.status ?? "present"}
                      name={`status:${student.studentId}`}
                    >
                      {attendanceStatusValues.map((status) => (
                        <option key={status} value={status}>
                          {attendanceStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-4">
                    <input
                      className="w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-zinc-950"
                      defaultValue={existing?.note ?? ""}
                      name={`note:${student.studentId}`}
                      placeholder="任意メモ"
                      type="text"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">{description}</p>
        <button
          className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
          disabled={students.length === 0}
          type="submit"
        >
          出席を保存する
        </button>
      </div>
    </form>
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

  const historyByDate = new Map<string, HistorySummary>();

  for (const sunday of sundays) {
    historyByDate.set(sunday, {
      present: 0,
      absent: 0,
      enteredCount: 0,
    });
  }

  for (const record of records) {
    const summary = historyByDate.get(record.attendanceDate);

    if (!summary) {
      continue;
    }

    const normalizedStatus = normalizeAttendanceStatus(record.status);

    if (normalizedStatus === "present") {
      summary.present += 1;
    } else if (normalizedStatus === "absent") {
      summary.absent += 1;
    }

    summary.enteredCount += 1;
  }

  const enteredCount = selectedDateRecords.size;
  const presentCount = [...selectedDateRecords.values()].filter(
    (record) => record.status === "present",
  ).length;
  const absentCount = [...selectedDateRecords.values()].filter(
    (record) => record.status === "absent",
  ).length;
  const unenteredCount = Math.max(students.length - enteredCount, 0);

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
              <p className="text-sm leading-6 text-zinc-600">
                今週の入力を優先しつつ、確認用の出席操作と生徒管理を分離しました。
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <p className="font-semibold">{teacher.email}</p>
                <p>
                  {teacher.role === "admin" ? "管理者" : "教師"} / 担当 {availableClasses.length} クラス
                </p>
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

            {selectedClass ? (
              <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-zinc-950">{selectedClass.name}</h2>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <dt className="text-zinc-500">対象日</dt>
                    <dd className="mt-1 font-medium text-zinc-950">
                      {formatAttendanceDateLabel(selectedDate)}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <dt className="text-zinc-500">登録生徒</dt>
                    <dd className="mt-1 font-medium text-zinc-950">{students.length} 名</dd>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <dt className="text-zinc-500">入力済み</dt>
                    <dd className="mt-1 font-medium text-zinc-950">
                      {enteredCount} / {students.length} 名
                    </dd>
                  </div>
                </dl>
              </article>
            ) : null}
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
                      <p className="mt-2 text-sm text-zinc-600">
                        今週の入力に集中できるよう、履歴確認と生徒管理は別タブへ分離しています。
                      </p>
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

                  {renderAttendanceEditor({
                    selectedClass,
                    students,
                    selectedDate,
                    selectedDateRecords,
                    currentTab,
                    description: `${formatAttendanceDateLabel(selectedDate)} の出席を保存します。`,
                  })}
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

                    <form action="/dashboard" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input type="hidden" name="tab" value="attendance" />
                      <input type="hidden" name="classId" value={selectedClass.id} />
                      <select
                        className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950"
                        defaultValue={selectedDate}
                        name="date"
                      >
                        {sundays.map((date) => (
                          <option key={date} value={date}>
                            {formatAttendanceDateLabel(date)}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white"
                        type="submit"
                      >
                        週を表示
                      </button>
                    </form>
                  </div>

                  {renderAttendanceEditor({
                    selectedClass,
                    students,
                    selectedDate,
                    selectedDateRecords,
                    currentTab,
                    description: `${formatAttendanceDateLabel(selectedDate)} の内容を再保存します。`,
                  })}
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

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500">
                          <th className="px-3 py-3 font-medium">日付</th>
                          <th className="px-3 py-3 font-medium">入力状況</th>
                          <th className="px-3 py-3 font-medium">出席</th>
                          <th className="px-3 py-3 font-medium">欠席</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sundays.map((date) => {
                          const summary = historyByDate.get(date)!;
                          const isSelected = date === selectedDate;
                          const state =
                            summary.enteredCount > 0 ? ("present" as const) : ("unentered" as const);

                          return (
                            <tr
                              key={date}
                              className={`border-b border-zinc-100 ${isSelected ? "bg-emerald-50/70" : ""}`}
                            >
                              <td className="px-3 py-4">
                                <Link
                                  className="font-medium text-zinc-950 hover:text-emerald-700"
                                  href={buildDashboardHref({
                                    tab: "attendance",
                                    classId: selectedClass.id,
                                    date,
                                  })}
                                >
                                  {formatAttendanceDateLabel(date)}
                                </Link>
                              </td>
                              <td className="px-3 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                    state,
                                  )}`}
                                >
                                  {summary.enteredCount > 0
                                    ? `${summary.enteredCount}/${students.length} 名入力`
                                    : "未入力"}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-zinc-700">{summary.present}</td>
                              <td className="px-3 py-4 text-zinc-700">{summary.absent}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                      {students.map((student) => (
                        <article
                          key={student.studentId}
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                        >
                          <p className="font-medium text-zinc-950">{student.studentName}</p>
                          <p className="mt-1 text-sm text-zinc-600">
                            {gradeLabels[student.currentGradeCode]}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500">
                            {student.assignmentType === "manual" ? "手動登録" : "自動割当"}
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
