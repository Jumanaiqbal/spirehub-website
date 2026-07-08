/** Format a Date as YYYY-MM-DD in the user's local timezone (not UTC). */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysLocal(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Normalize HH:MM or HH:MM:SS to HH:MM:SS */
export function normalizeTime(time: string): string {
  return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time}:00`;
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC off-by-one in display). */
export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(
  date: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return parseLocalDate(date).toLocaleDateString("en-GB", options);
}
