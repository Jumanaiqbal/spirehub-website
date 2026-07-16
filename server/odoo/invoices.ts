import type { OdooEnv } from "./client";
import { create, executeKw, searchRead } from "./client";
import { formatLocalDate } from "../../src/utils/dates";

export interface InvoiceEnv {
  /** Sales journal invoices post against (Odoo default: "Customer Invoices"). */
  invoiceJournalId: number;
  /** Bank journal representing the AFS settlement account. */
  afsJournalId: number;
  /** Inbound "Manual" payment method line under the AFS journal. */
  afsPaymentMethodLineId: number;
  /** Sale VAT tax applied to the invoice line (10%, tax-exclusive). */
  saleTaxId: number;
  meetingRoomProductId: number;
  workshopRoomProductId: number;
}

export function getInvoiceEnv(env: Record<string, string>): InvoiceEnv {
  return {
    invoiceJournalId: Number(env.ODOO_INVOICE_JOURNAL_ID ?? 1),
    afsJournalId: Number(env.ODOO_AFS_JOURNAL_ID ?? 15),
    afsPaymentMethodLineId: Number(env.ODOO_AFS_PAYMENT_METHOD_LINE_ID ?? 19),
    saleTaxId: Number(env.ODOO_SALE_TAX_ID ?? 1),
    meetingRoomProductId: Number(env.ODOO_MEETING_ROOM_PRODUCT_ID ?? 511),
    workshopRoomProductId: Number(env.ODOO_WORKSHOP_ROOM_PRODUCT_ID ?? 874),
  };
}

export interface BookingInvoicePayload {
  partnerId: number;
  roomName: string;
  isWorkshop: boolean;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  durationMinutes: number;
  /** VAT-inclusive amount actually charged via AFS. */
  totalBhd: number;
  /** AFS merchantTransactionId — recorded on the payment memo for reconciliation. */
  paymentReference: string;
}

function addMinutesToLocalTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

function formatDurationLabel(durationMinutes: number): string {
  const hours = durationMinutes / 60;
  return hours === 1 ? "1 hr" : `${hours} hrs`;
}

export async function createAndPayBookingInvoice(
  odoo: OdooEnv,
  invoiceEnv: InvoiceEnv,
  payload: BookingInvoicePayload
): Promise<{ invoiceId: number; invoiceName: string }> {
  const productId = payload.isWorkshop
    ? invoiceEnv.workshopRoomProductId
    : invoiceEnv.meetingRoomProductId;

  // The website charges a VAT-inclusive total via AFS; back out the
  // tax-exclusive unit price so the posted invoice matches it exactly.
  const priceExclTax = Math.round((payload.totalBhd / 1.1) * 1000) / 1000;

  const endTime = addMinutesToLocalTime(payload.time, payload.durationMinutes);
  const lineLabel = `${payload.roomName} — ${formatLocalDate(payload.date, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${payload.time}-${endTime} (${formatDurationLabel(payload.durationMinutes)})`;

  const invoiceId = await create(odoo, "account.move", {
    move_type: "out_invoice",
    partner_id: payload.partnerId,
    journal_id: invoiceEnv.invoiceJournalId,
    invoice_line_ids: [
      [
        0,
        0,
        {
          product_id: productId,
          name: lineLabel,
          quantity: 1,
          price_unit: priceExclTax,
          tax_ids: [[6, 0, [invoiceEnv.saleTaxId]]],
        },
      ],
    ],
  });

  await executeKw(odoo, "account.move", "action_post", [[invoiceId]]);

  const [posted] = await searchRead(odoo, "account.move", [["id", "=", invoiceId]], ["name"], 1);
  const invoiceName = String(posted?.name ?? "");

  const wizardId = await executeKw<number>(
    odoo,
    "account.payment.register",
    "create",
    [
      {
        journal_id: invoiceEnv.afsJournalId,
        payment_method_line_id: invoiceEnv.afsPaymentMethodLineId,
        amount: payload.totalBhd,
        communication: `${invoiceName}-afs ${payload.paymentReference}`,
      },
    ],
    { context: { active_model: "account.move", active_ids: [invoiceId] } }
  );

  await executeKw(odoo, "account.payment.register", "action_create_payments", [[wizardId]], {
    context: { active_model: "account.move", active_ids: [invoiceId] },
  });

  return { invoiceId, invoiceName };
}
