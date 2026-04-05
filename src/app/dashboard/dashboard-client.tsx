"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { AttendanceStatus } from "@/db/schema";
import {
  buildAttendanceDraftInitialState,
  buildDashboardHref,
  getAttendanceStatusTone,
  hasAttendanceDraftChanges,
  type AttendanceDraftState,
  type AttendanceEditorItem,
  type DashboardTab,
} from "./view-model";

type SwitcherOption = {
  label: string;
  value: string;
};

type AttendanceEditorProps = {
  classId: string;
  currentTab: DashboardTab;
  description: string;
  items: AttendanceEditorItem[];
  saveAttendanceAction: (formData: FormData) => void | Promise<void>;
  selectedDate: string;
  summaryLabel: string;
};

type DashboardClassSwitcherProps = {
  currentTab: DashboardTab;
  options: SwitcherOption[];
  selectedClassId?: string;
  selectedDate: string;
};

type AttendanceDateSwitcherProps = {
  options: SwitcherOption[];
  selectedClassId: string;
  selectedDate: string;
};

function StickySaveBar(props: {
  description: string;
  hasChanges: boolean;
  isDisabled: boolean;
  summaryLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-950">{props.summaryLabel}</p>
          <p className="text-xs text-zinc-600">
            {pending
              ? "保存中です。完了するまでお待ちください。"
              : props.hasChanges
                ? "未保存の変更があります。"
                : props.description}
          </p>
        </div>
        <button
          className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
          disabled={props.isDisabled || pending}
          type="submit"
        >
          {pending ? "保存中..." : "出席を保存する"}
        </button>
      </div>
    </div>
  );
}

function DashboardQuerySelect(props: {
  currentTab: DashboardTab;
  date?: string;
  options: SwitcherOption[];
  selectedClassId?: string;
  value?: string;
  valueKey: "classId" | "date";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 disabled:cursor-wait disabled:bg-zinc-100"
      disabled={isPending}
      name={props.valueKey}
      onChange={(event) => {
        const nextValue = event.target.value;

        startTransition(() => {
          router.push(
            buildDashboardHref({
              classId: props.valueKey === "classId" ? nextValue : props.selectedClassId,
              date: props.valueKey === "date" ? nextValue : props.date,
              tab: props.currentTab,
            }),
          );
        });
      }}
      value={props.value}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function DashboardClassSwitcher(props: DashboardClassSwitcherProps) {
  return (
    <label className="block space-y-2 text-sm text-zinc-700">
      <span className="font-medium">対象クラス</span>
      <DashboardQuerySelect
        currentTab={props.currentTab}
        date={props.selectedDate}
        options={props.options}
        selectedClassId={props.selectedClassId}
        value={props.selectedClassId}
        valueKey="classId"
      />
    </label>
  );
}

export function AttendanceDateSwitcher(props: AttendanceDateSwitcherProps) {
  return (
    <DashboardQuerySelect
      currentTab="attendance"
      date={props.selectedDate}
      options={props.options}
      selectedClassId={props.selectedClassId}
      value={props.selectedDate}
      valueKey="date"
    />
  );
}

function updateDraftState(params: {
  nextNote?: string;
  nextStatus?: AttendanceStatus;
  previousState: AttendanceDraftState;
  studentId: string;
}) {
  const currentValue = params.previousState[params.studentId];

  return {
    ...params.previousState,
    [params.studentId]: {
      note: params.nextNote ?? currentValue.note,
      status: params.nextStatus ?? currentValue.status,
    },
  };
}

export function AttendanceEditor(props: AttendanceEditorProps) {
  const initialState = buildAttendanceDraftInitialState(props.items);
  const [draftState, setDraftState] = useState(initialState);
  const hasChanges = hasAttendanceDraftChanges({
    draftState,
    initialState,
  });

  return (
    <form action={props.saveAttendanceAction} className="mt-6">
      <input type="hidden" name="tab" value={props.currentTab} />
      <input type="hidden" name="classId" value={props.classId} />
      <input type="hidden" name="date" value={props.selectedDate} />
      <div className="space-y-4 pb-32">
        {props.items.map((item) => {
          const currentValue = draftState[item.studentId];

          return (
            <article
              key={item.studentId}
              className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/90 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-950">{item.studentName}</p>
                  <p className="mt-1 text-sm text-zinc-600">{item.gradeLabel}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.hasExistingRecord
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {item.hasExistingRecord ? "入力済みを再編集" : "今回入力"}
                  </span>
                </div>
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium text-zinc-700">出席状態</legend>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(["present", "absent"] as const).map((status) => {
                    const inputId = `${props.currentTab}-${props.selectedDate}-${item.studentId}-${status}`;
                    const tone = getAttendanceStatusTone(status);

                    return (
                      <div key={status}>
                        <input
                          checked={currentValue.status === status}
                          className="peer sr-only"
                          id={inputId}
                          name={`status:${item.studentId}`}
                          onChange={() => {
                            setDraftState((previousState) =>
                              updateDraftState({
                                nextStatus: status,
                                previousState,
                                studentId: item.studentId,
                              }),
                            );
                          }}
                          type="radio"
                          value={status}
                        />
                        <label
                          className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-4 text-base font-semibold transition ${tone.optionIdleClassName} ${tone.optionCheckedClassName}`}
                          htmlFor={inputId}
                        >
                          {status === "present" ? "出席" : "欠席"}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <label className="mt-5 block space-y-2 text-sm text-zinc-700">
                <span className="font-medium">メモ</span>
                <input
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
                  name={`note:${item.studentId}`}
                  onChange={(event) => {
                    const nextNote = event.target.value;

                    setDraftState((previousState) =>
                      updateDraftState({
                        nextNote,
                        previousState,
                        studentId: item.studentId,
                      }),
                    );
                  }}
                  placeholder="任意メモ"
                  type="text"
                  value={currentValue.note}
                />
              </label>
            </article>
          );
        })}
      </div>

      <StickySaveBar
        description={props.description}
        hasChanges={hasChanges}
        isDisabled={props.items.length === 0}
        summaryLabel={props.summaryLabel}
      />
    </form>
  );
}
