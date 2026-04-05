import type { TeacherRole } from "@/db/schema";

export type TeacherClassAccessPolicy = "all-classes";

export function getTeacherClassAccessPolicy(_teacherRole: TeacherRole): TeacherClassAccessPolicy {
  return "all-classes";
}

export function shouldFilterClassesByAssignment(teacherRole: TeacherRole) {
  return getTeacherClassAccessPolicy(teacherRole) !== "all-classes";
}

export function canTeacherManageClass(params: {
  teacherRole: TeacherRole;
  isAssignedToClass: boolean;
}) {
  if (getTeacherClassAccessPolicy(params.teacherRole) === "all-classes") {
    return true;
  }

  return params.isAssignedToClass;
}
