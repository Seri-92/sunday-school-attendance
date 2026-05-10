const japanDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  };
}

function toIsoDateFromUtc(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

export function getIsoDateInJapan(date = new Date()) {
  return japanDateFormatter.format(date);
}

export function getSundaysInRange(startDate: string, endDate: string) {
  const startParts = parseIsoDate(startDate);
  const endParts = parseIsoDate(endDate);

  if (!startParts || !endParts) {
    return [];
  }

  const dates: string[] = [];
  let current = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day));
  const end = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day));
  const offset = (7 - current.getUTCDay()) % 7;

  current = addDays(current, offset);

  while (current <= end) {
    dates.push(toIsoDateFromUtc(current));
    current = addDays(current, 7);
  }

  return dates;
}

export function getDefaultAttendanceDate(sundays: string[], today = new Date()) {
  const todayInJapan = getIsoDateInJapan(today);
  const latestPastOrToday = [...sundays]
    .reverse()
    .find((date) => date <= todayInJapan);

  return latestPastOrToday ?? sundays[0] ?? "";
}
