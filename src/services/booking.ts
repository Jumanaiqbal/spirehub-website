import type { MeetingRoom } from "../data/meetingRooms";
import { getBookingSummary } from "../utils/pricing";
import { meetingRooms as fallbackRooms } from "../data/meetingRooms";
import {
  checkAllAvailabilityFromApi,
  fetchRoomsFromApi,
  submitBookingToApi,
  type BookingRequest,
  type BookingResult,
} from "./api";

export type { BookingRequest, BookingResult };

let cachedRooms: MeetingRoom[] | null = null;
let odooConnected = false;
let odooCheckDone = false;

/** Show sample rooms instantly; sync with Odoo in the background. */
export async function getMeetingRooms(): Promise<{
  rooms: MeetingRoom[];
  fromOdoo: boolean;
}> {
  if (cachedRooms && odooCheckDone) {
    return { rooms: cachedRooms, fromOdoo: odooConnected };
  }

  try {
    const rooms = await fetchRoomsFromApi();
    if (rooms.length > 0) {
      cachedRooms = rooms;
      odooConnected = true;
      odooCheckDone = true;
      return { rooms, fromOdoo: true };
    }
  } catch {
    // Odoo not ready — use fallbacks without blocking the page
  }

  cachedRooms = fallbackRooms;
  odooConnected = false;
  odooCheckDone = true;
  return { rooms: fallbackRooms, fromOdoo: false };
}

export async function refreshMeetingRooms(): Promise<{
  rooms: MeetingRoom[];
  fromOdoo: boolean;
}> {
  odooCheckDone = false;
  cachedRooms = null;
  return getMeetingRooms();
}

export async function checkAllRoomAvailability(
  roomIds: string[],
  date: string,
  time: string,
  duration = 60
): Promise<Record<string, boolean>> {
  const numericIds = roomIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (odooConnected) {
    if (numericIds.length === 0) {
      throw new Error("Rooms are still loading. Please try again in a moment.");
    }
    return checkAllAvailabilityFromApi(
      numericIds.map(String),
      date,
      time,
      duration
    );
  }

  // Demo mode only when Odoo is not connected
  return Object.fromEntries(
    roomIds.map((id) => {
      const hash = `${id}-${date}-${time}-${duration}`.length;
      return [id, hash % 3 !== 0];
    })
  );
}

export async function checkRoomAvailability(
  roomId: string,
  date: string,
  time: string,
  duration = 60
): Promise<boolean> {
  const results = await checkAllRoomAvailability([roomId], date, time, duration);
  return results[roomId] ?? true;
}

export async function submitBooking(
  request: BookingRequest,
  room: MeetingRoom
): Promise<BookingResult> {
  if (odooConnected) {
    return submitBookingToApi(request, room);
  }

  return {
    reference: `SH-${Date.now().toString(36).toUpperCase()}`,
    room,
    date: request.date,
    time: request.time,
    duration: request.duration,
    totalBhd: getBookingSummary(room, request.duration).total,
    layout: request.layout,
    paymentStatus: "not_paid",
  };
}

export function getCachedRooms(): MeetingRoom[] {
  return cachedRooms ?? fallbackRooms;
}

export function isOdooConnected(): boolean {
  return odooConnected;
}
