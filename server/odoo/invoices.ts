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

/**
 * Resolve Odoo's standard "Invoice: Sending" mail template. The stable XML id
 * is account.email_template_edi_invoice; fall back to any account.move template
 * so this keeps working across Odoo versions.
 */
async function resolveInvoiceTemplateId(odoo: OdooEnv): Promise<number | undefined> {
  try {
    const ref = await executeKw<[string, number] | false>(
      odoo,
      "ir.model.data",
      "check_object_reference",
      ["account", "email_template_edi_invoice"]
    );
    if (Array.isArray(ref) && typeof ref[1] === "number") return ref[1];
  } catch {
    // XML id not present on this instance — fall through to a search.
  }

  const [tmpl] = await searchRead(
    odoo,
    "mail.template",
    [["model", "=", "account.move"]],
    ["id"],
    1
  );
  return tmpl ? Number(tmpl.id) : undefined;
}

/**
 * Email the posted invoice to the customer using the resolved mail template.
 * force_send delivers immediately rather than queueing for the mail cron.
 */
async function sendInvoiceEmail(odoo: OdooEnv, invoiceId: number): Promise<void> {
  const templateId = await resolveInvoiceTemplateId(odoo);
  if (!templateId) {
    throw new Error("No invoice email template found on this Odoo instance.");
  }

  await executeKw(odoo, "mail.template", "send_mail", [[templateId], invoiceId], {
    force_send: true,
  });
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

  // Email the paid invoice to the customer. Isolated so a mail failure never
  // rolls back the already-created-and-paid invoice.
  try {
    await sendInvoiceEmail(odoo, invoiceId);
  } catch (error) {
    console.error(`Invoice ${invoiceName} created but email failed to send:`, error);
  }

  return { invoiceId, invoiceName };
}
