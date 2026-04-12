"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { AttendanceStatus } from "@/db/schema";
import type { AttendanceExtraCountInput } from "@/lib/attendance-extra";
import {
  buildAttendanceDraftInitialState,
  buildDashboardHref,
  getAttendanceStatusTone,
  hasAttendanceDraftChanges,
  hasAttendanceExtraCountChanges,
  isWeekAttendanceReadonly,
  type AttendanceDraftState,
  type AttendanceEditorItem,
  type DashboardTab,
} from "./view-model";
import { StudentName } from "./student-name";

type SwitcherOption = {
  label: string;
  value: string;
};

type AttendanceEditorProps = {
  classId: string;
  currentTab: DashboardTab;
  description: string;
  extraCountInput?: AttendanceExtraCountInput | null;
  items: AttendanceEditorItem[];
  saveAttendanceAction: (formData: FormData) => void | Promise<void>;
  selectedDate: string;
  summaryLabel: string;
};

type WeeklyAttendanceExtraFormProps = {
  classId?: string;
  currentTab: DashboardTab;
  description: string;
  extraCountInput: AttendanceExtraCountInput;
  saveWeeklyAttendanceExtraAction: (formData: FormData) => void | Promise<void>;
  selectedDate: string;
  title: string;
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

function getAttendanceStatusLabel(status: AttendanceStatus) {
  return status === "present" ? "出席" : "欠席";
}

export function AttendanceEditor(props: AttendanceEditorProps) {
  const initialState = buildAttendanceDraftInitialState(props.items);
  const [draftState, setDraftState] = useState(initialState);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [extraCountValue, setExtraCountValue] = useState(
    props.extraCountInput ? String(props.extraCountInput.defaultValue) : "",
  );
  const hasExistingRecords = props.items.some((item) => item.hasExistingRecord);
  const isReadonly = isWeekAttendanceReadonly({
    currentTab: props.currentTab,
    hasExistingRecords,
    isEditingAll,
  });
  const hasChanges =
    hasAttendanceDraftChanges({
      draftState,
      initialState,
    }) ||
    hasAttendanceExtraCountChanges({
      currentValue: extraCountValue,
      extraCountInput: props.extraCountInput ?? null,
    });

  return (
    <form action={props.saveAttendanceAction} className="mt-6">
      <input type="hidden" name="tab" value={props.currentTab} />
      <input type="hidden" name="classId" value={props.classId} />
      <input type="hidden" name="date" value={props.selectedDate} />
      <div className="space-y-4 pb-32">
        {props.extraCountInput && !isReadonly ? (
          <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Attendance Extra
                </p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                  {props.extraCountInput.label}の人数
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {props.extraCountInput.description}
                </p>
              </div>
              <label className="block min-w-40 space-y-2 text-sm text-zinc-700">
                <span className="font-medium">{props.extraCountInput.label}</span>
                <input
                  className="w-full rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-zinc-950"
                  inputMode="numeric"
                  min={0}
                  name={props.extraCountInput.name}
                  onChange={(event) => {
                    setExtraCountValue(event.target.value);
                  }}
                  step={1}
                  type="number"
                  value={extraCountValue}
                />
              </label>
            </div>
          </section>
        ) : null}

        {isReadonly ? (
          <section className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-5 shadow-sm">
            {props.extraCountInput ? (
              <input name={props.extraCountInput.name} type="hidden" value={extraCountValue} />
            ) : null}
            {props.items.map((item) => {
              const currentValue = draftState[item.studentId];
              const currentTone = getAttendanceStatusTone(currentValue.status);

              return (
                <div key={item.studentId}>
                  <input name={`status:${item.studentId}`} type="hidden" value={currentValue.status} />
                  <input name={`note:${item.studentId}`} type="hidden" value={currentValue.note} />
                </div>
              );
            })}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">出席記録済み</h3>
                <p className="mt-1 text-sm text-zinc-600">誰が出席したかを確認できます。</p>
                {props.extraCountInput ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    {props.extraCountInput.label}: {extraCountValue} 名
                  </p>
                ) : null}
              </div>
              <button
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                onClick={() => {
                  setIsEditingAll(true);
                }}
                type="button"
              >
                全体を訂正する
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {props.items.map((item) => {
                const currentValue = draftState[item.studentId];
                const currentTone = getAttendanceStatusTone(currentValue.status);

                return (
                  <div
                    key={item.studentId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <StudentName
                        firstName={item.firstName}
                        firstNameKana={item.firstNameKana}
                        lastName={item.lastName}
                        lastNameKana={item.lastNameKana}
                        nameClassName="text-sm font-semibold text-zinc-950"
                      />
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${currentTone.badgeClassName}`}
                    >
                      {getAttendanceStatusLabel(currentValue.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          props.items.map((item) => {
            const currentValue = draftState[item.studentId];

            return (
              <article
                key={item.studentId}
                className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/90 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StudentName
                      firstName={item.firstName}
                      firstNameKana={item.firstNameKana}
                      lastName={item.lastName}
                      lastNameKana={item.lastNameKana}
                      nameClassName="text-lg font-semibold text-zinc-950"
                    />
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
          })
        )}
      </div>

      <StickySaveBar
        description={props.description}
        hasChanges={hasChanges}
        isDisabled={props.items.length === 0 || isReadonly}
        summaryLabel={props.summaryLabel}
      />
    </form>
  );
}

export function WeeklyAttendanceExtraForm(props: WeeklyAttendanceExtraFormProps) {
  const [extraCountValue, setExtraCountValue] = useState(
    String(props.extraCountInput.defaultValue),
  );
  const [isEditing, setIsEditing] = useState(false);
  const isReadonly = isWeekAttendanceReadonly({
    currentTab: props.currentTab,
    hasExistingRecords: props.extraCountInput.hasExistingValue,
    isEditingAll: isEditing,
  });
  const hasChanges = hasAttendanceExtraCountChanges({
    currentValue: extraCountValue,
    extraCountInput: props.extraCountInput,
  });

  return (
    <form action={props.saveWeeklyAttendanceExtraAction}>
      <input type="hidden" name="tab" value={props.currentTab} />
      <input type="hidden" name="classId" value={props.classId ?? ""} />
      <input type="hidden" name="date" value={props.selectedDate} />
      {isReadonly ? (
        <input name={props.extraCountInput.name} type="hidden" value={extraCountValue} />
      ) : null}
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Attendance Extra
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950">{props.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{props.description}</p>
          </div>
          {isReadonly ? (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <p className="text-sm text-zinc-600">{props.extraCountInput.label}の人数</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{extraCountValue} 名</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div />
                <button
                  className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                  onClick={() => {
                    setIsEditing(true);
                  }}
                  type="button"
                >
                  訂正する
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="block space-y-2 text-sm text-zinc-700">
                <span className="font-medium">{props.extraCountInput.label}の人数</span>
                <input
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
                  inputMode="numeric"
                  min={0}
                  name={props.extraCountInput.name}
                  onChange={(event) => {
                    setExtraCountValue(event.target.value);
                  }}
                  step={1}
                  type="number"
                  value={extraCountValue}
                />
              </label>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-600">
                  {hasChanges ? "未保存の変更があります。" : props.extraCountInput.description}
                </p>
                <button
                  className="rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                  type="submit"
                >
                  保存する
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </form>
  );
}
