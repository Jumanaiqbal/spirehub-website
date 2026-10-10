import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { OdooEnv } from "../odoo/client";
import { authenticateUser, executeKw, searchRead } from "../odoo/client";
import { createOdooBooking } from "../odoo/rooms";
import { getInvoiceEnv } from "../odoo/invoices";
import {
  createAfsCheckout,
  getAfsEnv,
  isAfsConfigured,
  isValidAfsResourcePath,
  verifyAfsPayment,
} from "../afs/client";
import { errorMessage, logPayment } from "../paymentLog";
import { findRoomPricing } from "../../src/data/roomPricing";
import {
  checkCredentials,
  getPortalEnv,
  issueToken,
  sessionFromAuthHeader,
  type PortalSession,
} from "./auth";

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 64 * 1024) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/**
 * Customer portal API. Every route except /login requires a valid Bearer token
 * whose partnerId scopes all data — a customer can only ever read their own
 * Odoo records.
 */
export async function handlePortalApi(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  env: Record<string, string>,
  odoo: OdooEnv
): Promise<boolean> {
  if (!path.startsWith("/api/portal/")) return false;

  const portal = getPortalEnv(env);

  // ---- Login ---------------------------------------------------------------
  if (path === "/api/portal/login" && req.method === "POST") {
    let body: { username?: string; password?: string };
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { error: "Invalid request" });
      return true;
    }

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    // Resolve which Odoo customer (partner) is signing in.
    let partnerId: number;
    const isTestLogin = portal.allowTestLogin && checkCredentials(portal, username, password);
    if (isTestLogin) {
      // Dev/demo bypass → the configured dummy partner.
      partnerId = portal.testPartnerId;
    } else {
      // Real customer → validate their own Odoo portal credentials.
      const uid = await authenticateUser(odoo, username, password);
      if (!uid) {
        sendJson(res, 401, { error: "Incorrect email or password." });
        return true;
      }
      const [user] = await searchRead(odoo, "res.users", [["id", "=", uid]], ["partner_id"], 1);
      const pid = Array.isArray(user?.partner_id) ? user.partner_id[0] : undefined;
      if (!pid) {
        sendJson(res, 403, { error: "No customer account is linked to this login." });
        return true;
      }
      partnerId = Number(pid);
    }

    // Gate: only customers with an ACTIVE subscription may use the portal.
    // (The test login is exempt so the demo always works.)
    if (!isTestLogin) {
      const activeSubs = await executeKw<number>(odoo, "sale.order", "search_count", [
        [
          ["partner_id", "=", partnerId],
          ["is_subscription", "=", true],
          ["subscription_state", "=", "3_progress"],
        ],
      ]);
      if (!activeSubs) {
        sendJson(res, 403, {
          error:
            "No active membership was found for this account. Please contact Spire Hub if you think this is a mistake.",
        });
        return true;
      }
    }

    const [partner] = await searchRead(
      odoo,
      "res.partner",
      [["id", "=", partnerId]],
      ["name", "email"],
      1
    );
    if (!partner) {
      sendJson(res, 500, { error: "Customer not found in Odoo." });
      return true;
    }

    const session = {
      partnerId,
      name: String(partner.name ?? ""),
      email: String(partner.email ?? ""),
    };
    const token = issueToken(session, portal.secret);
    sendJson(res, 200, { token, customer: session });
    return true;
  }

  // ---- Everything below requires a valid session ---------------------------
  const session = sessionFromAuthHeader(req.headers.authorization, portal.secret);
  if (!session) {
    sendJson(res, 401, { error: "Please sign in again." });
    return true;
  }

  if (path === "/api/portal/me" && req.method === "GET") {
    const [partner] = await searchRead(
      odoo,
      "res.partner",
      [["id", "=", session.partnerId]],
      ["name", "email", "phone"],
      1
    );
    sendJson(res, 200, { customer: partner ?? null });
    return true;
  }

  // Members book meeting rooms FREE (server-enforced — the perk is never
  // trusted from the client). The workshop room is 50% off and still paid by
  // card via the normal checkout, which applies the member discount there.
  if (path === "/api/portal/book" && req.method === "POST") {
    let body: {
      roomId?: number; date?: string; time?: string; durationMinutes?: number;
      name?: string; email?: string; phone?: string; company?: string;
      notes?: string; layout?: string;
    };
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { error: "Invalid request" });
      return true;
    }

    const roomId = Number(body.roomId);
    const durationMinutes = Number(body.durationMinutes ?? 60);
    const pricing = findRoomPricing(roomId);
    if (!pricing) {
      sendJson(res, 400, { error: "Unknown room." });
      return true;
    }
    if (pricing.isWorkshop) {
      sendJson(res, 403, {
        error: "The workshop room is 50% off for members — please continue to payment.",
      });
      return true;
    }

    const booking = await createOdooBooking(odoo, {
      roomId,
      date: body.date ?? "",
      time: body.time ?? "",
      durationMinutes,
      name: body.name || session.name,
      email: body.email || session.email,
      phone: body.phone ?? "",
      company: body.company,
      notes: body.notes,
      layout: body.layout,
      amountBhd: 0,
      paid: true,
      paymentReference: `MEMBER-FREE (${session.email})`,
    });
    sendJson(res, 201, { success: true, booking });
    return true;
  }

  if (path === "/api/portal/invoices" && req.method === "GET") {
    const invoices = await invoicesFor(odoo, session, env);
    sendJson(res, 200, { invoices });
    return true;
  }

  if (path === "/api/portal/subscription" && req.method === "GET") {
    const subscriptions = await subscriptionsFor(odoo, session);
    sendJson(res, 200, { subscriptions });
    return true;
  }

  // Start an AFS payment for one OR MORE of the member's own unpaid invoices
  // (paid together as a single card payment).
  if (path === "/api/portal/invoices/pay" && req.method === "POST") {
    if (!isAfsConfigured(env)) {
      sendJson(res, 503, { error: "Payment gateway is not configured." });
      return true;
    }
    let body: { invoiceIds?: number[]; invoiceId?: number };
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { error: "Invalid request" });
      return true;
    }
    const ids = normalizeInvoiceIds(body);
    if (!ids.length) {
      sendJson(res, 400, { error: "No invoices selected." });
      return true;
    }

    const invs = await loadPayableInvoices(odoo, session.partnerId, ids);
    // Every requested invoice must belong to this member and still be payable.
    if (invs.length !== ids.length) {
      sendJson(res, 404, { error: "One or more invoices were not found or are already paid." });
      return true;
    }
    const total = Math.round(invs.reduce((s, i) => s + i.residual, 0) * 1000) / 1000;
    if (total <= 0) {
      sendJson(res, 400, { error: "These invoices are already paid." });
      return true;
    }

    const afs = getAfsEnv(env);
    const merchantTransactionId = `INV${ids.join("-")}-${Date.now()}`.slice(0, 255);
    try {
      const checkout = await createAfsCheckout(afs, {
        amount: total.toFixed(2),
        merchantTransactionId,
      });
      logPayment("portal.invoice.checkout", {
        invoiceIds: ids,
        partnerId: session.partnerId,
        amount: total,
        merchantTransactionId,
      });
      sendJson(res, 200, {
        checkoutId: checkout.checkoutId,
        amount: total,
        baseUrl: afs.baseUrl,
        merchantTransactionId,
        invoiceIds: ids,
        invoiceNames: invs.map((i) => i.name),
      });
    } catch (error) {
      logPayment("portal.invoice.checkout.FAILED", { invoiceIds: ids, error: errorMessage(error) });
      sendJson(res, 500, { error: "Could not start payment. Please try again." });
    }
    return true;
  }

  // Verify an AFS payment and register it across the selected invoice(s) in Odoo.
  if (path === "/api/portal/invoices/pay/verify" && req.method === "POST") {
    if (!isAfsConfigured(env)) {
      sendJson(res, 503, { error: "Payment gateway is not configured." });
      return true;
    }
    let body: { invoiceIds?: number[]; invoiceId?: number; resourcePath?: string };
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { error: "Invalid request" });
      return true;
    }
    const ids = normalizeInvoiceIds(body);
    const resourcePath = String(body.resourcePath ?? "");
    if (!ids.length || !isValidAfsResourcePath(resourcePath)) {
      sendJson(res, 400, { error: "Invalid request" });
      return true;
    }

    const invs = await loadPayableInvoices(odoo, session.partnerId, ids);
    if (!invs.length) {
      sendJson(res, 404, { error: "Invoices not found." });
      return true;
    }
    const total = Math.round(invs.reduce((s, i) => s + i.residual, 0) * 1000) / 1000;

    const afs = getAfsEnv(env);
    const result = await verifyAfsPayment(afs, resourcePath);
    logPayment("portal.invoice.verify", {
      invoiceIds: ids,
      success: result.success,
      code: result.code,
      amountCharged: result.amount,
      merchantTransactionId: result.merchantTransactionId,
    });

    if (!result.success) {
      sendJson(res, 200, {
        success: false,
        pending: result.pending,
        message: `${result.description} (code ${result.code})`,
      });
      return true;
    }

    // Already settled (e.g. a duplicate verify) — nothing to register.
    if (total <= 0) {
      sendJson(res, 200, { success: true, alreadyPaid: true });
      return true;
    }

    if (result.amount && Math.abs(Number(result.amount) - total) > 0.001) {
      logPayment("portal.invoice.REJECTED.amount-mismatch", {
        invoiceIds: ids,
        amountCharged: result.amount,
        expected: total.toFixed(2),
      });
      sendJson(res, 200, {
        success: false,
        message:
          "The charged amount did not match the selected invoices. Please contact Spire Hub — do not pay again.",
      });
      return true;
    }

    // Register ONE grouped payment reconciled across all the selected invoices.
    try {
      const invoiceEnv = getInvoiceEnv(env);
      const activeIds = invs.map((i) => i.id);
      const wizardId = await executeKw<number>(
        odoo,
        "account.payment.register",
        "create",
        [
          {
            journal_id: invoiceEnv.afsJournalId,
            payment_method_line_id: invoiceEnv.afsPaymentMethodLineId,
            group_payment: true,
            communication: `Portal payment — afs ${result.merchantTransactionId ?? ""}`,
          },
        ],
        { context: { active_model: "account.move", active_ids: activeIds } }
      );
      await executeKw(odoo, "account.payment.register", "action_create_payments", [[wizardId]], {
        context: { active_model: "account.move", active_ids: activeIds },
      });
      logPayment("portal.invoice.paid", {
        invoiceIds: activeIds,
        partnerId: session.partnerId,
        amount: total,
        merchantTransactionId: result.merchantTransactionId,
      });
      sendJson(res, 201, { success: true });
    } catch (error) {
      // The card WAS charged but registering the payment failed — must be
      // visible so the team can reconcile manually.
      logPayment("portal.invoice.REGISTER_FAILED", {
        invoiceIds: ids,
        amount: total,
        merchantTransactionId: result.merchantTransactionId,
        error: errorMessage(error),
      });
      sendJson(res, 200, {
        success: false,
        message:
          "Your payment went through but we couldn't update the invoices automatically. Spire Hub will confirm it shortly — do not pay again.",
      });
    }
    return true;
  }

  sendJson(res, 404, { error: "Not found" });
  return true;
}

