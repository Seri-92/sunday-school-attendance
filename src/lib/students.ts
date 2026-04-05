export type StudentName = {
  lastName: string;
  firstName: string;
};

export type StudentNameKana = {
  lastNameKana: string;
  firstNameKana: string;
};

export type StudentNameRecord = StudentName & StudentNameKana;

function joinStudentName(parts: string[]) {
  return parts.filter((part) => part.trim().length > 0).join(" ");
}

export function buildStudentName(name: StudentName) {
  return joinStudentName([name.lastName, name.firstName]);
}

export function buildStudentNameKana(name: StudentNameKana) {
  return joinStudentName([name.lastNameKana, name.firstNameKana]);
}

export function compareStudentNames<T extends StudentNameRecord>(left: T, right: T) {
  const leftKana = buildStudentNameKana(left) || buildStudentName(left);
  const rightKana = buildStudentNameKana(right) || buildStudentName(right);
  const kanaCompare = leftKana.localeCompare(
    rightKana,
    "ja",
  );

  if (kanaCompare !== 0) {
    return kanaCompare;
  }

  return buildStudentName(left).localeCompare(buildStudentName(right), "ja");
}
