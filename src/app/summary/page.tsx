import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  formatAttendanceDateLabel,
  getActiveSchoolYear,
  getClassesForYear,
  getClassAttendanceRecords,
  getClassStudents,
  getDefaultAttendanceDate,
  getSundaysInRange,
  getWeeklyAttendanceExtraCounts,
} from "@/lib/attendance";
import { requireSession } from "@/lib/auth/session";
import { syncTeacherAuthUser } from "@/lib/auth/teachers";
import {
  buildAttendanceMonthOptions,
  buildMonthlyGroupAttendanceSummaries,
  buildSummaryDateOptions,
  buildSummaryHref,
  buildWeeklyGroupAttendanceSummaries,
  formatAttendanceAverageCount,
  formatAttendanceMonthLabel,
  getSundaysForAttendanceMonth,
  resolveAttendanceMonth,
  resolveSummarySelectedDate,
  resolveSummaryView,
  type AttendanceMonthOption,
  type MonthlyGroupAttendanceSummary,
  type SummaryView,
  type WeeklyGroupAttendanceSummary,
} from "@/app/dashboard/view-model";
import type { WeeklyAttendanceGroup } from "@/db/schema";
import { SummaryMonthSwitcher, SummaryWeekSwitcher } from "./summary-switchers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "集計 | Sunday School Attendance",
  description: "日曜学校の出席集計",
};

