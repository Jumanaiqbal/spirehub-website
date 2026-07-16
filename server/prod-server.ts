import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { handleOdooApi } from "./api";

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

const DIST_DIR = join(import.meta.dirname, "..", "dist");
const PORT = Number(process.env.PORT ?? 3000);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveFile(filePath: string, res: import("node:http").ServerResponse) {
  const ext = extname(filePath);
  const isHashedAsset = filePath.includes(`${join(DIST_DIR, "assets")}`);
  res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  res.setHeader(
    "Cache-Control",
    isHashedAsset ? "public, max-age=31536000, immutable" : "public, max-age=3600"
  );
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const env = loadEnv();

  const handled = await handleOdooApi(req, res, env);
  if (handled) return;

  const url = new URL(req.url ?? "/", "http://localhost");
  const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
  const candidate = join(DIST_DIR, safePath);

  if (candidate.startsWith(DIST_DIR) && existsSync(candidate) && statSync(candidate).isFile()) {
    serveFile(candidate, res);
    return;
  }

  // SPA fallback — this is a single-page app with no client-side routes.
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  createReadStream(join(DIST_DIR, "index.html")).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Spire Hub server listening on port ${PORT}`);
});
