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
import { buildWeeklyGroupAttendanceSummaries } from "@/app/dashboard/view-model";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "今週の集計 | Sunday School Attendance",
  description: "日曜学校の今週の出席集計",
};

export default async function WeeklySummaryPage() {
  const activeSchoolYear = await getActiveSchoolYear();

  if (!activeSchoolYear) {
    return (
      <div className="min-h-screen bg-[#f7f8f4]">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
          <article className="w-full rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
              Weekly Summary
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
              有効な年度がありません
            </h1>
          </article>
        </main>
      </div>
    );
  }

  const sundays = getSundaysInRange(activeSchoolYear.startDate, activeSchoolYear.endDate);
  const selectedDate = getDefaultAttendanceDate(sundays);
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
  const [elementaryWeeklyExtraCounts, juniorHighWeeklyExtraCounts] = await Promise.all([
    getWeeklyAttendanceExtraCounts(activeSchoolYear.id, selectedDate, "elementary"),
    getWeeklyAttendanceExtraCounts(activeSchoolYear.id, selectedDate, "junior_high"),
  ]);
  const elementaryGuardianCount =
    elementaryWeeklyExtraCounts.find((record) => record.category === "guardian")
      ?.headcount ?? 0;
  const juniorHighGuardianCount =
    juniorHighWeeklyExtraCounts.find((record) => record.category === "guardian")
      ?.headcount ?? 0;
  const summaries = buildWeeklyGroupAttendanceSummaries({
    classes,
    date: selectedDate,
    guardianCounts: {
      elementary: elementaryGuardianCount,
      junior_high: juniorHighGuardianCount,
    },
    records,
    studentsByClassId,
  });
  const totalCount = summaries.reduce((sum, summary) => sum + summary.totalCount, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.18),_transparent_34%),linear-gradient(180deg,#f7f8f4_0%,#eef4ef_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-8 sm:px-8 sm:py-12">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Weekly Summary
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                今週の集計
              </h1>
              <p className="mt-3 text-xl font-semibold text-zinc-800">
                {formatAttendanceDateLabel(selectedDate)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-950">
              <p className="text-sm font-medium">全体合計</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">{totalCount} 名</p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {summaries.map((summary) => (
            <article
              key={summary.group}
              className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8"
            >
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
          ))}
        </section>
      </main>
    </div>
  );
}
