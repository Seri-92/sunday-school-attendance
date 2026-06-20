import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildSummaryHref } from "@/app/dashboard/view-model";

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

export default async function MonthlySummaryPage({
  searchParams,
}: MonthlySummaryPageProps) {
  const params = await searchParams;

  redirect(buildSummaryHref({ month: getSingleValue(params.month), view: "month" }));
}
