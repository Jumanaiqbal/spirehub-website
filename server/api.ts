import type { IncomingMessage, ServerResponse } from "node:http";
import { getOdooEnv, isOdooConfigured } from "./odoo/client";
import {
  checkAllOdooRoomAvailability,
  checkOdooRoomAvailability,
  createOdooBooking,
  listOdooRooms,
  testOdooConnection,
} from "./odoo/rooms";

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
      try {
        const body = JSON.parse(await readBody(req));
        const { fullName, email, interest, phone, comments } = body;

        // Validate required fields
        if (!fullName || !email || !interest || !phone) {
          sendJson(res, 400, {
            error: "fullName, email, interest, and phone are required",
          });
          return true;
        }

        // Log to console (for now)
        console.log(
          "\n=== NEW CONTACT FORM SUBMISSION ===",
          new Date().toISOString()
        );
        console.log(`Name: ${fullName}`);
        console.log(`Email: ${email}`);
        console.log(`Interest: ${interest}`);
        console.log(`Phone: ${phone}`);
        console.log(`Comments: ${comments || "(none)"}`);
        console.log("===================================\n");

        // Return success response
        sendJson(res, 200, {
          success: true,
          message: "Contact form submitted successfully",
        });
        return true;
      } catch (parseError) {
        sendJson(res, 400, { error: "Invalid JSON in request body" });
        return true;
      }
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
