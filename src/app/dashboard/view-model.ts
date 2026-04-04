import { gradeLabels, normalizeAttendanceStatus } from "@/lib/attendance-shared";
import type { AttendanceStatus } from "@/db/schema";

export type AttendanceEditorStudent = {
  assignmentType: "auto" | "manual";
  currentGradeCode: keyof typeof gradeLabels;
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
  assignmentLabel: string;
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
      assignmentLabel: student.assignmentType === "manual" ? "手動登録" : "自動割当",
      defaultNote: existing?.note ?? "",
      defaultStatus: existing?.status ?? "present",
      gradeLabel: gradeLabels[student.currentGradeCode],
      hasExistingRecord: existing !== undefined,
      studentId: student.studentId,
      studentName: student.studentName,
    };
  });
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
