"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { GradeCode } from "@/db/schema";
import { createSingleFlight } from "@/lib/single-flight";
import { gradeLabels } from "@/lib/attendance-shared";

type StudentRegistrationFormProps = {
  classId: string;
  createStudentAction: (formData: FormData) => void | Promise<void>;
  selectedDate: string;
  selectedGradeCode: GradeCode;
};

function SubmitButton(props: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = props.isSubmitting || pending;

  return (
    <button
      className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
      disabled={isDisabled}
      type="submit"
    >
      {isDisabled ? "登録中..." : "このクラスへ登録する"}
    </button>
  );
}

export function StudentRegistrationForm(props: StudentRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const runSingleFlightRef = useRef(createSingleFlight());

  return (
    <form
      action={async (formData) => {
        await runSingleFlightRef.current(async () => {
          setIsSubmitting(true);

          try {
            await props.createStudentAction(formData);
          } finally {
            setIsSubmitting(false);
          }
        });
      }}
      className="mt-5 space-y-4"
    >
      <input type="hidden" name="tab" value="students" />
      <input type="hidden" name="classId" value={props.classId} />
      <input type="hidden" name="date" value={props.selectedDate} />
      <label className="block space-y-2 text-sm text-zinc-700">
        <span className="font-medium">姓</span>
        <input
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
          name="lastName"
          placeholder="例: 日曜"
          required
          type="text"
        />
      </label>
      <label className="block space-y-2 text-sm text-zinc-700">
        <span className="font-medium">名</span>
        <input
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
          name="firstName"
          placeholder="例: 太郎"
          required
          type="text"
        />
      </label>
      <label className="block space-y-2 text-sm text-zinc-700">
        <span className="font-medium">せい（ふりがな）</span>
        <input
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
          name="lastNameKana"
          placeholder="例: にちよう"
          required
          type="text"
        />
      </label>
      <label className="block space-y-2 text-sm text-zinc-700">
        <span className="font-medium">めい（ふりがな）</span>
        <input
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
          name="firstNameKana"
          placeholder="例: たろう"
          required
          type="text"
        />
      </label>
      <label className="block space-y-2 text-sm text-zinc-700">
        <span className="font-medium">学年</span>
        <select
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
          defaultValue={props.selectedGradeCode}
          name="gradeCode"
        >
          {Object.entries(gradeLabels).map(([gradeCode, label]) => (
            <option key={gradeCode} value={gradeCode}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton isSubmitting={isSubmitting} />
    </form>
  );
}