type SummaryPageProps = {
  searchParams: Promise<{
    date?: string | string[];
    month?: string | string[];
    view?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function requireLinkedTeacherForSummary() {
  const session = await requireSession();
  const linkedTeacher = await syncTeacherAuthUser({
    id: session.user.id,
    email: session.user.email,
  });

  if (linkedTeacher.status !== "linked") {
    redirect("/dashboard");
  }
}

function getGuardianCount(
  countsByDate: Map<string, Record<WeeklyAttendanceGroup, number>>,
  date: string,
  group: WeeklyAttendanceGroup,
) {
  return countsByDate.get(date)?.[group] ?? 0;
}

async function getWeeklyGuardianCounts(schoolYearId: string, date: string) {
  const [elementaryWeeklyExtraCounts, juniorHighWeeklyExtraCounts] = await Promise.all([
    getWeeklyAttendanceExtraCounts(schoolYearId, date, "elementary"),
    getWeeklyAttendanceExtraCounts(schoolYearId, date, "junior_high"),
  ]);

  return {
    elementary:
      elementaryWeeklyExtraCounts.find((record) => record.category === "guardian")
        ?.headcount ?? 0,
    junior_high:
      juniorHighWeeklyExtraCounts.find((record) => record.category === "guardian")
        ?.headcount ?? 0,
  };
}

function EmptyState(props: {
  description?: string;
  label: string;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-[#f7f8f4]">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
        <article className="w-full rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
            {props.label}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            {props.title}
          </h1>
          {props.description ? (
            <p className="mt-3 text-sm leading-6 text-zinc-600">{props.description}</p>
          ) : null}
        </article>
      </main>
    </div>
  );
}

function SummaryViewNav(props: {
  currentView: SummaryView;
  selectedDate: string;
  selectedMonth: string;
}) {
  const items: { href: string; label: string; view: SummaryView }[] = [
    {
      href: buildSummaryHref({ date: props.selectedDate, view: "week" }),
      label: "週次",
      view: "week",
    },
    {
      href: buildSummaryHref({ month: props.selectedMonth, view: "month" }),
      label: "月次",
      view: "month",
    },
  ];

  return (
    <nav aria-label="集計表示切り替え" className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const isActive = item.view === props.currentView;

        return (
          <Link
            key={item.view}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-14 items-center justify-center rounded-[1.5rem] border px-4 py-3 text-center text-sm font-semibold transition sm:min-h-16 sm:text-base ${
              isActive
                ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"
            }`}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SummaryShell(props: {
  children: React.ReactNode;
  currentView: SummaryView;
  dateOptions: { label: string; value: string }[];
  selectedDate: string;
  selectedMonth: string;
  monthOptions: AttendanceMonthOption[];
  subtitle: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.18),_transparent_34%),linear-gradient(180deg,#f7f8f4_0%,#eef4ef_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Summary
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                集計
              </h1>
              <p className="mt-3 text-xl font-semibold text-zinc-800">
                {props.subtitle}
              </p>
            </div>
            <Link
              className="inline-flex justify-center rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              href="/dashboard"
            >
              ダッシュボードへ戻る
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <SummaryViewNav
              currentView={props.currentView}
              selectedDate={props.selectedDate}
              selectedMonth={props.selectedMonth}
            />
            {props.currentView === "week" ? (
              <SummaryWeekSwitcher
                options={props.dateOptions}
                selectedDate={props.selectedDate}
              />
            ) : (
              <SummaryMonthSwitcher
                options={props.monthOptions}
                selectedMonth={props.selectedMonth}
              />
            )}
          </div>
        </header>

        {props.children}
      </main>
    </div>
  );
}

function WeeklySummaryCard(props: { summary: WeeklyGroupAttendanceSummary }) {
  const { summary } = props;

  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-950">{summary.label}</h2>
        <div className="rounded-full bg-zinc-950 px-4 py-2 text-base font-semibold text-white">
          {summary.totalCount} 名
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-zinc-50 p-4">
          <dt className="text-sm font-medium text-zinc-600">生徒</dt>
          <dd className="mt-2 text-5xl font-semibold tabular-nums text-zinc-950">
            {summary.studentCount}
          </dd>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4">
          <dt className="text-sm font-medium text-zinc-600">保護者</dt>
          <dd className="mt-2 text-5xl font-semibold tabular-nums text-zinc-950">
            {summary.guardianCount}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function MonthlySummaryCard(props: { summary: MonthlyGroupAttendanceSummary }) {
  const { summary } = props;

  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-950">{summary.label}</h2>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-zinc-50 p-4">
          <dt className="text-sm font-medium text-zinc-600">生徒平均</dt>
          <dd className="mt-2 text-5xl font-semibold tabular-nums text-zinc-950">
            {formatAttendanceAverageCount(summary.studentAverageCount)}
            <span className="ml-2 text-2xl">名</span>
          </dd>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4">
          <dt className="text-sm font-medium text-zinc-600">保護者平均</dt>
          <dd className="mt-2 text-5xl font-semibold tabular-nums text-zinc-950">
            {formatAttendanceAverageCount(summary.guardianAverageCount)}
            <span className="ml-2 text-2xl">名</span>
          </dd>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <dt className="text-sm font-medium text-emerald-800">合計平均</dt>
          <dd className="mt-2 text-5xl font-semibold tabular-nums text-emerald-950">
            {formatAttendanceAverageCount(summary.totalAverageCount)}
            <span className="ml-2 text-2xl">名</span>
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-zinc-600">{summary.weekCount} 回分の平均</p>
    </article>
  );
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  await requireLinkedTeacherForSummary();

  const activeSchoolYear = await getActiveSchoolYear();

  if (!activeSchoolYear) {
    return (
      <EmptyState
        label="Summary"
        title="有効な年度がありません"
      />
    );
  }

  const params = await searchParams;
  const currentView = resolveSummaryView(getSingleValue(params.view));
  const sundays = getSundaysInRange(activeSchoolYear.startDate, activeSchoolYear.endDate);
  const defaultDate = getDefaultAttendanceDate(sundays);
  const selectedDate = resolveSummarySelectedDate({
    defaultDate,
    requestedDate: getSingleValue(params.date),
    sundays,
  });
  const monthOptions = buildAttendanceMonthOptions({ sundays });
  const selectedMonth = resolveAttendanceMonth({
    monthOptions,
    requestedMonth: getSingleValue(params.month),
  });
  const dateOptions = buildSummaryDateOptions({
    selectedDate,
    sundays,
  }).map((date) => ({
    label: formatAttendanceDateLabel(date),
    value: date,
  }));

  if (!selectedDate) {
    return (
      <EmptyState
        description="年度内の日曜日が登録されていません。"
        label="Summary"
        title="表示できる週がありません"
      />
    );
  }

  if (currentView === "month" && !selectedMonth) {
    return (
      <EmptyState
        description="現在または過去の月に含まれる日曜日が、年度内にまだありません。"
        label="Summary"
        title="表示できる月がありません"
      />
    );
  }

  const classes = await getClassesForYear(activeSchoolYear.id);
  const classStudentsEntries = await Promise.all(
    classes.map(async (classItem) => [
      classItem.id,
      await getClassStudents(classItem.id, activeSchoolYear.id),
    ] as const),
  );
  const studentsByClassId = new Map(classStudentsEntries);
  const allStudentIds = [
    ...new Set(
      classStudentsEntries.flatMap(([, classStudents]) =>
        classStudents.map((student) => student.studentId),
      ),
    ),
  ];
  const records = await getClassAttendanceRecords(
    allStudentIds,
    activeSchoolYear.id,
    activeSchoolYear.startDate,
    activeSchoolYear.endDate,
  );

  if (currentView === "week") {
    const guardianCounts = await getWeeklyGuardianCounts(
      activeSchoolYear.id,
      selectedDate,
    );
    const summaries = buildWeeklyGroupAttendanceSummaries({
      classes,
      date: selectedDate,
      guardianCounts,
      records,
      studentsByClassId,
    });
    const totalCount = summaries.reduce((sum, summary) => sum + summary.totalCount, 0);

    return (
      <SummaryShell
        currentView={currentView}
        dateOptions={dateOptions}
        monthOptions={monthOptions}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        subtitle={formatAttendanceDateLabel(selectedDate)}
      >
        <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Weekly Summary
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-950">週次集計</h2>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-950">
              <p className="text-sm font-medium">全体合計</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">
                {totalCount} 名
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {summaries.map((summary) => (
            <WeeklySummaryCard key={summary.group} summary={summary} />
          ))}
        </section>
      </SummaryShell>
    );
  }

  const selectedDates = getSundaysForAttendanceMonth({
    month: selectedMonth,
    sundays,
  });
  const guardianCountsEntries = await Promise.all(
    selectedDates.map(async (date) => [
      date,
      await getWeeklyGuardianCounts(activeSchoolYear.id, date),
    ] as const),
  );
  const guardianCountsByDate = new Map(guardianCountsEntries);
  const summaries = buildMonthlyGroupAttendanceSummaries({
    classes,
    dates: selectedDates,
    guardianCountsByDate,
    records,
    studentsByClassId,
  });
  const weeklySummaries = selectedDates.map((date) => ({
    date,
    summaries: buildWeeklyGroupAttendanceSummaries({
      classes,
      date,
      guardianCounts: {
        elementary: getGuardianCount(guardianCountsByDate, date, "elementary"),
        junior_high: getGuardianCount(guardianCountsByDate, date, "junior_high"),
      },
      records,
      studentsByClassId,
    }),
  }));

  return (
    <SummaryShell
      currentView={currentView}
      dateOptions={dateOptions}
      monthOptions={monthOptions}
      selectedDate={selectedDate}
      selectedMonth={selectedMonth}
      subtitle={formatAttendanceMonthLabel(selectedMonth)}
    >
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {summaries.map((summary) => (
          <MonthlySummaryCard key={summary.group} summary={summary} />
        ))}
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Weekly Breakdown
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950">週ごとの内訳</h2>
          </div>
          <p className="text-sm font-medium text-zinc-600">
            {selectedDates.length} 回分
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-semibold">日付</th>
                <th className="px-4 py-3 text-right font-semibold">幼小科</th>
                <th className="px-4 py-3 text-right font-semibold">中学科</th>
                <th className="px-4 py-3 text-right font-semibold">合計</th>
                <th className="px-4 py-3 text-right font-semibold">週次</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {weeklySummaries.map((week) => {
                const weekTotal = week.summaries.reduce(
                  (sum, summary) => sum + summary.totalCount,
                  0,
                );

                return (
                  <tr key={week.date}>
                    <td className="px-4 py-4 font-medium text-zinc-950">
                      <Link
                        className="underline-offset-4 hover:underline"
                        href={buildSummaryHref({ date: week.date, view: "week" })}
                      >
                        {formatAttendanceDateLabel(week.date)}
                      </Link>
                    </td>
                    {week.summaries.map((summary) => (
                      <td
                        key={summary.group}
                        className="px-4 py-4 text-right tabular-nums text-zinc-700"
                      >
                        {summary.totalCount} 名
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-zinc-950">
                      {weekTotal} 名
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                        href={buildSummaryHref({ date: week.date, view: "week" })}
                      >
                        見る
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </SummaryShell>
  );
}
