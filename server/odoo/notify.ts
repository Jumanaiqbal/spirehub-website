import type { OdooEnv } from "./client";
import { create, executeKw } from "./client";

export interface AdminBookingDetails {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  roomName?: string;
  layout?: string;
  date?: string;
  time?: string;
  durationMinutes: number;
  amountBhd: number;
  paymentReference?: string;
  notes?: string;
  bookingName?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}

/**
 * Email the Spire team when a website booking completes, with the full
 * details (room, setup, customer, time, amount) so they can prepare the room
 * without opening Odoo. Sent via Odoo's outgoing mail server to an internal
 * address, so it isn't affected by external deliverability issues.
 */
export async function sendAdminBookingEmail(
  odoo: OdooEnv,
  adminEmail: string,
  d: AdminBookingDetails
): Promise<number> {
  const rows: [string, string | undefined][] = [
    ["Customer", d.name],
    ["Company", d.company],
    ["Email", d.email],
    ["Phone", d.phone],
    ["Room", d.roomName],
    ["Setup / layout", d.layout],
    ["Date", d.date],
    ["Time", d.time ? `${d.time} (${d.durationMinutes} min)` : undefined],
    ["Amount paid", `BD ${d.amountBhd.toFixed(3)} (VAT incl.)`],
    ["Payment ref", d.paymentReference],
    ["Guest notes", d.notes],
    ["Odoo booking", d.bookingName],
  ];

  const tableRows = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${k}</td>` +
        `<td style="padding:4px 0;font-weight:600">${escapeHtml(String(v))}</td></tr>`
    )
    .join("");

  const subjectBits = [d.roomName, d.layout].filter(Boolean).join(" — ");
  const bodyHtml =
    `<p>A new booking was completed and paid on the website.</p>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${tableRows}</table>`;

  const mailId = await create(odoo, "mail.mail", {
    subject: `New website booking — ${subjectBits || "Room"} — ${d.name ?? ""}`.trim(),
    body_html: bodyHtml,
    email_to: adminEmail,
    email_from: "hub@spire.bh",
    auto_delete: false,
  });

  await executeKw(odoo, "mail.mail", "send", [[mailId]]);
  return mailId;
}
