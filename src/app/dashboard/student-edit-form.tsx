"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { GradeCode } from "@/db/schema";
import { gradeLabels } from "@/lib/attendance-shared";
import { createSingleFlight } from "@/lib/single-flight";

type StudentEditFormProps = {
  cancelHref: string;
  classId: string;
  firstName: string;
  firstNameKana: string;
  gradeCode: GradeCode;
  lastName: string;
  lastNameKana: string;
  selectedDate: string;
  studentId: string;
  updateStudentAction: (formData: FormData) => void | Promise<void>;
};

function SubmitButton(props: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = props.isSubmitting || pending;

  return (
    <button
      className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-zinc-300 sm:w-auto"
      disabled={isDisabled}
      type="submit"
    >
      {isDisabled ? "保存中..." : "保存する"}
    </button>
  );
}

export function StudentEditForm(props: StudentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const runSingleFlightRef = useRef(createSingleFlight());

  return (
    <form
      action={async (formData) => {
        await runSingleFlightRef.current(async () => {
          setIsSubmitting(true);

          try {
            await props.updateStudentAction(formData);
          } finally {
            setIsSubmitting(false);
          }
        });
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="classId" value={props.classId} />
      <input type="hidden" name="date" value={props.selectedDate} />
      <input type="hidden" name="studentId" value={props.studentId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm text-zinc-700">
          <span className="font-medium">姓</span>
          <input
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
            defaultValue={props.lastName}
            name="lastName"
            required
            type="text"
          />
        </label>
        <label className="block space-y-2 text-sm text-zinc-700">
          <span className="font-medium">名</span>
          <input
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
            defaultValue={props.firstName}
            name="firstName"
            required
            type="text"
          />
        </label>
        <label className="block space-y-2 text-sm text-zinc-700">
          <span className="font-medium">せい（ふりがな）</span>
          <input
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
            defaultValue={props.lastNameKana}
            name="lastNameKana"
            required
            type="text"
          />
        </label>
        <label className="block space-y-2 text-sm text-zinc-700">
          <span className="font-medium">めい（ふりがな）</span>
          <input
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
            defaultValue={props.firstNameKana}
            name="firstNameKana"
            required
            type="text"
          />
        </label>
      </div>
      <label className="block space-y-2 text-sm text-zinc-700">
        <span className="font-medium">学年</span>
        <select
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
          defaultValue={props.gradeCode}
          name="gradeCode"
        >
          {Object.entries(gradeLabels).map(([gradeCode, label]) => (
            <option key={gradeCode} value={gradeCode}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          className="inline-flex justify-center rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          href={props.cancelHref}
        >
          キャンセル
        </Link>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}
