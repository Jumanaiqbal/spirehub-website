import type { OdooEnv } from "./client";
import { create, searchRead } from "./client";

export type EventQuestionType =
  | "simple_choice"
  | "text_box"
  | "name"
  | "email"
  | "phone"
  | "company_name";

export interface OdooEventQuestion {
  id: number;
  title: string;
  type: EventQuestionType;
  required: boolean;
  sequence: number;
  /** Choices for simple_choice questions; empty otherwise. */
  options: { id: number; name: string }[];
}

export interface OdooEvent {
  id: number;
  name: string;
  dateBegin: string;
  dateEnd: string;
  description?: string;
  websiteUrl?: string;
  imageUrl?: string;
  organizer?: string;
  venueName?: string;
  /** Multi-line postal address of the venue, as formatted by Odoo. */
  venueAddress?: string;
  questions: OdooEventQuestion[];
}

export interface EventRegistrationAnswer {
  questionId: number;
  /** Free-text answer (text_box and the name/email/phone/company types). */
  text?: string;
  /** Selected option id for simple_choice questions. */
  answerId?: number;
}

export interface EventRegistrationPayload {
  eventId: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  answers?: EventRegistrationAnswer[];
}

/**
 * Served by our own API rather than Odoo's public /web/image URL: unpublished
 * events get a placeholder from Odoo for anonymous visitors, and the public
 * URL never changes, so photo updates in Odoo wouldn't show. The v= param is
 * the record's write_date, so any edit busts browser caches immediately.
 */
function buildEventImageUrl(eventId: number, writeDate: string): string {
  return `/api/events/image?id=${eventId}&v=${encodeURIComponent(writeDate)}`;
}

