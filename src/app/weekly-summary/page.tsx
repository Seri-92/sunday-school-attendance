import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildSummaryHref } from "@/app/dashboard/view-model";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "週次集計 | Sunday School Attendance",
  description: "日曜学校の週ごとの出席集計",
};

type WeeklySummaryPageProps = {
  searchParams: Promise<{
    date?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WeeklySummaryPage({
  searchParams,
}: WeeklySummaryPageProps) {
  const params = await searchParams;

  redirect(buildSummaryHref({ date: getSingleValue(params.date), view: "week" }));
}
