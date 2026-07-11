import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAfsCheckout,
  getAfsEnv,
  isAfsConfigured,
  verifyAfsPayment,
  type AfsEnv,
} from "./client";
import { calculateBookingTotal } from "../../src/utils/pricing";

const TEST_ENV: AfsEnv = {
  entityId: "8ac7a4c797662439019773da2ea107eb",
  accessToken: "test-token",
  baseUrl: "https://eu-test.oppwa.com",
  currency: "BHD",
};

/** AFS rejects any amount not matching this (discovered via sandbox 200.300.404). */
const AFS_AMOUNT_FORMAT = /^[0-9]{1,12}(\.[0-9]{2})?$/;

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAfsEnv", () => {
  it("strips a trailing slash from the base URL", () => {
    const env = getAfsEnv({ AFS_BASE_URL: "https://eu-test.oppwa.com/" });
    expect(env.baseUrl).toBe("https://eu-test.oppwa.com");
  });

  it("defaults currency to BHD", () => {
    expect(getAfsEnv({}).currency).toBe("BHD");
  });
});

describe("isAfsConfigured", () => {
  const full = {
    AFS_ENTITY_ID: "id",
    AFS_ACCESS_TOKEN: "token",
    AFS_BASE_URL: "https://eu-test.oppwa.com",
  };

  it("is true when entity, token, and base URL are all present", () => {
    expect(isAfsConfigured(full)).toBe(true);
  });

  it.each(["AFS_ENTITY_ID", "AFS_ACCESS_TOKEN", "AFS_BASE_URL"])(
    "is false when %s is missing",
    (key) => {
      const env = { ...full };
      delete env[key as keyof typeof full];
      expect(isAfsConfigured(env)).toBe(false);
    }
  );
});

describe("booking amounts sent to AFS", () => {
  // Every real price point the site can produce: rates 5.5 and 11 BHD/hr
  // across all offered durations (30 min – full day).
  const rates = [5.5, 11];
  const durations = [30, 60, 120, 240, 480];

  it("always matches AFS's required 2-decimal format", () => {
    for (const rate of rates) {
      for (const duration of durations) {
        const amount = calculateBookingTotal(rate, duration).toFixed(2);
        expect(amount, `rate ${rate} × ${duration}min → ${amount}`).toMatch(
          AFS_AMOUNT_FORMAT
        );
      }
    }
  });

  it("computes the expected totals", () => {
    expect(calculateBookingTotal(5.5, 30).toFixed(2)).toBe("2.75");
    expect(calculateBookingTotal(5.5, 60).toFixed(2)).toBe("5.50");
    expect(calculateBookingTotal(11, 240).toFixed(2)).toBe("44.00");
  });
});

describe("createAfsCheckout", () => {
  it("POSTs the checkout with entity, amount, currency, and DB payment type", async () => {
    const fetchMock = mockFetchOnce({ id: "CHECKOUT123" });

    const result = await createAfsCheckout(TEST_ENV, {
      amount: "5.50",
      merchantTransactionId: "SH123",
    });

    expect(result.checkoutId).toBe("CHECKOUT123");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://eu-test.oppwa.com/v1/checkouts");
    expect(init.headers.Authorization).toBe("Bearer test-token");

    const body = new URLSearchParams(init.body);
    expect(body.get("entityId")).toBe(TEST_ENV.entityId);
    expect(body.get("amount")).toBe("5.50");
    expect(body.get("currency")).toBe("BHD");
    expect(body.get("paymentType")).toBe("DB");
    expect(body.get("merchantTransactionId")).toBe("SH123");
  });

  it("must NOT send shopperResultUrl — AFS rejects the payment if it is set both here and on the widget form", async () => {
    const fetchMock = mockFetchOnce({ id: "CHECKOUT123" });

    await createAfsCheckout(TEST_ENV, {
      amount: "5.50",
      merchantTransactionId: "SH123",
    });

    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(body.get("shopperResultUrl")).toBeNull();
  });

  it("throws the gateway's description when no checkout id is returned", async () => {
    mockFetchOnce({ result: { description: "invalid or missing parameter" } });

    await expect(
      createAfsCheckout(TEST_ENV, { amount: "5.50", merchantTransactionId: "SH1" })
    ).rejects.toThrow("invalid or missing parameter");
  });
});

describe("verifyAfsPayment result classification", () => {
  beforeEach(() => vi.unstubAllGlobals());

  async function classify(code: string) {
    mockFetchOnce({ result: { code, description: "test" } });
    return verifyAfsPayment(TEST_ENV, "/v1/checkouts/X/payment");
  }

  // Codes taken from https://afs.docs.oppwa.com/reference/resultCodes
  it.each([
    "000.000.000", // transaction succeeded
    "000.100.110", // success in test mode (Integrator Test Mode)
    "000.100.112", // success in test mode (Connector Test Mode)
    "000.300.000", // two-step transaction succeeded
    "000.400.110", // 3DS frictionless authentication success
    "000.600.000", // transaction succeeded due to external update
  ])("treats %s as success", async (code) => {
    const result = await classify(code);
    expect(result.success).toBe(true);
  });

  it.each([
    "000.200.000", // transaction pending
    "800.400.500", // waiting for confirmation of non-instant payment
    "100.400.500", // waiting for external risk check
  ])("treats %s as pending, not success", async (code) => {
    const result = await classify(code);
    expect(result.success).toBe(false);
    expect(result.pending).toBe(true);
  });

  it.each([
    "200.300.404", // invalid or missing parameter
    "100.100.101", // invalid card number
    "800.100.153", // invalid CVV
    "800.100.157", // wrong expiry date
    "800.700.101", // bank decline
    "999.999.999", // unknown internal error
  ])("treats %s as failure", async (code) => {
    const result = await classify(code);
    expect(result.success).toBe(false);
    expect(result.pending).toBe(false);
  });

  it("queries the status endpoint with the entityId and bearer token", async () => {
    const fetchMock = mockFetchOnce({
      result: { code: "000.100.110", description: "ok" },
      amount: "5.50",
      merchantTransactionId: "SH123",
    });

    const result = await verifyAfsPayment(
      TEST_ENV,
      "/v1/checkouts/ABC123/payment"
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://eu-test.oppwa.com/v1/checkouts/ABC123/payment?entityId=${TEST_ENV.entityId}`
    );
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(result.amount).toBe("5.50");
    expect(result.merchantTransactionId).toBe("SH123");
  });
});
