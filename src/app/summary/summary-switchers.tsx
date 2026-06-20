"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  buildSummaryHref,
  type AttendanceMonthOption,
} from "@/app/dashboard/view-model";

type SummaryOption = {
  label: string;
  value: string;
};

export function SummaryWeekSwitcher(props: {
  options: SummaryOption[];
  selectedDate: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="block min-w-0 space-y-2 text-sm text-zinc-700 sm:min-w-64">
      <span className="font-medium">表示する週</span>
      <select
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 disabled:cursor-wait disabled:bg-zinc-100"
        disabled={isPending}
        name="date"
        onChange={(event) => {
          const nextDate = event.target.value;

          startTransition(() => {
            router.push(buildSummaryHref({ date: nextDate, view: "week" }));
          });
        }}
        value={props.selectedDate}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SummaryMonthSwitcher(props: {
  options: AttendanceMonthOption[];
  selectedMonth: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="block min-w-0 space-y-2 text-sm text-zinc-700 sm:min-w-64">
      <span className="font-medium">表示する月</span>
      <select
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 disabled:cursor-wait disabled:bg-zinc-100"
        disabled={isPending}
        name="month"
        onChange={(event) => {
          const nextMonth = event.target.value;

          startTransition(() => {
            router.push(buildSummaryHref({ month: nextMonth, view: "month" }));
          });
        }}
        value={props.selectedMonth}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
