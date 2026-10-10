import { fetchWithTimeout } from "./fetchWithTimeout";
import { getToken } from "./portal";
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
  // Optional customer/booking context so the server can alert the team if the
  // checkout is later abandoned. Not required to start a payment.
  roomName?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  date?: string;
  time?: string;
  layout?: string;
}): Promise<CheckoutResult> {
  // Send the member token if signed in, so the server can apply the workshop
  // 50% member discount (server-verified — never trusted from the client).
  const token = getToken();
  const response = await fetchWithTimeout("/api/payments/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      roomId: Number(params.roomId),
      durationMinutes: params.durationMinutes,
      roomName: params.roomName,
      name: params.name,
      email: params.email,
      phone: params.phone,
      company: params.company,
      date: params.date,
      time: params.time,
      layout: params.layout,
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
  // Send the member token (if signed in) so the server applies the same
  // workshop discount when re-checking the charged amount — otherwise a
  // member's discounted payment would fail the amount check.
  const token = getToken();
  const response = await fetchWithTimeout(
    "/api/payments/verify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        resourcePath,
        roomId: Number(pending.room.odooId ?? pending.room.id),
        roomName: pending.room.name,
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
    },
    30_000
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data as VerifyPaymentResult;
}
