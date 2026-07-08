/**
 * Odoo stores datetimes in UTC via JSON-RPC.
 * The website collects Bahrain local times — convert before read/write.
 */

export function normalizeTime(time: string): string {
  return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time}:00`;
}

/** UTC offset for hub local time (e.g. Asia/Bahrain = +3). */
export function resolveUtcOffsetHours(env: Record<string, string>): number {
  if (env.ODOO_UTC_OFFSET_HOURS) {
    return Number(env.ODOO_UTC_OFFSET_HOURS);
  }

  const timeZone = env.ODOO_TIMEZONE ?? "Asia/Bahrain";
  if (timeZone === "Asia/Bahrain" || timeZone === "Asia/Qatar") {
    return 3;
  }

  // Generic fallback via Intl (no DST in Bahrain; useful for other regions)
  const jan = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(jan);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+3";
  const match = offsetPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (match) {
    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const mins = Number(match[3] ?? 0);
    return sign * (hours + mins / 60);
  }

  return 3;
}

function formatOdooUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/** Hub local wall-clock → Odoo UTC storage string. */
export function hubLocalToOdooUtc(
  date: string,
  time: string,
  utcOffsetHours: number
): string {
  const normalized = normalizeTime(time);
  const [year, month, day] = date.split("-").map(Number);
  const [hours, mins, secs = 0] = normalized.split(":").map(Number);
  const utc = new Date(
    Date.UTC(year, month - 1, day, hours - utcOffsetHours, mins, secs)
  );
  return formatOdooUtc(utc);
}

export function addMinutesOdooUtc(datetimeUtc: string, minutes: number): string {
  const [datePart, timePart] = datetimeUtc.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, mins, secs] = timePart.split(":").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, hours, mins, secs));
  anchor.setUTCMinutes(anchor.getUTCMinutes() + minutes);
  return formatOdooUtc(anchor);
}

export function buildBookingSlot(
  date: string,
  time: string,
  durationMinutes: number,
  utcOffsetHours: number
): { start: string; stop: string } {
  const start = hubLocalToOdooUtc(date, time, utcOffsetHours);
  const stop = addMinutesOdooUtc(start, durationMinutes);
  return { start, stop };
}
