import type { IncomingMessage, ServerResponse } from "node:http";
import { getOdooEnv, isOdooConfigured } from "./odoo/client";
import {
  checkAllOdooRoomAvailability,
  checkOdooRoomAvailability,
  createOdooBooking,
  findOrCreatePartner,
  listOdooRooms,
  testOdooConnection,
} from "./odoo/rooms";
import { createMentorApplication, createOdooLead } from "./odoo/leads";
import {
  getOdooEventImage,
  listUpcomingOdooEvents,
  registerForOdooEvent,
} from "./odoo/events";
import { createAndPayBookingInvoice, getInvoiceEnv } from "./odoo/invoices";
import {
  createAfsCheckout,
  getAfsEnv,
  isAfsConfigured,
  isTestModeCode,
  isValidAfsResourcePath,
  verifyAfsPayment,
} from "./afs/client";
import { errorMessage, logPayment } from "./paymentLog";
import { sendWhatsAppTemplate, toBahrainE164 } from "./odoo/whatsapp";
import { sendAdminBookingEmail } from "./odoo/notify";
import { findRoomPricing } from "../src/data/roomPricing";
import { calculateBookingTotal } from "../src/utils/pricing";

// Largest legitimate payload (event registration with answers) is ~2 KB;
// the cap only exists to stop memory-exhaustion via giant bodies.
const MAX_BODY_BYTES = 64 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
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

function clientIp(req: IncomingMessage): string {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "")
    .split(",")[0]
    .trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

// Best-effort abuse guard: cap POSTs per IP per minute. In-memory on purpose —
// a single pm2 fork serves the site, and losing counts on restart is harmless.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_POSTS = 20;
const postHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (postHits.size > 10_000) postHits.clear();
  const recent = (postHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  const limited = recent.length >= RATE_MAX_POSTS;
  if (!limited) recent.push(now);
  postHits.set(ip, recent);
  return limited;
}

