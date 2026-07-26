import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Payment audit log. Every entry goes to two places:
 *  - stdout (PM2 captures it: `pm2 logs spire-hub-website`)
 *  - logs/payments.log in the project root — JSON lines, one event per line,
 *    so the full history of every checkout/verify/invoice survives restarts.
 */
const LOG_DIR = join(import.meta.dirname, "..", "logs");
const LOG_FILE = join(LOG_DIR, "payments.log");

let logDirReady: Promise<unknown> | undefined;

export function logPayment(event: string, details: Record<string, unknown> = {}): void {
  const entry = JSON.stringify({ ts: new Date().toISOString(), event, ...details });
  console.log(`[payment] ${entry}`);

  logDirReady ??= mkdir(LOG_DIR, { recursive: true });
  void logDirReady
    .then(() => appendFile(LOG_FILE, `${entry}\n`))
    .catch((error) => console.error("[payment] could not write payments.log:", error));
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
