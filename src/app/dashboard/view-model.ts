import { gradeLabels, normalizeAttendanceStatus } from "@/lib/attendance-shared";
import { gradeCodeValues, type AttendanceStatus, type GradeCode } from "@/db/schema";

export type DashboardTab = "week" | "attendance" | "students";

export type AttendanceEditorStudent = {
  gradeCode: GradeCode;
  studentId: string;
  studentName: string;
};

export type SelectedDateRecord = {
  status: AttendanceStatus;
  note: string;
};

export type AttendanceCounts = {
  absentCount: number;
  enteredCount: number;
  presentCount: number;
  unenteredCount: number;
};

export type AttendanceEditorItem = {
  defaultNote: string;
  defaultStatus: AttendanceStatus;
  gradeLabel: string;
  hasExistingRecord: boolean;
  studentId: string;
  studentName: string;
};

export type AttendanceHistoryRecord = {
  attendanceDate: string;
  note: string | null;
  status: string;
  studentId: string;
};

export type HistorySummary = {
  absent: number;
  enteredCount: number;
  present: number;
};

export type AttendanceDraftValue = {
  note: string;
  status: AttendanceStatus;
};

export type AttendanceDraftState = Record<string, AttendanceDraftValue>;

export type AttendanceStatusTone = {
  summaryCardClassName: string;
  summaryLabelClassName: string;
  summaryValueClassName: string;
  badgeClassName: string;
  optionIdleClassName: string;
  optionCheckedClassName: string;
};

function normalizeDraftNote(note: string) {
  return note.trim();
}

export function getAttendanceStatusTone(
  status: AttendanceStatus | "unentered",
): AttendanceStatusTone {
  switch (status) {
    case "present":
      return {
        badgeClassName: "border-teal-200 bg-teal-50 text-teal-900",
        optionCheckedClassName: "peer-checked:border-teal-700 peer-checked:bg-teal-700 peer-checked:text-white",
        optionIdleClassName: "border-teal-200 bg-white text-teal-900",
        summaryCardClassName: "border-teal-200 bg-teal-50",
        summaryLabelClassName: "text-teal-800",
        summaryValueClassName: "text-teal-950",
      };
    case "absent":
      return {
        badgeClassName: "border-amber-200 bg-amber-50 text-amber-900",
        optionCheckedClassName: "peer-checked:border-amber-600 peer-checked:bg-amber-600 peer-checked:text-white",
        optionIdleClassName: "border-amber-200 bg-white text-amber-900",
        summaryCardClassName: "border-amber-200 bg-amber-50",
        summaryLabelClassName: "text-amber-800",
        summaryValueClassName: "text-amber-950",
      };
    default:
      return {
        badgeClassName: "border-zinc-200 bg-zinc-50 text-zinc-600",
        optionCheckedClassName: "",
        optionIdleClassName: "",
        summaryCardClassName: "border-zinc-200 bg-zinc-50",
        summaryLabelClassName: "text-zinc-700",
        summaryValueClassName: "text-zinc-950",
      };
  }
}

export function buildDashboardHref(params: {
  tab?: DashboardTab;
  classId?: string;
  date?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.tab) {
    searchParams.set("tab", params.tab);
  }

  if (params.classId) {
    searchParams.set("classId", params.classId);
  }

  if (params.date) {
    searchParams.set("date", params.date);
  }

  const query = searchParams.toString();

  return query ? `/dashboard?${query}` : "/dashboard";
}

export function getAttendanceCounts(params: {
  selectedDateRecords: Iterable<SelectedDateRecord>;
  studentCount: number;
}): AttendanceCounts {
  let enteredCount = 0;
  let presentCount = 0;
  let absentCount = 0;

  for (const record of params.selectedDateRecords) {
    enteredCount += 1;

    if (record.status === "present") {
      presentCount += 1;
    } else {
      absentCount += 1;
    }
  }

  return {
    absentCount,
    enteredCount,
    presentCount,
    unenteredCount: Math.max(params.studentCount - enteredCount, 0),
  };
}

export function buildAttendanceEditorItems(params: {
  selectedDateRecords: Map<string, SelectedDateRecord>;
  students: AttendanceEditorStudent[];
}): AttendanceEditorItem[] {
  return params.students.map((student) => {
    const existing = params.selectedDateRecords.get(student.studentId);

    return {
      defaultNote: existing?.note ?? "",
      defaultStatus: existing?.status ?? "absent",
      gradeLabel: gradeLabels[student.gradeCode],
      hasExistingRecord: existing !== undefined,
      studentId: student.studentId,
      studentName: student.studentName,
    };
  });
}

const gradeOrder = new Map(gradeCodeValues.map((gradeCode, index) => [gradeCode, index]));

export function sortStudentsByGrade<T extends { gradeCode: GradeCode; studentName: string }>(
  students: T[],
) {
  return [...students].sort((left, right) => {
    const leftOrder = gradeOrder.get(left.gradeCode) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = gradeOrder.get(right.gradeCode) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.studentName.localeCompare(right.studentName, "ja");
  });
}

export function buildAttendanceDraftInitialState(items: AttendanceEditorItem[]): AttendanceDraftState {
  return Object.fromEntries(
    items.map((item) => [
      item.studentId,
      {
        note: item.defaultNote,
        status: item.defaultStatus,
      },
    ]),
  );
}

export function hasAttendanceDraftChanges(params: {
  draftState: AttendanceDraftState;
  initialState: AttendanceDraftState;
}) {
  const studentIds = new Set([
    ...Object.keys(params.initialState),
    ...Object.keys(params.draftState),
  ]);

  for (const studentId of studentIds) {
    const initialValue = params.initialState[studentId];
    const draftValue = params.draftState[studentId];

    if (!initialValue || !draftValue) {
      return true;
    }

    if (initialValue.status !== draftValue.status) {
      return true;
    }

    if (normalizeDraftNote(initialValue.note) !== normalizeDraftNote(draftValue.note)) {
      return true;
    }
  }

  return false;
}

export function buildHistoryByDate(params: {
  records: AttendanceHistoryRecord[];
  sundays: string[];
}): Map<string, HistorySummary> {
  const historyByDate = new Map<string, HistorySummary>();

  for (const sunday of params.sundays) {
    historyByDate.set(sunday, {
      absent: 0,
      enteredCount: 0,
      present: 0,
    });
  }

  for (const record of params.records) {
    const summary = historyByDate.get(record.attendanceDate);

    if (!summary) {
      continue;
    }

    const normalizedStatus = normalizeAttendanceStatus(record.status);

    if (normalizedStatus === "present") {
      summary.present += 1;
    } else {
      summary.absent += 1;
    }

    summary.enteredCount += 1;
  }

  return historyByDate;
}
