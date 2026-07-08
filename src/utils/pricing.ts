import type { MeetingRoom } from "../data/meetingRooms";

/** Format amount in Bahraini Dinar (3 decimal places). */
export function formatBhd(amount: number): string {
  return `BD ${amount.toFixed(3)}`;
}

/** Total rent = hourly rate × duration in hours. */
export function calculateBookingTotal(
  hourlyRate: number,
  durationMinutes: number
): number {
  const hours = durationMinutes / 60;
  return Math.round(hourlyRate * hours * 1000) / 1000;
}

export function getRoomHourlyRate(room: MeetingRoom): number {
  return room.hourlyRate ?? 5.5;
}

export function getBookingSummary(
  room: MeetingRoom,
  durationMinutes: number
): {
  hourlyRate: number;
  hours: number;
  total: number;
  vatIncluded: boolean;
} {
  const hourlyRate = getRoomHourlyRate(room);
  const hours = durationMinutes / 60;
  const total = calculateBookingTotal(hourlyRate, durationMinutes);
  return {
    hourlyRate,
    hours,
    total,
    vatIncluded: room.vatIncluded ?? true,
  };
}
