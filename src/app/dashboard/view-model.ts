import type { AttendanceExtraCountInput } from "@/lib/attendance-extra";
import { getWeeklyAttendanceGroup } from "@/lib/attendance-extra";
import { gradeLabels, normalizeAttendanceStatus } from "@/lib/attendance-shared";
import {
  gradeCodeValues,
  type AttendanceStatus,
  type GradeCode,
  type WeeklyAttendanceGroup,
} from "@/db/schema";

export type DashboardTab = "week" | "attendance" | "students";

export type AttendanceEditorStudent = {
  firstName: string;
  firstNameKana: string;
  gradeCode: GradeCode;
  lastName: string;
  lastNameKana: string;
  studentId: string;
  studentName: string;
  studentNameKana?: string;
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
  firstName: string;
  firstNameKana: string;
  gradeLabel: string;
  hasExistingRecord: boolean;
  lastName: string;
  lastNameKana: string;
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

export type AttendanceSummaryBadge = {
  count: number;
  label: string;
  tone: AttendanceStatusTone;
};

export type WeeklyAttendancePresentStudent = {
  studentId: string;
  studentName: string;
};

export type WeeklyAttendanceHistoryItem = {
  absentCount: number;
  date: string;
  enteredCount: number;
  presentCount: number;
  presentStudents: WeeklyAttendancePresentStudent[];
  unenteredCount: number;
};

export type StudentAttendanceHistoryItem = {
  date: string;
  note: string;
  status: AttendanceStatus | "unentered";
};

export type WeeklyGroupAttendanceSummary = {
  group: WeeklyAttendanceGroup;
  guardianCount: number;
  label: string;
  studentCount: number;
  totalCount: number;
};

export type MonthlyGroupAttendanceSummary = {
  group: WeeklyAttendanceGroup;
  guardianAverageCount: number;
  label: string;
  studentAverageCount: number;
  totalAverageCount: number;
  weekCount: number;
};

export type AttendanceMonthOption = {
  label: string;
  value: string;
};

function normalizeDraftNote(note: string) {
  return note.trim();
}

function normalizeExtraCountValue(value: string) {
  return value.trim() === "" ? "0" : value.trim();
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
  studentId?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.tab) {
    searchParams.set("tab", params.tab);
  }

  if (params.classId) {
    searchParams.set("classId", params.classId);
  }

  if (params.date && params.tab !== "week") {
    searchParams.set("date", params.date);
  }

  if (params.studentId) {
    searchParams.set("studentId", params.studentId);
  }

  const query = searchParams.toString();

  return query ? `/dashboard?${query}` : "/dashboard";
}

export function resolveDashboardSelectedDate(params: {
  currentTab: DashboardTab;
  defaultDate: string;
  requestedDate?: string;
  sundays: string[];
}) {
  if (
    params.currentTab !== "week" &&
    params.requestedDate &&
    params.sundays.includes(params.requestedDate)
  ) {
    return params.requestedDate;
  }

  return params.defaultDate;
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

export function buildAttendanceSummaryBadges(
  counts: AttendanceCounts,
): AttendanceSummaryBadge[] {
  return [
    {
      count: counts.presentCount,
      label: "出席",
      tone: getAttendanceStatusTone("present"),
    },
    {
      count: counts.absentCount,
      label: "欠席",
      tone: getAttendanceStatusTone("absent"),
    },
    {
      count: counts.unenteredCount,
      label: "未入力",
      tone: getAttendanceStatusTone("unentered"),
    },
  ];
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
      firstName: student.firstName,
      firstNameKana: student.firstNameKana,
      gradeLabel: gradeLabels[student.gradeCode],
      hasExistingRecord: existing !== undefined,
      lastName: student.lastName,
      lastNameKana: student.lastNameKana,
      studentId: student.studentId,
      studentName: student.studentName,
    };
  });
}

export function buildWeeklyGroupAttendanceSummaries(params: {
  classes: { gradeCode: GradeCode; id: string; name: string }[];
  date: string;
  guardianCounts: Record<WeeklyAttendanceGroup, number>;
  records: AttendanceHistoryRecord[];
  studentsByClassId: Map<string, { studentId: string }[]>;
}): WeeklyGroupAttendanceSummary[] {
  const studentGroupById = new Map<string, WeeklyAttendanceGroup>();

  for (const classItem of params.classes) {
    const group = getWeeklyAttendanceGroup({
      className: classItem.name,
      gradeCode: classItem.gradeCode,
    });
    const students = params.studentsByClassId.get(classItem.id) ?? [];

    for (const student of students) {
      studentGroupById.set(student.studentId, group);
    }
  }

  const presentStudentIdsByGroup: Record<WeeklyAttendanceGroup, Set<string>> = {
    elementary: new Set(),
    junior_high: new Set(),
  };

  for (const record of params.records) {
    if (record.attendanceDate !== params.date) {
      continue;
    }

    const group = studentGroupById.get(record.studentId);

    if (!group || normalizeAttendanceStatus(record.status) !== "present") {
      continue;
    }

    presentStudentIdsByGroup[group].add(record.studentId);
  }

  return [
    {
      group: "elementary",
      label: "幼小科",
      guardianCount: params.guardianCounts.elementary,
      studentCount: presentStudentIdsByGroup.elementary.size,
      totalCount:
        presentStudentIdsByGroup.elementary.size + params.guardianCounts.elementary,
    },
    {
      group: "junior_high",
      label: "中学科",
      guardianCount: params.guardianCounts.junior_high,
      studentCount: presentStudentIdsByGroup.junior_high.size,
      totalCount:
        presentStudentIdsByGroup.junior_high.size + params.guardianCounts.junior_high,
    },
  ];
}

const japanMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "2-digit",
  timeZone: "Asia/Tokyo",
  year: "numeric",
});

function getMonthInJapan(date: Date) {
  return japanMonthFormatter.format(date).slice(0, 7);
}

export function formatAttendanceMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  if (!match) {
    return month;
  }

  return `${match[1]}年${Number(match[2])}月`;
}

export function buildAttendanceMonthOptions(params: {
  sundays: string[];
  today?: Date;
}): AttendanceMonthOption[] {
  const currentMonth = getMonthInJapan(params.today ?? new Date());
  const months = new Set<string>();

  for (const sunday of params.sundays) {
    const month = sunday.slice(0, 7);

    if (month <= currentMonth) {
      months.add(month);
    }
  }

  return [...months]
    .sort((left, right) => right.localeCompare(left))
    .map((month) => ({
      label: formatAttendanceMonthLabel(month),
      value: month,
    }));
}

export function resolveAttendanceMonth(params: {
  monthOptions: AttendanceMonthOption[];
  requestedMonth?: string;
}) {
  if (
    params.requestedMonth &&
    params.monthOptions.some((option) => option.value === params.requestedMonth)
  ) {
    return params.requestedMonth;
  }

  return params.monthOptions[0]?.value ?? "";
}

export function getSundaysForAttendanceMonth(params: {
  month: string;
  sundays: string[];
}) {
  return params.sundays.filter((sunday) => sunday.startsWith(`${params.month}-`));
}

export function formatAttendanceAverageCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildMonthlyGroupAttendanceSummaries(params: {
  classes: { gradeCode: GradeCode; id: string; name: string }[];
  dates: string[];
  guardianCountsByDate: Map<string, Record<WeeklyAttendanceGroup, number>>;
  records: AttendanceHistoryRecord[];
  studentsByClassId: Map<string, { studentId: string }[]>;
}): MonthlyGroupAttendanceSummary[] {
  const studentGroupById = new Map<string, WeeklyAttendanceGroup>();

  for (const classItem of params.classes) {
    const group = getWeeklyAttendanceGroup({
      className: classItem.name,
      gradeCode: classItem.gradeCode,
    });
    const students = params.studentsByClassId.get(classItem.id) ?? [];

    for (const student of students) {
      studentGroupById.set(student.studentId, group);
    }
  }

  const targetDates = new Set(params.dates);
  const studentCounts: Record<WeeklyAttendanceGroup, number> = {
    elementary: 0,
    junior_high: 0,
  };
  const guardianCounts: Record<WeeklyAttendanceGroup, number> = {
    elementary: 0,
    junior_high: 0,
  };

  for (const date of params.dates) {
    const counts = params.guardianCountsByDate.get(date);

    guardianCounts.elementary += counts?.elementary ?? 0;
    guardianCounts.junior_high += counts?.junior_high ?? 0;
  }

  for (const record of params.records) {
    if (!targetDates.has(record.attendanceDate)) {
      continue;
    }

    const group = studentGroupById.get(record.studentId);

    if (!group || normalizeAttendanceStatus(record.status) !== "present") {
      continue;
    }

    studentCounts[group] += 1;
  }

  const weekCount = params.dates.length;
  const divisor = weekCount > 0 ? weekCount : 1;
  const elementaryStudentAverageCount = studentCounts.elementary / divisor;
  const elementaryGuardianAverageCount = guardianCounts.elementary / divisor;
  const juniorHighStudentAverageCount = studentCounts.junior_high / divisor;
  const juniorHighGuardianAverageCount = guardianCounts.junior_high / divisor;

  return [
    {
      group: "elementary",
      guardianAverageCount: elementaryGuardianAverageCount,
      label: "幼小科",
      studentAverageCount: elementaryStudentAverageCount,
      totalAverageCount:
        elementaryStudentAverageCount + elementaryGuardianAverageCount,
      weekCount,
    },
    {
      group: "junior_high",
      guardianAverageCount: juniorHighGuardianAverageCount,
      label: "中学科",
      studentAverageCount: juniorHighStudentAverageCount,
      totalAverageCount:
        juniorHighStudentAverageCount + juniorHighGuardianAverageCount,
      weekCount,
    },
  ];
}

