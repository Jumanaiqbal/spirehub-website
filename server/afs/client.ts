/**
 * AFS (Arab Financial Services) Copy&Pay integration — built on the OPPWA
 * platform. Docs: https://afs.docs.oppwa.com/
 */

export interface AfsEnv {
  entityId: string;
  accessToken: string;
  baseUrl: string;
  currency: string;
}

export function getAfsEnv(env: Record<string, string>): AfsEnv {
  return {
    entityId: env.AFS_ENTITY_ID ?? "",
    accessToken: env.AFS_ACCESS_TOKEN ?? "",
    baseUrl: (env.AFS_BASE_URL ?? "").replace(/\/$/, ""),
    currency: env.AFS_CURRENCY ?? "BHD",
  };
}

export function isAfsConfigured(env: Record<string, string>): boolean {
  const afs = getAfsEnv(env);
  return Boolean(afs.entityId && afs.accessToken && afs.baseUrl);
}

// Result code patterns per https://afs.docs.oppwa.com/reference/resultCodes
const SUCCESS_CODE = /^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[1][12]0)/;
const PENDING_CODE = /^(000\.200)|^(800\.400\.5|100\.400\.500)/;

export interface AfsCheckoutParams {
  /** Decimal string, e.g. "5.50" — AFS requires exactly 2 decimal places. */
  amount: string;
  merchantTransactionId: string;
}

export async function createAfsCheckout(
  afs: AfsEnv,
  params: AfsCheckoutParams
): Promise<{ checkoutId: string }> {
  // shopperResultUrl must NOT be set here — the Copy&Pay widget form's
  // action attribute provides it, and AFS rejects the payment if both are set.
  const body = new URLSearchParams({
    entityId: afs.entityId,
    amount: params.amount,
    currency: afs.currency,
    paymentType: "DB",
    merchantTransactionId: params.merchantTransactionId,
  });

  const response = await fetch(`${afs.baseUrl}/v1/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${afs.accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    id?: string;
    result?: { description?: string };
  };
  if (!data.id) {
    throw new Error(data.result?.description ?? "Could not start payment checkout.");
  }

  return { checkoutId: data.id };
}

export interface AfsPaymentResult {
  success: boolean;
  pending: boolean;
  code: string;
  description: string;
  amount?: string;
  merchantTransactionId?: string;
  raw?: unknown;
}

export async function verifyAfsPayment(
  afs: AfsEnv,
  resourcePath: string
): Promise<AfsPaymentResult> {
  // resourcePath is provided by AFS and already starts with "/v1/checkouts/...".
  const url = `${afs.baseUrl}${resourcePath}?entityId=${afs.entityId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${afs.accessToken}` },
  });

  const data = (await response.json()) as {
    result?: { code?: string; description?: string };
    amount?: string;
    merchantTransactionId?: string;
  };
  const code = data.result?.code ?? "";

  return {
    success: SUCCESS_CODE.test(code),
    pending: PENDING_CODE.test(code),
    code,
    description: data.result?.description ?? "Unknown result",
    amount: data.amount,
    merchantTransactionId: data.merchantTransactionId,
    raw: data,
  };
}
