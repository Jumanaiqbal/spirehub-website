import { fetchWithTimeout } from "./fetchWithTimeout";
import type { MeetingRoom } from "../data/meetingRooms";

export interface CheckoutResult {
  checkoutId: string;
  merchantTransactionId: string;
  amount: number;
  baseUrl: string;
}

export async function createCheckout(params: {
  roomId: string;
  durationMinutes: number;
}): Promise<CheckoutResult> {
  const response = await fetchWithTimeout("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId: Number(params.roomId),
      durationMinutes: params.durationMinutes,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data as CheckoutResult;
}

export interface PendingBooking {
  room: MeetingRoom;
  date: string;
  time: string;
  duration: number;
  layout?: string;
  totalBhd: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  pending?: boolean;
  message?: string;
  booking?: { id: number; name: string; paymentStatus: "paid" };
}

export async function verifyPayment(
  resourcePath: string,
  pending: PendingBooking
): Promise<VerifyPaymentResult> {
  const response = await fetchWithTimeout("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resourcePath,
      roomId: Number(pending.room.odooId ?? pending.room.id),
      date: pending.date,
      time: pending.time,
      duration: pending.duration,
      layout: pending.layout,
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      company: pending.company,
      notes: pending.notes,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data as VerifyPaymentResult;
}
