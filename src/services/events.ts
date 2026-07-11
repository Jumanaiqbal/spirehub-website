import { fetchWithTimeout } from "./fetchWithTimeout";

export interface SpireEvent {
  id: number;
  name: string;
  dateBegin: string;
  dateEnd: string;
  description?: string;
  websiteUrl?: string;
  imageUrl?: string;
}

export interface EventRegistration {
  eventId: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export async function fetchUpcomingEvents(): Promise<SpireEvent[]> {
  const response = await fetchWithTimeout("/api/events");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }

  return data.events as SpireEvent[];
}

export async function registerForEvent(
  registration: EventRegistration
): Promise<{ registrationId: number; barcode?: string }> {
  const response = await fetchWithTimeout("/api/events/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registration),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }

  return { registrationId: data.registrationId, barcode: data.barcode };
}