/** Raw image bytes for an event, read via the authenticated API. */
export async function getOdooEventImage(
  odoo: OdooEnv,
  eventId: number
): Promise<{ data: Buffer; contentType: string } | null> {
  const [record] = await searchRead(
    odoo,
    "event.event",
    [["id", "=", eventId]],
    ["image_1024"],
    1
  );
  if (!record?.image_1024) return null;

  const data = Buffer.from(String(record.image_1024), "base64");
  const contentType = data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ? "image/jpeg"
    : "image/png";
  return { data, contentType };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Odoo stores date_begin/date_end in UTC as "YYYY-MM-DD HH:MM:SS". */
function toIsoUtc(odooDatetime: string): string {
  return `${odooDatetime.replace(" ", "T")}Z`;
}

/** Questions configured on each event in Odoo, keyed by event id. */
async function fetchEventQuestions(
  odoo: OdooEnv,
  eventIds: number[]
): Promise<Map<number, OdooEventQuestion[]>> {
  const byEvent = new Map<number, OdooEventQuestion[]>();
  if (eventIds.length === 0) return byEvent;

  const questions = await searchRead(
    odoo,
    "event.question",
    [["event_ids", "in", eventIds]],
    ["id", "title", "question_type", "is_mandatory_answer", "sequence", "answer_ids", "event_ids"],
    200
  );

  const choiceQuestionIds = questions
    .filter((q) => q.question_type === "simple_choice")
    .map((q) => Number(q.id));

  const optionsByQuestion = new Map<number, { id: number; name: string }[]>();
  if (choiceQuestionIds.length > 0) {
    const options = await searchRead(
      odoo,
      "event.question.answer",
      [["question_id", "in", choiceQuestionIds]],
      ["id", "name", "question_id"],
      500
    );
    for (const option of options) {
      const questionId = Array.isArray(option.question_id)
        ? Number(option.question_id[0])
        : Number(option.question_id);
      const list = optionsByQuestion.get(questionId) ?? [];
      list.push({ id: Number(option.id), name: String(option.name) });
      optionsByQuestion.set(questionId, list);
    }
  }

  for (const record of questions) {
    const question: OdooEventQuestion = {
      id: Number(record.id),
      title: String(record.title ?? ""),
      type: String(record.question_type) as EventQuestionType,
      required: Boolean(record.is_mandatory_answer),
      sequence: Number(record.sequence ?? 0),
      options: optionsByQuestion.get(Number(record.id)) ?? [],
    };

    for (const eventIdRaw of (record.event_ids as number[]) ?? []) {
      const eventId = Number(eventIdRaw);
      if (!eventIds.includes(eventId)) continue;
      const list = byEvent.get(eventId) ?? [];
      list.push(question);
      byEvent.set(eventId, list);
    }
  }

  for (const list of byEvent.values()) {
    list.sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  }

  return byEvent;
}

export async function listUpcomingOdooEvents(
  odoo: OdooEnv,
  limit = 6
): Promise<OdooEvent[]> {
  const nowUtc = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const records = await searchRead(
    odoo,
    "event.event",
    [["date_begin", ">=", nowUtc]],
    [
      "id",
      "name",
      "date_begin",
      "date_end",
      "description",
      "website_url",
      "image_1024",
      "write_date",
      "address_id",
      "organizer_id",
    ],
    limit
  );

  const eventIds = records.map((r) => Number(r.id));
  let questionsByEvent = new Map<number, OdooEventQuestion[]>();
  try {
    questionsByEvent = await fetchEventQuestions(odoo, eventIds);
  } catch {
    // Events should still list even if the questions module is unavailable —
    // the site falls back to its standard registration fields.
  }

  // Venue postal addresses, keyed by partner id.
  const venueIds = [
    ...new Set(
      records
        .map((r) => (Array.isArray(r.address_id) ? Number(r.address_id[0]) : 0))
        .filter(Boolean)
    ),
  ];
  const venueAddressById = new Map<number, string>();
  if (venueIds.length > 0) {
    try {
      const partners = await searchRead(
        odoo,
        "res.partner",
        [["id", "in", venueIds]],
        ["id", "contact_address"],
        venueIds.length
      );
      for (const partner of partners) {
        if (partner.contact_address) {
          venueAddressById.set(Number(partner.id), String(partner.contact_address));
        }
      }
    } catch {
      // Venue address is nice-to-have; events still list without it.
    }
  }

  return records
    .sort((a, b) => String(a.date_begin).localeCompare(String(b.date_begin)))
    .map((record) => {
      const id = Number(record.id);
      const rawDescription = record.description ? String(record.description) : "";
      const venueId = Array.isArray(record.address_id) ? Number(record.address_id[0]) : 0;
      return {
        id,
        name: String(record.name ?? "Spire Hub Event"),
        dateBegin: toIsoUtc(String(record.date_begin)),
        dateEnd: toIsoUtc(String(record.date_end ?? record.date_begin)),
        description: rawDescription ? stripHtml(rawDescription) : undefined,
        websiteUrl: record.website_url ? `${odoo.url}${record.website_url}` : undefined,
        imageUrl: record.image_1024
          ? buildEventImageUrl(id, String(record.write_date ?? ""))
          : undefined,
        organizer: Array.isArray(record.organizer_id)
          ? String(record.organizer_id[1])
          : undefined,
        venueName: Array.isArray(record.address_id)
          ? String(record.address_id[1])
          : undefined,
        venueAddress: venueAddressById.get(venueId),
        questions: questionsByEvent.get(id) ?? [],
      };
    });
}

export async function registerForOdooEvent(
  odoo: OdooEnv,
  payload: EventRegistrationPayload
): Promise<{ id: number; barcode?: string }> {
  const answerTuples = (payload.answers ?? [])
    .filter((a) => a.answerId != null || (a.text ?? "").trim() !== "")
    .map((a) => [
      0,
      0,
      a.answerId != null
        ? { question_id: a.questionId, value_answer_id: a.answerId }
        : { question_id: a.questionId, value_text_box: (a.text ?? "").trim() },
    ]);

  const registrationId = await create(odoo, "event.registration", {
    event_id: payload.eventId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    company_name: payload.company || false,
    ...(answerTuples.length > 0 ? { registration_answer_ids: answerTuples } : {}),
  });

  const created = await searchRead(
    odoo,
    "event.registration",
    [["id", "=", registrationId]],
    ["barcode"],
    1
  );

  const barcode = created[0]?.barcode ? String(created[0].barcode) : undefined;
  return { id: registrationId, barcode };
}