// One successful card payment must create exactly one booking — a replayed
// verify call for the same AFS transaction is rejected. In-memory: a replay
// across a server restart is possible but shows up in payments.log.
const processedPayments = new Set<string>();

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export async function handleOdooApi(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>
) {
  // Malformed URLs (e.g. "//host%2f.." from vulnerability scanners) make
  // new URL() throw — outside the try below, that crashed the whole process.
  let url: URL;
  try {
    url = new URL(req.url ?? "/", "http://localhost");
  } catch {
    sendJson(res, 400, { error: "Malformed request URL" });
    return true;
  }
  const path = url.pathname;

  if (!path.startsWith("/api/")) {
    return false;
  }

  if (req.method === "POST") {
    // Reject an oversized body up front with a clean 413. readBody keeps a
    // streaming backstop for clients that lie about (or omit) Content-Length.
    const declaredLength = Number(req.headers["content-length"] ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      sendJson(res, 413, { error: "Request body too large" });
      return true;
    }

    if (isRateLimited(clientIp(req))) {
      sendJson(res, 429, {
        error: "Too many requests — please wait a minute and try again.",
      });
      return true;
    }
  }

  if (!isOdooConfigured(env)) {
    sendJson(res, 503, {
      error: "Odoo is not configured. Add ODOO_URL, ODOO_DB, ODOO_USERNAME, and ODOO_API_KEY to your .env file.",
    });
    return true;
  }

  const odoo = getOdooEnv(env);

  try {
    if (path === "/api/health" && req.method === "GET") {
      const health = await testOdooConnection(odoo);
      sendJson(res, 200, health);
      return true;
    }

    if (path === "/api/rooms" && req.method === "GET") {
      const rooms = await listOdooRooms(odoo);
      sendJson(res, 200, { rooms });
      return true;
    }

    if (path === "/api/events" && req.method === "GET") {
      const events = await listUpcomingOdooEvents(odoo);
      sendJson(res, 200, { events });
      return true;
    }

    if (path === "/api/events/image" && req.method === "GET") {
      const eventId = Number(url.searchParams.get("id"));
      if (!eventId) {
        sendJson(res, 400, { error: "id is required" });
        return true;
      }

      const image = await getOdooEventImage(odoo, eventId);
      if (!image) {
        sendJson(res, 404, { error: "No image for this event" });
        return true;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", image.contentType);
      // The v= query param changes whenever the event is edited in Odoo,
      // so long-lived caching is safe here.
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(image.data);
      return true;
    }

    if (path === "/api/events/register" && req.method === "POST") {
      let body: {
        eventId?: number;
        name?: string;
        email?: string;
        phone?: string;
        company?: string;
        answers?: { questionId?: number; text?: string; answerId?: number }[];
      };
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { error: "Invalid JSON in request body" });
        return true;
      }

      const { eventId, name, email, phone, company, answers } = body;

      if (!eventId || !name || !email || !phone) {
        sendJson(res, 400, {
          error: "eventId, name, email, and phone are required",
        });
        return true;
      }

      const registration = await registerForOdooEvent(odoo, {
        eventId: Number(eventId),
        name,
        email,
        phone,
        company,
        answers: (answers ?? [])
          .filter((a) => a && Number(a.questionId))
          .map((a) => ({
            questionId: Number(a.questionId),
            text: typeof a.text === "string" ? a.text : undefined,
            answerId: a.answerId != null ? Number(a.answerId) : undefined,
          })),
      });

      sendJson(res, 201, {
        success: true,
        message: "You're registered!",
        registrationId: registration.id,
        barcode: registration.barcode,
      });
      return true;
    }

    if (path === "/api/availability" && req.method === "GET") {
      const date = url.searchParams.get("date") ?? "";
      const time = url.searchParams.get("time") ?? "";
      const duration = Number(url.searchParams.get("duration") ?? "60");
      const roomIdsParam = url.searchParams.get("roomIds") ?? "";

      if (!date || !time || !roomIdsParam) {
        sendJson(res, 400, { error: "date, time, and roomIds are required" });
        return true;
      }

      const roomIds = roomIdsParam
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (roomIds.length === 0) {
        sendJson(res, 400, {
          error: "roomIds must contain valid numeric Odoo room IDs.",
        });
        return true;
      }

      const availability = await checkAllOdooRoomAvailability(
        odoo,
        roomIds,
        date,
        time,
        duration
      );

      const stringKeyed = Object.fromEntries(
        Object.entries(availability).map(([k, v]) => [String(k), v])
      );
      sendJson(res, 200, { availability: stringKeyed, date, time, duration });
      return true;
    }

    const availabilityMatch = path.match(/^\/api\/rooms\/(\d+)\/availability$/);
    if (availabilityMatch && req.method === "GET") {
      const roomId = Number(availabilityMatch[1]);
      const date = url.searchParams.get("date") ?? "";
      const time = url.searchParams.get("time") ?? "";
      const duration = Number(url.searchParams.get("duration") ?? "60");

      if (!date || !time) {
        sendJson(res, 400, { error: "date and time query params are required" });
        return true;
      }

      const available = await checkOdooRoomAvailability(
        odoo,
        roomId,
        date,
        time,
        duration
      );
      sendJson(res, 200, { available, roomId, date, time, duration });
      return true;
    }

    if (path === "/api/payments/checkout" && req.method === "POST") {
      if (!isAfsConfigured(env)) {
        sendJson(res, 503, { error: "Payment gateway is not configured." });
        return true;
      }

      const body = JSON.parse(await readBody(req));
      const roomId = Number(body.roomId);
      const durationMinutes = Number(body.durationMinutes ?? 60);

      if (!roomId) {
        sendJson(res, 400, { error: "roomId is required" });
        return true;
      }

      const pricing = findRoomPricing(roomId);
      const hourlyRate = pricing?.hourlyRate ?? 5.5;
      const amount = calculateBookingTotal(hourlyRate, durationMinutes);
      const merchantTransactionId = `SH${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const afs = getAfsEnv(env);
      let checkout;
      try {
        checkout = await createAfsCheckout(afs, {
          amount: amount.toFixed(2),
          merchantTransactionId,
        });
      } catch (error) {
        logPayment("checkout.failed", {
          merchantTransactionId,
          roomId,
          durationMinutes,
          amountBhd: amount,
          error: errorMessage(error),
        });
        throw error;
      }

      logPayment("checkout.created", {
        merchantTransactionId,
        checkoutId: checkout.checkoutId,
        roomId,
        durationMinutes,
        amountBhd: amount,
        gateway: afs.baseUrl,
        ip: clientIp(req),
      });

      sendJson(res, 200, {
        checkoutId: checkout.checkoutId,
        merchantTransactionId,
        amount,
        baseUrl: afs.baseUrl,
      });
      return true;
    }

    if (path === "/api/payments/verify" && req.method === "POST") {
      if (!isAfsConfigured(env)) {
        sendJson(res, 503, { error: "Payment gateway is not configured." });
        return true;
      }

      const body = JSON.parse(await readBody(req));
      const resourcePath = String(body.resourcePath ?? "");
      const ip = clientIp(req);

      if (!isValidAfsResourcePath(resourcePath)) {
        logPayment("verify.REJECTED.bad-resource-path", { resourcePath, ip });
        sendJson(res, 400, { error: "Invalid resourcePath" });
        return true;
      }

      const afs = getAfsEnv(env);
      const result = await verifyAfsPayment(afs, resourcePath);

      logPayment("verify.result", {
        success: result.success,
        pending: result.pending,
        code: result.code,
        description: result.description,
        amountCharged: result.amount,
        currency: result.currency,
        paymentType: result.paymentType,
        merchantTransactionId: result.merchantTransactionId,
        email: body.email,
        ip,
      });

      if (isTestModeCode(result.code)) {
        logPayment("verify.WARNING.test-mode", {
          merchantTransactionId: result.merchantTransactionId,
          code: result.code,
          note: "AFS returned a TEST-MODE success code — the card was never really charged. Check AFS_BASE_URL / entity mode on the server.",
        });
      }

      if (!result.success) {
        sendJson(res, 200, {
          success: false,
          pending: result.pending,
          message: `${result.description} (code ${result.code})`,
        });
        return true;
      }

      const roomId = Number(body.roomId);
      const durationMinutes = Number(body.duration ?? 60);
      const pricing = findRoomPricing(roomId);
      const hourlyRate = pricing?.hourlyRate ?? 5.5;
      const amount = calculateBookingTotal(hourlyRate, durationMinutes);

      // The booking details are client-supplied, so the price they imply must
      // match what AFS actually charged — otherwise a small payment could be
      // replayed into a big booking.
      if (result.amount && Number(result.amount) !== amount) {
        logPayment("verify.REJECTED.amount-mismatch", {
          merchantTransactionId: result.merchantTransactionId,
          amountCharged: result.amount,
          amountExpected: amount.toFixed(2),
          roomId,
          durationMinutes,
          ip,
        });
        sendJson(res, 200, {
          success: false,
          message:
            "The charged amount did not match this booking's price. Please contact Spire Hub — do not pay again.",
        });
        return true;
      }

      if (result.currency && result.currency !== afs.currency) {
        logPayment("verify.REJECTED.currency-mismatch", {
          merchantTransactionId: result.merchantTransactionId,
          currencyCharged: result.currency,
          currencyExpected: afs.currency,
          ip,
        });
        sendJson(res, 200, {
          success: false,
          message:
            "The payment currency did not match. Please contact Spire Hub — do not pay again.",
        });
        return true;
      }

      const paymentKey = result.merchantTransactionId ?? resourcePath;
      if (processedPayments.has(paymentKey)) {
        logPayment("verify.REJECTED.duplicate", {
          merchantTransactionId: result.merchantTransactionId,
          ip,
        });
        sendJson(res, 200, {
          success: false,
          message:
            "This payment was already processed. If you don't see a booking confirmation, contact Spire Hub — do not pay again.",
        });
        return true;
      }
      processedPayments.add(paymentKey);

      const bookingPayload = {
        roomId,
        date: body.date,
        time: body.time,
        durationMinutes,
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        notes: body.notes,
        layout: body.layout,
        amountBhd: amount,
        paid: true,
        paymentReference: result.merchantTransactionId,
      };

      const booking = await createOdooBooking(odoo, bookingPayload);

      logPayment("booking.created", {
        merchantTransactionId: result.merchantTransactionId,
        bookingId: booking.id,
        bookingName: booking.name,
        roomId,
        date: body.date,
        time: body.time,
        durationMinutes,
        amountBhd: amount,
      });

      // Alert the Spire team so they can prepare the room. Isolated + logged
      // so a mail failure never affects the booking or the guest response.
      try {
        const adminEmail = env.ODOO_ADMIN_NOTIFY_EMAIL ?? "se@spire.bh";
        const adminMailId = await sendAdminBookingEmail(odoo, adminEmail, {
          name: body.name,
          company: body.company,
          email: body.email,
          phone: body.phone,
          roomName: String(body.roomName ?? "Meeting Room"),
          layout: body.layout,
          date: body.date,
          time: body.time,
          durationMinutes,
          amountBhd: amount,
          paymentReference: result.merchantTransactionId,
          notes: body.notes,
          bookingName: booking.name,
        });
        logPayment("admin.notified", {
          merchantTransactionId: result.merchantTransactionId,
          bookingId: booking.id,
          adminEmail,
          adminMailId,
        });
      } catch (adminError) {
        logPayment("admin.notify.FAILED", {
          merchantTransactionId: result.merchantTransactionId,
          bookingId: booking.id,
          error: errorMessage(adminError),
        });
      }

      try {
        const partnerId = await findOrCreatePartner(odoo, bookingPayload);
        const invoice = await createAndPayBookingInvoice(odoo, getInvoiceEnv(env), {
          partnerId,
          roomName: String(body.roomName ?? "Meeting Room"),
          isWorkshop: pricing?.isWorkshop ?? false,
          date: body.date,
          time: body.time,
          durationMinutes,
          totalBhd: amount,
          paymentReference: result.merchantTransactionId ?? "",
        });
        logPayment("invoice.created", {
          merchantTransactionId: result.merchantTransactionId,
          invoiceId: invoice.invoiceId,
          invoiceName: invoice.invoiceName,
          totalBhd: amount,
        });

        // Send the invoice to the customer's WhatsApp via the approved Odoo
        // template. Isolated so a WhatsApp failure never affects the booking,
        // and always logged so it can never fail silently (unlike email did).
        try {
          const waPhone = toBahrainE164(body.phone);
          if (!waPhone) {
            logPayment("whatsapp.skipped", {
              merchantTransactionId: result.merchantTransactionId,
              invoiceId: invoice.invoiceId,
              reason: "no usable phone number",
            });
          } else {
            const waTemplateId = Number(env.ODOO_WHATSAPP_INVOICE_TEMPLATE_ID ?? 3);
            const waMessageId = await sendWhatsAppTemplate(odoo, {
              resModel: "account.move",
              resId: invoice.invoiceId,
              templateId: waTemplateId,
              phone: waPhone,
            });
            logPayment("whatsapp.sent", {
              merchantTransactionId: result.merchantTransactionId,
              invoiceId: invoice.invoiceId,
              phone: waPhone,
              waMessageId,
            });
          }
        } catch (waError) {
          logPayment("whatsapp.FAILED", {
            merchantTransactionId: result.merchantTransactionId,
            invoiceId: invoice.invoiceId,
            error: errorMessage(waError),
          });
        }
      } catch (error) {
        // Booking already succeeded and the guest is confirmed — invoicing
        // failures shouldn't block the response. Spire team can invoice manually.
        logPayment("invoice.FAILED", {
          merchantTransactionId: result.merchantTransactionId,
          bookingId: booking.id,
          totalBhd: amount,
          error: errorMessage(error),
          note: "Guest is booked and charged but has no invoice — create it manually in Odoo.",
        });
      }

      sendJson(res, 201, { success: true, booking });
      return true;
    }

    if (path === "/api/bookings" && req.method === "POST") {
      const body = JSON.parse(await readBody(req));
      const result = await createOdooBooking(odoo, {
        roomId: Number(body.roomId),
        date: body.date,
        time: body.time,
        durationMinutes: Number(body.duration ?? 60),
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        notes: body.notes,
        amountBhd: body.amountBhd != null ? Number(body.amountBhd) : undefined,
        layout: body.layout,
      });
      sendJson(res, 201, { booking: result });
      return true;
    }

    if (path === "/api/mentors/apply" && req.method === "POST") {
      let body: {
        fullName?: string;
        email?: string;
        phone?: string;
        title?: string;
        bio?: string;
        linkedinUrl?: string;
      };
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { error: "Invalid JSON in request body" });
        return true;
      }

      const { fullName, email, phone, title, bio, linkedinUrl } = body;

      if (!fullName || !email || !title || !bio || !linkedinUrl) {
        sendJson(res, 400, {
          error: "fullName, email, title, bio, and linkedinUrl are required",
        });
        return true;
      }

      const application = await createMentorApplication(odoo, {
        fullName,
        email,
        phone,
        title,
        bio,
        linkedinUrl,
      });

      sendJson(res, 201, {
        success: true,
        message: "Application received — we'll be in touch soon.",
        leadId: application.id,
      });
      return true;
    }

    if (path === "/api/contact" && req.method === "POST") {
      let body: {
        fullName?: string;
        email?: string;
        interest?: string;
        phone?: string;
        comments?: string;
      };
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { error: "Invalid JSON in request body" });
        return true;
      }

      const { fullName, email, interest, phone, comments } = body;

      if (!fullName || !email || !interest || !phone) {
        sendJson(res, 400, {
          error: "fullName, email, interest, and phone are required",
        });
        return true;
      }

      const lead = await createOdooLead(odoo, {
        fullName,
        email,
        phone,
        interest,
        comments,
      });

      sendJson(res, 200, {
        success: true,
        message: "Thank you! We'll be in touch soon.",
        leadId: lead.id,
      });
      return true;
    }

    sendJson(res, 404, { error: "Not found" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Odoo error";
    if (path.startsWith("/api/payments/")) {
      // A failure here can mean the guest was charged but got no booking —
      // it must always leave a trace in the payment log.
      logPayment("payments.ERROR", { path, error: message });
    }
    const status = message.includes("no longer available")
      ? 409
      : message.includes("body too large")
        ? 413
        : 500;
    sendJson(res, status, { error: message });
    return true;
  }
}
