import type { GradeCode } from "@/db/schema";
import { sortClassesByDisplayOrder } from "@/lib/class-order";

export type StudentAssignableClass = {
  gradeCode: GradeCode;
  id: string;
  name: string;
  sortOrder: number;
};

export function resolveDefaultClassForGrade<T extends StudentAssignableClass>(
  classes: T[],
  gradeCode: GradeCode,
) {
  return sortClassesByDisplayOrder(classes).find((classItem) => classItem.gradeCode === gradeCode) ?? null;
}
