import type { IncomingMessage, ServerResponse } from "node:http";
import { handleOdooApi } from "../server/api";

const ODOO_ENV_KEYS = [
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
] as const;

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of ODOO_ENV_KEYS) {
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
