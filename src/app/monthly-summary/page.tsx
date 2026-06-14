import type { Metadata } from "next";
import {
  formatAttendanceDateLabel,
  getActiveSchoolYear,
  getClassesForYear,
  getClassAttendanceRecords,
  getClassStudents,
  getSundaysInRange,
  getWeeklyAttendanceExtraCounts,
} from "@/lib/attendance";
import {
  buildAttendanceMonthOptions,
  buildMonthlyGroupAttendanceSummaries,
  buildWeeklyGroupAttendanceSummaries,
  formatAttendanceAverageCount,
  formatAttendanceMonthLabel,
  getSundaysForAttendanceMonth,
  resolveAttendanceMonth,
  type AttendanceMonthOption,
  type MonthlyGroupAttendanceSummary,
} from "@/app/dashboard/view-model";
import type { WeeklyAttendanceGroup } from "@/db/schema";
import { MonthSwitcher } from "./month-switcher";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "月次集計 | Sunday School Attendance",
  description: "日曜学校の月ごとの出席集計",
};

type MonthlySummaryPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getGuardianCount(
  countsByDate: Map<string, Record<WeeklyAttendanceGroup, number>>,
  date: string,
  group: WeeklyAttendanceGroup,
) {
  return countsByDate.get(date)?.[group] ?? 0;
}

function EmptyState(props: { monthOptions?: AttendanceMonthOption[] }) {
  return (
    <div className="min-h-screen bg-[#f7f8f4]">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
        <article className="w-full rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Monthly Summary
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            表示できる月がありません
          </h1>
          {props.monthOptions?.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              現在または過去の月に含まれる日曜日が、年度内にまだありません。
            </p>
          ) : null}
        </article>
      </main>
    </div>
  );
}

function SummaryCard(props: { summary: MonthlyGroupAttendanceSummary }) {
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

export default async function MonthlySummaryPage({
  searchParams,
}: MonthlySummaryPageProps) {
  const activeSchoolYear = await getActiveSchoolYear();

  if (!activeSchoolYear) {
    return <EmptyState />;
  }

  const params = await searchParams;
  const sundays = getSundaysInRange(activeSchoolYear.startDate, activeSchoolYear.endDate);
  const monthOptions = buildAttendanceMonthOptions({ sundays });
  const selectedMonth = resolveAttendanceMonth({
    monthOptions,
    requestedMonth: getSingleValue(params.month),
  });

  if (!selectedMonth) {
    return <EmptyState monthOptions={monthOptions} />;
  }

  const selectedDates = getSundaysForAttendanceMonth({
    month: selectedMonth,
    sundays,
  });
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
  const guardianCountsEntries = await Promise.all(
    selectedDates.map(async (date) => {
      const [elementaryWeeklyExtraCounts, juniorHighWeeklyExtraCounts] =
        await Promise.all([
          getWeeklyAttendanceExtraCounts(activeSchoolYear.id, date, "elementary"),
          getWeeklyAttendanceExtraCounts(activeSchoolYear.id, date, "junior_high"),
        ]);

      return [
        date,
        {
          elementary:
            elementaryWeeklyExtraCounts.find((record) => record.category === "guardian")
              ?.headcount ?? 0,
          junior_high:
            juniorHighWeeklyExtraCounts.find((record) => record.category === "guardian")
              ?.headcount ?? 0,
        },
      ] as const;
    }),
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.18),_transparent_34%),linear-gradient(180deg,#f7f8f4_0%,#eef4ef_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Monthly Summary
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                月次集計
              </h1>
              <p className="mt-3 text-xl font-semibold text-zinc-800">
                {formatAttendanceMonthLabel(selectedMonth)}
              </p>
            </div>
            <div className="grid gap-4 sm:items-end">
              <MonthSwitcher
                options={monthOptions}
                selectedMonth={selectedMonth}
              />
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {summaries.map((summary) => (
            <SummaryCard key={summary.group} summary={summary} />
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
                        {formatAttendanceDateLabel(week.date)}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
