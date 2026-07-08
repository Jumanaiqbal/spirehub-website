import type { MeetingRoom } from "../data/meetingRooms";
import { findRoomPricing } from "../data/roomPricing";
import { getBookingSummary } from "../utils/pricing";
import { fetchWithTimeout } from "./fetchWithTimeout";

export interface ApiRoom {
  id: number;
  name: string;
  shortCode?: string;
  description?: string;
  capacity?: number;
  amenities?: string;
  bookingUrl?: string;
  imageUrl?: string;
}

export function mapApiRoomToMeetingRoom(room: ApiRoom): MeetingRoom {
  const pricing = findRoomPricing(room.id, room.name);
  const defaultCapacity = pricing?.capacity ?? room.capacity ?? 6;

  return {
    id: String(room.id),
    name: room.name,
    capacity: defaultCapacity,
    floor: room.shortCode ? `Code ${room.shortCode}` : "Spire Hub",
    amenities: room.amenities
      ? room.amenities.split(",").map((a) => a.trim()).filter(Boolean)
      : ["WiFi", "Display"],
    image:
      room.imageUrl ??
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=500&fit=crop",
    description: room.description ?? "Meeting room at Spire Hub.",
    odooId: room.id,
    bookingUrl: room.bookingUrl,
    hourlyRate: pricing?.hourlyRate ?? 5.5,
    vatIncluded: pricing?.vatIncluded ?? true,
    isWorkshop: pricing?.isWorkshop ?? false,
    layouts: pricing?.layouts,
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export async function fetchRoomsFromApi(): Promise<MeetingRoom[]> {
  const data = await apiFetch<{ rooms: ApiRoom[] }>("/api/rooms");
  return data.rooms.map(mapApiRoomToMeetingRoom);
}

export async function checkAllAvailabilityFromApi(
  roomIds: string[],
  date: string,
  time: string,
  duration = 60
): Promise<Record<string, boolean>> {
  const params = new URLSearchParams({
    date,
    time,
    duration: String(duration),
    roomIds: roomIds.join(","),
  });
  const data = await apiFetch<{ availability: Record<string, boolean> }>(
    `/api/availability?${params}`
  );
  return data.availability;
}

export async function checkAvailabilityFromApi(
  roomId: string,
  date: string,
  time: string,
  duration = 60
): Promise<boolean> {
  const result = await checkAllAvailabilityFromApi([roomId], date, time, duration);
  return result[roomId] ?? true;
}

export interface BookingRequest {
  roomId: string;
  date: string;
  time: string;
  duration: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
  layout?: string;
}

export interface BookingResult {
  reference: string;
  room: MeetingRoom;
  date: string;
  time: string;
  duration: number;
  totalBhd: number;
  layout?: string;
  paymentStatus: "not_paid";
}

export async function submitBookingToApi(
  request: BookingRequest,
  room: MeetingRoom
): Promise<BookingResult> {
  const noteParts = [request.notes?.trim()].filter(Boolean);
  if (request.layout) {
    noteParts.unshift(`Layout: ${request.layout}`);
  }

  const { total } = getBookingSummary(room, request.duration);

  const data = await apiFetch<{
    booking: { id: number; name: string; paymentStatus: "not_paid" };
  }>(
    "/api/bookings",
    {
      method: "POST",
      body: JSON.stringify({
        roomId: Number(request.roomId),
        date: request.date,
        time: request.time,
        duration: request.duration,
        name: request.name,
        email: request.email,
        phone: request.phone,
        company: request.company,
        notes: noteParts.join("\n") || undefined,
        amountBhd: total,
        layout: request.layout,
      }),
    }
  );

  return {
    reference: data.booking.name,
    room,
    date: request.date,
    time: request.time,
    duration: request.duration,
    totalBhd: total,
    layout: request.layout,
    paymentStatus: data.booking.paymentStatus,
  };
}

export async function checkOdooHealth(): Promise<boolean> {
  try {
    await apiFetch("/api/health");
    return true;
  } catch {
    return false;
  }
}