const gradeOrder = new Map(gradeCodeValues.map((gradeCode, index) => [gradeCode, index]));

export function sortStudentsByGrade<
  T extends { gradeCode: GradeCode; studentName: string; studentNameKana?: string },
>(
  students: T[],
) {
  return [...students].sort((left, right) => {
    const leftOrder = gradeOrder.get(left.gradeCode) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = gradeOrder.get(right.gradeCode) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftKana = left.studentNameKana || left.studentName;
    const rightKana = right.studentNameKana || right.studentName;
    const kanaCompare = leftKana.localeCompare(rightKana, "ja");

    if (kanaCompare !== 0) {
      return kanaCompare;
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

export function isWeekAttendanceReadonly(params: {
  currentTab: DashboardTab;
  hasExistingRecords: boolean;
  isEditingAll: boolean;
}) {
  return params.currentTab === "week" && params.hasExistingRecords && !params.isEditingAll;
}

export function canSubmitWeeklyAttendanceExtraForm(params: {
  currentTab: DashboardTab;
  hasExistingRecords: boolean;
  isEditingAll: boolean;
}) {
  return !isWeekAttendanceReadonly(params);
}

export function isAttendanceEditorReadonly(params: {
  currentTab: DashboardTab;
  hasExistingRecords: boolean;
  isEditingAll: boolean;
}) {
  return (
    (params.currentTab === "week" || params.currentTab === "attendance") &&
    params.hasExistingRecords &&
    !params.isEditingAll
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

export function hasAttendanceExtraCountChanges(params: {
  currentValue: string;
  extraCountInput: AttendanceExtraCountInput | null;
}) {
  if (!params.extraCountInput) {
    return false;
  }

  return (
    normalizeExtraCountValue(params.currentValue) !==
    String(params.extraCountInput.defaultValue)
  );
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

export function buildWeeklyAttendanceHistory(params: {
  records: AttendanceHistoryRecord[];
  students: AttendanceEditorStudent[];
  sundays: string[];
}): WeeklyAttendanceHistoryItem[] {
  const sortedStudents = sortStudentsByGrade(params.students);
  const knownStudentIds = new Set(sortedStudents.map((student) => student.studentId));
  const statusByDate = new Map<string, Map<string, AttendanceStatus>>();

  for (const sunday of params.sundays) {
    statusByDate.set(sunday, new Map());
  }

  for (const record of params.records) {
    const dateStatuses = statusByDate.get(record.attendanceDate);

    if (!dateStatuses || !knownStudentIds.has(record.studentId)) {
      continue;
    }

    dateStatuses.set(record.studentId, normalizeAttendanceStatus(record.status));
  }

  return params.sundays.map((date) => {
    const dateStatuses = statusByDate.get(date) ?? new Map<string, AttendanceStatus>();
    const presentStudents: WeeklyAttendancePresentStudent[] = [];
    let absentCount = 0;

    for (const student of sortedStudents) {
      const status = dateStatuses.get(student.studentId);

      if (!status) {
        continue;
      }

      if (status === "present") {
        presentStudents.push({
          studentId: student.studentId,
          studentName: student.studentName,
        });
      } else {
        absentCount += 1;
      }
    }

    const presentCount = presentStudents.length;
    const enteredCount = presentCount + absentCount;

    return {
      absentCount,
      date,
      enteredCount,
      presentCount,
      presentStudents,
      unenteredCount: Math.max(sortedStudents.length - enteredCount, 0),
    };
  });
}

export function buildStudentAttendanceHistory(params: {
  records: AttendanceHistoryRecord[];
  studentId: string;
  sundays: string[];
}): StudentAttendanceHistoryItem[] {
  const recordsByDate = new Map(
    params.records
      .filter((record) => record.studentId === params.studentId)
      .map((record) => [record.attendanceDate, record]),
  );

  return params.sundays.map((date) => {
    const record = recordsByDate.get(date);

    if (!record) {
      return {
        date,
        note: "",
        status: "unentered",
      };
    }

    return {
      date,
      note: record.note ?? "",
      status: normalizeAttendanceStatus(record.status),
    };
  });
}

export function getWeeklyAttendanceHistorySummaryLabel(
  week: Pick<WeeklyAttendanceHistoryItem, "absentCount" | "presentCount">,
) {
  return `出席 ${week.presentCount} 名 / 欠席 ${week.absentCount} 名`;
}

export function getWeeklyAttendanceHistoryInputBadgeLabel(
  week: Pick<WeeklyAttendanceHistoryItem, "enteredCount">,
) {
  return week.enteredCount > 0 ? `${week.enteredCount} 名入力` : "入力なし";
}
