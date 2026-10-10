import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Lightweight signed-token auth for the customer portal — no external deps.
 * A token is `base64url(payload).base64url(hmacSHA256(payload, secret))`, where
 * payload = { partnerId, name, email, exp }. This is a PROTOTYPE auth: a single
 * shared test login maps to one Odoo partner. Before real customers use it,
 * replace the credential check with per-customer auth (email invite + password
 * or OTP) — the token/partner plumbing here stays the same.
 */

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PortalEnv {
  secret: string;
  testUser: string;
  testPassword: string;
  testPartnerId: number;
  /** The shared dev/demo login is OFF unless explicitly enabled — so it can
   * never be a backdoor in production. */
  allowTestLogin: boolean;
}

export function getPortalEnv(env: Record<string, string>): PortalEnv {
  return {
    // Falls back to the Odoo API key (already a secret and always set) so the
    // token is signed even if PORTAL_JWT_SECRET isn't configured.
    secret: env.PORTAL_JWT_SECRET || env.ODOO_API_KEY || "spire-portal-dev-secret",
    testUser: env.PORTAL_TEST_USER || "test",
    testPassword: env.PORTAL_TEST_PASSWORD || "test",
    testPartnerId: Number(env.PORTAL_TEST_PARTNER_ID ?? 1311),
    allowTestLogin: env.PORTAL_ALLOW_TEST_LOGIN === "true",
  };
}

export interface PortalSession {
  partnerId: number;
  name: string;
  email: string;
  exp: number;
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64url");

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function issueToken(session: Omit<PortalSession, "exp">, secret: string): string {
  const payload: PortalSession = { ...session, exp: Date.now() + TOKEN_TTL_MS };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function verifyToken(token: string, secret: string): PortalSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  const expected = sign(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as PortalSession;
    if (!session.partnerId || !session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Constant-time credential check for the shared test login. */
export function checkCredentials(
  portal: PortalEnv,
  username: string,
  password: string
): boolean {
  const eq = (x: string, y: string) => {
    const a = Buffer.from(x);
    const b = Buffer.from(y);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  return eq(username, portal.testUser) && eq(password, portal.testPassword);
}

/** Extract and verify the Bearer token from a request's Authorization header. */
export function sessionFromAuthHeader(
  authHeader: string | undefined,
  secret: string
): PortalSession | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7).trim(), secret);
}
