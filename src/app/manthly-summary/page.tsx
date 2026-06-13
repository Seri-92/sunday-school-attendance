import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "月次集計 | Sunday School Attendance",
  description: "日曜学校の月ごとの出席集計",
};

type ManthlySummaryPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ManthlySummaryPage({
  searchParams,
}: ManthlySummaryPageProps) {
  const params = await searchParams;
  const month = getSingleValue(params.month);

  redirect(
    month
      ? `/monthly-summary?month=${encodeURIComponent(month)}`
      : "/monthly-summary",
  );
}
