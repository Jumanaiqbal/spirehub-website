import type { OdooEnv } from "./client";
import { executeKw } from "./client";

/**
 * Normalise a locally-entered phone number to Bahrain E.164 (+973XXXXXXXX).
 * The website's customers are all in Bahrain, so bare 8-digit local numbers
 * get the +973 country code. Handles spaces, dashes, 00/‎+ prefixes, and
 * numbers that already carry 973. Returns undefined if there are no digits.
 */
export function toBahrainE164(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("973")) d = d.slice(3); // strip country code if present
  if (d.length < 8) return undefined; // too short to be a real number
  // Bahrain subscriber numbers are 8 digits; keep the last 8 if extra crept in.
  const local = d.slice(-8);
  return `+973${local}`;
}

/**
 * Send an approved WhatsApp template for an Odoo record via the connected
 * WhatsApp Business account — the programmatic equivalent of the "WhatsApp"
 * button in Odoo. Returns the whatsapp.message id.
 */
export async function sendWhatsAppTemplate(
  odoo: OdooEnv,
  params: { resModel: string; resId: number; templateId: number; phone: string }
): Promise<number> {
  const ctx = {
    default_res_model: params.resModel,
    default_res_ids: `[${params.resId}]`,
    active_model: params.resModel,
    active_id: params.resId,
    active_ids: [params.resId],
  };

  const composerId = await executeKw<number>(
    odoo,
    "whatsapp.composer",
    "create",
    [
      {
        res_model: params.resModel,
        res_ids: `[${params.resId}]`,
        wa_template_id: params.templateId,
        phone: params.phone,
      },
    ],
    { context: ctx }
  );

  const res = await executeKw<number[] | number>(
    odoo,
    "whatsapp.composer",
    "action_send_whatsapp_template",
    [[composerId]],
    { context: ctx }
  );

  return Array.isArray(res) ? res[0] : composerId;
}
