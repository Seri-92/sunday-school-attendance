export type ClassListItem = {
  id: string;
  name: string;
  sortOrder: number;
};

export function sortClassesByDisplayOrder<T extends ClassListItem>(classes: T[]) {
  return [...classes].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name, "ja");
  });
}
