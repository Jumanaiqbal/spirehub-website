import type { OdooEnv } from "./client";
import { create, searchRead } from "./client";

export interface OdooEvent {
  id: number;
  name: string;
  dateBegin: string;
  dateEnd: string;
  description?: string;
  websiteUrl?: string;
  imageUrl?: string;
}

export interface EventRegistrationPayload {
  eventId: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
}

function buildEventImageUrl(odoo: OdooEnv, eventId: number): string {
  return `${odoo.url}/web/image?model=event.event&id=${eventId}&field=image_1024`;
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
    ["id", "name", "date_begin", "date_end", "description", "website_url", "image_1024"],
    limit
  );

  return records
    .sort((a, b) => String(a.date_begin).localeCompare(String(b.date_begin)))
    .map((record) => {
      const id = Number(record.id);
      const rawDescription = record.description ? String(record.description) : "";
      return {
        id,
        name: String(record.name ?? "Spire Hub Event"),
        dateBegin: toIsoUtc(String(record.date_begin)),
        dateEnd: toIsoUtc(String(record.date_end ?? record.date_begin)),
        description: rawDescription ? stripHtml(rawDescription) : undefined,
        websiteUrl: record.website_url ? `${odoo.url}${record.website_url}` : undefined,
        imageUrl: record.image_1024 ? buildEventImageUrl(odoo, id) : undefined,
      };
    });
}

export async function registerForOdooEvent(
  odoo: OdooEnv,
  payload: EventRegistrationPayload
): Promise<{ id: number; barcode?: string }> {
  const registrationId = await create(odoo, "event.registration", {
    event_id: payload.eventId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    company_name: payload.company || false,
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
