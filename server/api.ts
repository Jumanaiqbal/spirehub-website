import type { IncomingMessage, ServerResponse } from "node:http";
import { getOdooEnv, isOdooConfigured } from "./odoo/client";
import {
  checkAllOdooRoomAvailability,
  checkOdooRoomAvailability,
  createOdooBooking,
  listOdooRooms,
  testOdooConnection,
} from "./odoo/rooms";
import { createOdooLead } from "./odoo/leads";
import { listUpcomingOdooEvents, registerForOdooEvent } from "./odoo/events";
import { createAfsCheckout, getAfsEnv, isAfsConfigured, verifyAfsPayment } from "./afs/client";
import { findRoomPricing } from "../src/data/roomPricing";
import { calculateBookingTotal } from "../src/utils/pricing";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

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
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  if (!path.startsWith("/api/")) {
    return false;
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

    if (path === "/api/events/register" && req.method === "POST") {
      let body: {
        eventId?: number;
        name?: string;
        email?: string;
        phone?: string;
        company?: string;
      };
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { error: "Invalid JSON in request body" });
        return true;
      }

      const { eventId, name, email, phone, company } = body;

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
      const checkout = await createAfsCheckout(afs, {
        amount: amount.toFixed(2),
        merchantTransactionId,
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

      if (!resourcePath) {
        sendJson(res, 400, { error: "resourcePath is required" });
        return true;
      }

      const afs = getAfsEnv(env);
      const result = await verifyAfsPayment(afs, resourcePath);

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

      const booking = await createOdooBooking(odoo, {
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
      });

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
    const status = message.includes("no longer available") ? 409 : 500;
    sendJson(res, status, { error: message });
    return true;
  }
}
