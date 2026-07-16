import type { OdooEnv } from "./client";
import { create, messagePost, searchRead } from "./client";
import { buildBookingSlot } from "./datetime";

export const WEBSITE_PAYMENT_STATUS = "not_paid" as const;

export interface OdooRoom {
  id: number;
  name: string;
  shortCode?: string;
  description?: string;
  capacity?: number;
  amenities?: string;
  bookingUrl?: string;
  imageUrl?: string;
}

export interface OdooBookingPayload {
  roomId: number;
  date: string;
  time: string;
  durationMinutes: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
  amountBhd?: number;
  layout?: string;
  paid?: boolean;
  paymentReference?: string;
}

function roomFields(odoo: OdooEnv): string[] {
  return odoo.roomFields.split(",").map((f) => f.trim()).filter(Boolean);
}

function bookingFields(odoo: OdooEnv): string[] {
  return odoo.bookingFields.split(",").map((f) => f.trim()).filter(Boolean);
}

function buildImageUrl(odoo: OdooEnv, roomId: number): string {
  return `${odoo.url}/web/image?model=${odoo.roomModel}&id=${roomId}&field=room_background_image`;
}

/**
 * Odoo room ID -> local static image override.
 * Use when Odoo's own image field is missing or stuck serving a stale cached image.
 */
const ROOM_IMAGE_OVERRIDES: Record<number, string> = {
  1: "/rooms/meeting-room-1.jpeg",
  2: "/rooms/workshop-classroom.jpeg",
  3: "/rooms/meeting-room-2.jpeg",
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRoomId(roomField: unknown): number | null {
  if (Array.isArray(roomField)) {
    return Number(roomField[0]) || null;
  }
  if (typeof roomField === "number") {
    return roomField;
  }
  return null;
}


export async function listOdooRooms(odoo: OdooEnv): Promise<OdooRoom[]> {
  const fields = roomFields(odoo);
  const records = await searchRead(odoo, odoo.roomModel, [], fields);

  return records.map((record) => {
    const id = Number(record.id);
    const rawDescription = record.description ? String(record.description) : "";
    return {
      id,
      name: String(record.name ?? "Meeting Room"),
      shortCode: record.short_code ? String(record.short_code) : undefined,
      description: rawDescription ? stripHtml(rawDescription) : undefined,
      capacity: 8,
      bookingUrl: record.room_booking_url ? String(record.room_booking_url) : undefined,
      imageUrl:
        ROOM_IMAGE_OVERRIDES[id] ??
        (record.room_background_image ? buildImageUrl(odoo, id) : undefined),
    };
  });
}

async function findConflictingRoomIds(
  odoo: OdooEnv,
  roomIds: number[],
  start: string,
  stop: string
): Promise<Set<number>> {
  if (roomIds.length === 0) {
    return new Set();
  }

  const conflicts = await searchRead(
    odoo,
    odoo.bookingModel,
    [
      ["room_id", "in", roomIds],
      ["start_datetime", "<", stop],
      ["stop_datetime", ">", start],
    ],
    ["room_id"],
    200
  );

  const booked = new Set<number>();
  for (const record of conflicts) {
    const roomId = extractRoomId(record.room_id);
    if (roomId) {
      booked.add(roomId);
    }
  }
  return booked;
}

export async function checkOdooRoomAvailability(
  odoo: OdooEnv,
  roomId: number,
  date: string,
  time: string,
  durationMinutes = 60
): Promise<boolean> {
  const { start, stop } = buildBookingSlot(
    date,
    time,
    durationMinutes,
    odoo.utcOffsetHours
  );
  const booked = await findConflictingRoomIds(odoo, [roomId], start, stop);
  return !booked.has(roomId);
}

export async function findOrCreatePartner(
  odoo: OdooEnv,
  payload: OdooBookingPayload
): Promise<number> {
  const existing = await searchRead(
    odoo,
    "res.partner",
    [["email", "=", payload.email]],
    ["id"],
    1
  );

  if (existing.length > 0) {
    return Number(existing[0].id);
  }

  return create(odoo, "res.partner", {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    company_name: payload.company || false,
    comment: payload.notes || false,
  });
}

export async function createOdooBooking(
  odoo: OdooEnv,
  payload: OdooBookingPayload
): Promise<{ id: number; name: string; paymentStatus: "paid" | typeof WEBSITE_PAYMENT_STATUS }> {
  const available = await checkOdooRoomAvailability(
    odoo,
    payload.roomId,
    payload.date,
    payload.time,
    payload.durationMinutes
  );

  if (!available) {
    throw new Error("This room is no longer available for the selected time slot.");
  }

  const { start, stop } = buildBookingSlot(
    payload.date,
    payload.time,
    payload.durationMinutes,
    odoo.utcOffsetHours
  );

  const guestDetails = [
    payload.name,
    payload.company,
    payload.email,
    payload.phone,
  ]
    .filter(Boolean)
    .join(" — ");

  const bookingName = payload.paid
    ? `[PAID] Website — ${guestDetails}`
    : `[NOT PAID] Website — ${guestDetails}`;

  try {
    await findOrCreatePartner(odoo, payload);
  } catch {
    // Booking should still succeed if contact sync fails
  }

  const bookingId = await create(odoo, odoo.bookingModel, {
    name: bookingName,
    room_id: payload.roomId,
    start_datetime: start,
    stop_datetime: stop,
  });

  const amountLine =
    payload.amountBhd != null
      ? `Amount due: BD ${payload.amountBhd.toFixed(3)} (VAT incl.)\n`
      : "";

  const layoutLine = payload.layout ? `Layout: ${payload.layout}\n` : "";

  const internalNote = [
    payload.paid ? "Website booking — PAID ONLINE" : "Website booking — NOT PAID",
    payload.paid
      ? `Payment status: Paid online via AFS. Reference: ${payload.paymentReference ?? "n/a"}.`
      : "Payment status: Not paid — Spire team to contact guest.",
    "",
    amountLine && amountLine.trim(),
    `Duration: ${payload.durationMinutes} minutes`,
    layoutLine && layoutLine.trim(),
    payload.notes ? `Guest notes: ${payload.notes}` : "",
    "",
    `Booked via spire-hub website on ${payload.date} at ${payload.time} (Bahrain time).`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await messagePost(odoo, odoo.bookingModel, bookingId, internalNote);
  } catch {
    // Booking stands even if the internal note fails
  }

  const created = await searchRead(
    odoo,
    odoo.bookingModel,
    [["id", "=", bookingId]],
    bookingFields(odoo),
    1
  );

  const record = created[0];
  return {
    id: bookingId,
    name: String(record?.name ?? bookingName),
    paymentStatus: payload.paid ? "paid" : WEBSITE_PAYMENT_STATUS,
  };
}

export async function checkAllOdooRoomAvailability(
  odoo: OdooEnv,
  roomIds: number[],
  date: string,
  time: string,
  durationMinutes = 60
): Promise<Record<number, boolean>> {
  const uniqueIds = [...new Set(roomIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const { start, stop } = buildBookingSlot(
    date,
    time,
    durationMinutes,
    odoo.utcOffsetHours
  );
  const booked = await findConflictingRoomIds(odoo, uniqueIds, start, stop);

  return Object.fromEntries(
    uniqueIds.map((roomId) => [roomId, !booked.has(roomId)])
  );
}

export async function testOdooConnection(odoo: OdooEnv) {
  const rooms = await listOdooRooms(odoo);
  return { connected: true, roomCount: rooms.length };
}
