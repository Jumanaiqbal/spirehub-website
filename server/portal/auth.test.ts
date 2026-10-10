import { describe, expect, it } from "vitest";
import { checkCredentials, getPortalEnv, issueToken, verifyToken } from "./auth";

const SECRET = "test-secret";

describe("portal auth token", () => {
  it("round-trips a valid token", () => {
    const token = issueToken({ partnerId: 1311, name: "Test", email: "t@e.com" }, SECRET);
    const s = verifyToken(token, SECRET);
    expect(s?.partnerId).toBe(1311);
    expect(s?.email).toBe("t@e.com");
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueToken({ partnerId: 1311, name: "T", email: "t@e.com" }, SECRET);
    expect(verifyToken(token, "other-secret")).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = issueToken({ partnerId: 1311, name: "T", email: "t@e.com" }, SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ partnerId: 9999, exp: Date.now() + 1e6 })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects an expired token", () => {
    const payload = Buffer.from(JSON.stringify({ partnerId: 1, name: "", email: "", exp: Date.now() - 1000 })).toString("base64url");
    // sign it correctly but expired
    const { createHmac } = require("node:crypto");
    const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
    expect(verifyToken(`${payload}.${sig}`, SECRET)).toBeNull();
  });
});

describe("portal credentials", () => {
  const portal = getPortalEnv({ PORTAL_TEST_USER: "test", PORTAL_TEST_PASSWORD: "secret" });
  it("accepts correct creds", () => expect(checkCredentials(portal, "test", "secret")).toBe(true));
  it("rejects wrong password", () => expect(checkCredentials(portal, "test", "nope")).toBe(false));
  it("rejects wrong user", () => expect(checkCredentials(portal, "nope", "secret")).toBe(false));
});
