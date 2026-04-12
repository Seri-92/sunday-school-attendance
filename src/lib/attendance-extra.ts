import type { AttendanceExtraCategory, GradeCode } from "@/db/schema";

export const guardianAttendanceExtraCategory = "guardian" as const;
export const guardianAttendanceExtraFieldName = "guardianCount" as const;
export const juniorHighOtherAttendanceExtraCategory =
  "junior_high_other" as const;
export const juniorHighOtherAttendanceExtraFieldName =
  "juniorHighOtherCount" as const;
export const juniorHighClassName = "中学科" as const;

export type AttendanceExtraCountRecord = {
  category: AttendanceExtraCategory;
  headcount: number;
};

export type AttendanceExtraCountInput = {
  category: AttendanceExtraCategory;
  defaultValue: number;
  description: string;
  hasExistingValue: boolean;
  label: string;
  name: string;
};

export function supportsJuniorHighOtherAttendanceExtra(params: {
  className: string;
  gradeCode: GradeCode;
}) {
  return params.className === juniorHighClassName;
}

export function buildGuardianAttendanceExtraInput(
  existingCount?: number | null,
): AttendanceExtraCountInput {
  return {
    category: guardianAttendanceExtraCategory,
    defaultValue: existingCount ?? 0,
    description: "保護者の人数を記録します。",
    hasExistingValue: existingCount !== null && existingCount !== undefined,
    label: "保護者",
    name: guardianAttendanceExtraFieldName,
  };
}

export function buildJuniorHighOtherAttendanceExtraInput(params: {
  className: string;
  existingCount?: number | null;
  gradeCode: GradeCode;
}): AttendanceExtraCountInput | null {
  if (!supportsJuniorHighOtherAttendanceExtra(params)) {
    return null;
  }

  return {
    category: juniorHighOtherAttendanceExtraCategory,
    defaultValue: params.existingCount ?? 0,
    description: "中学科の出席と一緒に、その他人数を記録します。",
    hasExistingValue: params.existingCount !== null && params.existingCount !== undefined,
    label: "その他",
    name: juniorHighOtherAttendanceExtraFieldName,
  };
}

export function parseAttendanceExtraHeadcount(
  rawValue: FormDataEntryValue | null | undefined,
) {
  if (rawValue === null || rawValue === undefined) {
    return 0;
  }

  const normalizedValue = String(rawValue).trim();

  if (normalizedValue === "") {
    return 0;
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  return Number(normalizedValue);
}
