import { fetchWithTimeout } from "./fetchWithTimeout";

export type EventQuestionType =
  | "simple_choice"
  | "text_box"
  | "name"
  | "email"
  | "phone"
  | "company_name";

export interface EventQuestion {
  id: number;
  title: string;
  type: EventQuestionType;
  required: boolean;
  sequence: number;
  options: { id: number; name: string }[];
}

export interface SpireEvent {
  id: number;
  name: string;
  dateBegin: string;
  dateEnd: string;
  description?: string;
  websiteUrl?: string;
  imageUrl?: string;
  organizer?: string;
  venueName?: string;
  venueAddress?: string;
  questions?: EventQuestion[];
}

export interface EventRegistrationAnswer {
  questionId: number;
  text?: string;
  answerId?: number;
}

export interface EventRegistration {
  eventId: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  answers?: EventRegistrationAnswer[];
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
