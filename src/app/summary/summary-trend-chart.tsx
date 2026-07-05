"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { SummaryTrendChartRow } from "@/app/dashboard/view-model";

type SummaryTrendChartProps = {
  emptyMessage: string;
  heading: string;
  rows: SummaryTrendChartRow[];
  subtitle: string;
  unitLabel: string;
};

function SummaryTrendTooltip({
  active,
  payload,
}: TooltipContentProps) {
  const row = payload?.[0]?.payload as SummaryTrendChartRow | undefined;

  if (!active || !row) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="font-semibold text-zinc-950">{row.label}</p>
      <dl className="mt-2 grid gap-1 text-zinc-600">
        <div className="flex min-w-40 items-center justify-between gap-6">
          <dt>合計</dt>
          <dd className="font-semibold tabular-nums text-zinc-950">
            {row.totalLabel}
          </dd>
        </div>
        <div className="flex min-w-40 items-center justify-between gap-6">
          <dt>幼小科</dt>
          <dd className="tabular-nums text-zinc-800">{row.elementaryLabel}</dd>
        </div>
        <div className="flex min-w-40 items-center justify-between gap-6">
          <dt>中学科</dt>
          <dd className="tabular-nums text-zinc-800">{row.juniorHighLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

export function SummaryTrendChart(props: SummaryTrendChartProps) {
  return (
    <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Trend
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
            {props.heading}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{props.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-zinc-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-zinc-950" />
            合計
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-zinc-500" />
            幼小科
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0 w-6 border-t-2 border-dashed border-zinc-400" />
            中学科
          </span>
        </div>
      </div>

      {props.rows.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
          {props.emptyMessage}
        </p>
      ) : (
        <>
          <div
            aria-label={`${props.heading}の${props.unitLabel}折れ線グラフ`}
            className="mt-6 h-64 w-full sm:h-72"
            role="img"
          >
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={props.rows}
                margin={{ bottom: 8, left: 0, right: 8, top: 8 }}
              >
                <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval="preserveStartEnd"
                  minTickGap={18}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickLine={false}
                  width={34}
                />
                <Tooltip
                  content={(tooltipProps) => (
                    <SummaryTrendTooltip {...tooltipProps} />
                  )}
                  cursor={{ stroke: "#a1a1aa", strokeDasharray: "4 4" }}
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="totalCount"
                  dot={{ r: 3, strokeWidth: 2 }}
                  isAnimationActive={false}
                  name="合計"
                  stroke="#18181b"
                  strokeWidth={3}
                  type="linear"
                />
                <Line
                  activeDot={{ r: 4 }}
                  dataKey="elementaryCount"
                  dot={false}
                  isAnimationActive={false}
                  name="幼小科"
                  stroke="#71717a"
                  strokeWidth={2}
                  type="linear"
                />
                <Line
                  activeDot={{ r: 4 }}
                  dataKey="juniorHighCount"
                  dot={false}
                  isAnimationActive={false}
                  name="中学科"
                  stroke="#a1a1aa"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  type="linear"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500 sm:grid">
              <span>期間</span>
              <span className="text-right">合計</span>
              <span className="text-right">幼小科</span>
              <span className="text-right">中学科</span>
            </div>
            <div className="divide-y divide-zinc-200 bg-white">
              {props.rows.map((row) => (
                <Link
                  key={row.value}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-4 py-4 transition hover:bg-zinc-50 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] sm:items-center"
                  href={row.href}
                >
                  <span className="text-sm font-semibold text-zinc-950">
                    {row.label}
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-zinc-950">
                    <span className="sm:hidden">合計 </span>
                    {row.totalLabel}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-600 sm:text-right">
                    <span className="sm:hidden">幼小科 </span>
                    {row.elementaryLabel}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-600 sm:text-right">
                    <span className="sm:hidden">中学科 </span>
                    {row.juniorHighLabel}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
