import type { IncomingMessage, ServerResponse } from "node:http";
import { handleOdooApi } from "../server/api";

const SERVER_ENV_KEYS = [
  "ODOO_URL",
  "ODOO_DB",
  "ODOO_USERNAME",
  "ODOO_API_KEY",
  "ODOO_ROOM_MODEL",
  "ODOO_BOOKING_MODEL",
  "ODOO_ROOM_FIELDS",
  "ODOO_BOOKING_FIELDS",
  "ODOO_TIMEZONE",
  "ODOO_UTC_OFFSET_HOURS",
  "AFS_ENTITY_ID",
  "AFS_ACCESS_TOKEN",
  "AFS_BASE_URL",
  "AFS_CURRENCY",
  "ODOO_INVOICE_JOURNAL_ID",
  "ODOO_AFS_JOURNAL_ID",
  "ODOO_AFS_PAYMENT_METHOD_LINE_ID",
  "ODOO_SALE_TAX_ID",
  "ODOO_MEETING_ROOM_PRODUCT_ID",
  "ODOO_WORKSHOP_ROOM_PRODUCT_ID",
] as const;

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of SERVER_ENV_KEYS) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await handleOdooApi(req, res, loadEnv());
  if (!handled) {
    res.statusCode = 404;
    res.end("Not found");
  }
}
