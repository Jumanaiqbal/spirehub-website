import { resolveUtcOffsetHours } from "./datetime";

export interface OdooEnv {
  url: string;
  db: string;
  username: string;
  apiKey: string;
  roomModel: string;
  bookingModel: string;
  roomFields: string;
  bookingFields: string;
  timezone: string;
  utcOffsetHours: number;
}

export function getOdooEnv(env: Record<string, string>): OdooEnv {
  const timezone = env.ODOO_TIMEZONE ?? "Asia/Bahrain";
  return {
    url: (env.ODOO_URL ?? "").replace(/\/$/, ""),
    db: env.ODOO_DB ?? "",
    username: env.ODOO_USERNAME ?? "",
    apiKey: env.ODOO_API_KEY ?? "",
    roomModel: env.ODOO_ROOM_MODEL ?? "room.room",
    bookingModel: env.ODOO_BOOKING_MODEL ?? "room.booking",
    roomFields:
      env.ODOO_ROOM_FIELDS ??
      "id,name,short_code,description,room_booking_url,room_background_image,is_available",
    bookingFields:
      env.ODOO_BOOKING_FIELDS ??
      "id,name,room_id,start_datetime,stop_datetime",
    timezone,
    utcOffsetHours: resolveUtcOffsetHours(env),
  };
}

export function isOdooConfigured(env: Record<string, string>): boolean {
  const o = getOdooEnv(env);
  return Boolean(o.url && o.db && o.username && o.apiKey);
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { message: string; data?: { message?: string } };
}

let cachedUid: number | null = null;

const ODOO_TIMEOUT_MS = 8000;

async function jsonRpc<T>(
  odoo: OdooEnv,
  service: string,
  method: string,
  args: unknown[]
): Promise<T> {
  const response = await fetch(`${odoo.url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Date.now(),
    }),
    signal: AbortSignal.timeout(ODOO_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Odoo HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as JsonRpcResponse<T>;
  if (data.error) {
    const msg = data.error.data?.message ?? data.error.message;
    throw new Error(msg);
  }

  return data.result as T;
}

export async function authenticate(odoo: OdooEnv): Promise<number> {
  if (cachedUid) return cachedUid;

  const uid = await jsonRpc<number | false>(
    odoo,
    "common",
    "authenticate",
    [odoo.db, odoo.username, odoo.apiKey, {}]
  );

  if (!uid) {
    throw new Error("Odoo authentication failed — check URL, database, username, and API key.");
  }

  cachedUid = uid;
  return uid;
}

export async function executeKw<T>(
  odoo: OdooEnv,
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  const uid = await authenticate(odoo);
  return jsonRpc<T>(odoo, "object", "execute_kw", [
    odoo.db,
    uid,
    odoo.apiKey,
    model,
    method,
    args,
    kwargs,
  ]);
}

export async function searchRead(
  odoo: OdooEnv,
  model: string,
  domain: unknown[] = [],
  fields: string[] = [],
  limit = 100
): Promise<Record<string, unknown>[]> {
  return executeKw<Record<string, unknown>[]>(odoo, model, "search_read", [domain], {
    fields,
    limit,
  });
}

export async function create(
  odoo: OdooEnv,
  model: string,
  values: Record<string, unknown>
): Promise<number> {
  return executeKw<number>(odoo, model, "create", [values]);
}

export async function messagePost(
  odoo: OdooEnv,
  model: string,
  recordId: number,
  body: string
): Promise<number> {
  return executeKw<number>(odoo, model, "message_post", [[recordId]], {
    body,
    message_type: "comment",
    subtype_xmlid: "mail.mt_note",
  });
}

export function resetAuthCache() {
  cachedUid = null;
}