/** Accept either a single invoiceId or an array of invoiceIds; dedupe + clean. */
function normalizeInvoiceIds(body: { invoiceIds?: number[]; invoiceId?: number }): number[] {
  const raw = Array.isArray(body.invoiceIds)
    ? body.invoiceIds
    : body.invoiceId != null
      ? [body.invoiceId]
      : [];
  return [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
}

/** Load the member's OWN posted invoices with an outstanding balance. */
async function loadPayableInvoices(odoo: OdooEnv, partnerId: number, ids: number[]) {
  const rows = await searchRead(
    odoo,
    "account.move",
    [
      ["id", "in", ids],
      ["partner_id", "=", partnerId],
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
      ["amount_residual", ">", 0],
    ],
    ["name", "amount_residual"],
    200
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name ?? ""),
    residual: Number(r.amount_residual ?? 0),
  }));
}

async function invoicesFor(odoo: OdooEnv, session: PortalSession, env: Record<string, string>) {
  const rows = await searchRead(
    odoo,
    "account.move",
    [
      ["partner_id", "=", session.partnerId],
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
    ],
    ["name", "invoice_date", "invoice_date_due", "amount_total", "amount_residual", "payment_state", "access_token"],
    200
  );

  const base = (env.ODOO_URL ?? "").replace(/\/$/, "");
  const invoices = [];
  for (const r of rows) {
    const id = Number(r.id);
    // Odoo's portal page renders/downloads the PDF; the per-invoice access
    // token authorises it without an Odoo login. Invoices never opened in the
    // portal have no token yet — write one (a uuid, exactly what Odoo stores).
    // Sequential so we don't fire many Odoo writes at once.
    let token = r.access_token ? String(r.access_token) : "";
    if (!token) {
      const candidate = randomUUID();
      try {
        await executeKw(odoo, "account.move", "write", [[id], { access_token: candidate }]);
        token = candidate;
      } catch (e) {
        console.error("[portal] token write failed for invoice", id, e);
        token = "";
      }
    }
    invoices.push({
      id,
      name: String(r.name ?? ""),
      date: r.invoice_date || null,
      dueDate: r.invoice_date_due || null,
      amountTotal: Number(r.amount_total ?? 0),
      amountDue: Number(r.amount_residual ?? 0),
      paymentState: String(r.payment_state ?? ""),
      downloadUrl: token
        ? `${base}/my/invoices/${id}?access_token=${token}`
        : `${base}/my/invoices/${id}`,
    });
  }
  return invoices;
}

async function subscriptionsFor(odoo: OdooEnv, session: PortalSession) {
  const rows = await searchRead(
    odoo,
    "sale.order",
    [
      ["partner_id", "=", session.partnerId],
      ["is_subscription", "=", true],
    ],
    ["name", "plan_id", "subscription_state", "next_invoice_date", "recurring_total", "amount_total", "currency_id"],
    20
  );

  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name ?? ""),
    plan: Array.isArray(r.plan_id) ? r.plan_id[1] : null,
    status: String(r.subscription_state ?? ""),
    nextInvoiceDate: r.next_invoice_date || null,
    recurringTotal: Number(r.recurring_total ?? r.amount_total ?? 0),
  }));
}
