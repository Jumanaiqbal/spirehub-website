import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { meetingRooms as fallbackRooms, durationOptions } from "../../data/meetingRooms";
import type { MeetingRoom } from "../../data/meetingRooms";
import { formatLocalDate } from "../../utils/dates";
import FittedImage from "../ui/FittedImage";
import {
  checkAllRoomAvailability,
  getMeetingRooms,
  submitBooking,
  type BookingResult,
} from "../../services/booking";
import {
  createCheckout,
  verifyPayment,
  type PendingBooking,
} from "../../services/payments";
import { paymentDetails, hasPaymentDetails } from "../../config/paymentDetails";
import { formatBhd, getBookingSummary } from "../../utils/pricing";

type Step = "rooms" | "details" | "payment" | "success";

const PENDING_BOOKING_KEY = "spireHub_pendingCardBooking";

// AFS/BENEFIT gateway approval is pending — until it's live, bookings only
// offer bank transfer. Flip to "true" once the merchant account is approved.
const AFS_PAYMENTS_ENABLED = import.meta.env.VITE_AFS_PAYMENTS_ENABLED === "true";

function getShopperResultUrl(): string {
  return `${window.location.origin}${window.location.pathname}?afsPayment=1`;
}

interface BookingModalProps {

  open: boolean;
  onClose: () => void;
  initialDate: string;
  initialTime: string;
  preselectedRoomId?: string | null;
}

export default function BookingModal({
  open,
  onClose,
  initialDate,
  initialTime,
  preselectedRoomId = null,
}: BookingModalProps) {
  const [step, setStep] = useState<Step>("rooms");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [duration, setDuration] = useState(60);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<BookingResult | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [rooms, setRooms] = useState<MeetingRoom[]>(fallbackRooms);
  const [roomsReady, setRoomsReady] = useState(false);
  const [workshopLayout, setWorkshopLayout] = useState("");
  const [payingOnline, setPayingOnline] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [afsBaseUrl, setAfsBaseUrl] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const detailsFormRef = useRef<HTMLFormElement>(null);
  const skipAutoRefresh = useRef(true);
  const resumingPayment = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("afsPayment") === "1"
  );

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId),
    [selectedRoomId, rooms]
  );

  const bookingSummary = useMemo(() => {
    if (!selectedRoom) return null;
    return getBookingSummary(selectedRoom, duration);
  }, [selectedRoom, duration]);

  const selectedLayout = useMemo(() => {
    if (!selectedRoom?.layouts?.length) return null;
    return (
      selectedRoom.layouts.find((l) => l.id === workshopLayout) ??
      selectedRoom.layouts[0]
    );
  }, [selectedRoom, workshopLayout]);

  const loadAvailability = async (
    checkDate: string,
    checkTime: string,
    roomList: MeetingRoom[],
    roomId?: string | null
  ) => {
    if (roomList.length === 0) return;

    setCheckingRooms(true);
    setSubmitError(null);

    try {
      const results = await checkAllRoomAvailability(
        roomList.map((r) => r.id),
        checkDate,
        checkTime,
        duration
      );
      setAvailability(results);

      if (roomId && results[roomId]) {
        setSelectedRoomId(roomId);
        setStep("details");
      } else if (roomId) {
        setSelectedRoomId(null);
        setStep("rooms");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not check availability. Please try again.";
      setSubmitError(message);
      setAvailability({});
      setStep("rooms");
    } finally {
      setCheckingRooms(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setRoomsReady(false);
      skipAutoRefresh.current = true;
      return;
    }

    if (resumingPayment.current) return;

    let cancelled = false;

    async function init() {
      setDate(initialDate);
      setTime(initialTime);
      setResult(null);
      setSubmitError(null);
      setForm({ name: "", email: "", phone: "", company: "", notes: "" });
      setStep("rooms");
      setSelectedRoomId(null);
      setWorkshopLayout("");
      setAvailability({});

      const { rooms: loaded } = await getMeetingRooms();
      if (cancelled) return;

      setRooms(loaded);
      setRoomsReady(true);
      skipAutoRefresh.current = true;

      await loadAvailability(initialDate, initialTime, loaded, preselectedRoomId);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [open, initialDate, initialTime, preselectedRoomId]);

  // Resume a card payment after AFS redirects back to this page.
  useEffect(() => {
    if (!resumingPayment.current) return;

    const params = new URLSearchParams(window.location.search);
    const resourcePath = params.get("resourcePath");
    window.history.replaceState({}, "", window.location.pathname);

    const pendingRaw = sessionStorage.getItem(PENDING_BOOKING_KEY);
    sessionStorage.removeItem(PENDING_BOOKING_KEY);

    if (!resourcePath || !pendingRaw) {
      resumingPayment.current = false;
      if (resourcePath && !pendingRaw) {
        setSubmitError(
          "We received your payment redirect but your booking details were lost. " +
            "If your card was charged, please contact the Spire team — do not pay again."
        );
      }
      return;
    }

    const pending = JSON.parse(pendingRaw) as PendingBooking;
    setStep("payment");
    setVerifyingPayment(true);

    verifyPayment(resourcePath, pending)
      .then((verifyResult) => {
        if (verifyResult.success && verifyResult.booking) {
          setResult({
            reference: verifyResult.booking.name,
            room: pending.room,
            date: pending.date,
            time: pending.time,
            duration: pending.duration,
            totalBhd: pending.totalBhd,
            layout: pending.layout,
            paymentStatus: "paid",
          });
          setStep("success");
        } else {
          setSubmitError(
            verifyResult.message ?? "Payment could not be confirmed. Please try again."
          );
          setStep("rooms");
        }
      })
      .catch((error) => {
        setSubmitError(
          error instanceof Error ? error.message : "Could not verify payment."
        );
        setStep("rooms");
      })
      .finally(() => {
        setVerifyingPayment(false);
        resumingPayment.current = false;
      });
  }, []);

  useEffect(() => {
    if (!open || !roomsReady || step !== "rooms") return;

    if (skipAutoRefresh.current) {
      skipAutoRefresh.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void loadAvailability(date, time, rooms);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [date, time, duration, open, roomsReady, rooms, step]);

  // Load the AFS Copy&Pay widget script once we have a checkout session.
  useEffect(() => {
    if (step !== "payment" || !checkoutId || !afsBaseUrl) return;

    (window as unknown as Record<string, unknown>).wpwlOptions = {
      style: "card",
      brandDetection: true,
      locale: "en",
    };

    const script = document.createElement("script");
    script.src = `${afsBaseUrl}/v1/paymentWidgets.js?checkoutId=${checkoutId}`;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      delete (window as unknown as Record<string, unknown>).wpwlOptions;
    };
  }, [step, checkoutId, afsBaseUrl]);

  const resetAndClose = () => {
    setStep("rooms");
    setSelectedRoomId(null);
    setResult(null);
    setAvailability({});
    setCheckoutId(null);
    setAfsBaseUrl(null);
    onClose();
  };

  const handleReserveBankTransfer = async () => {
    if (!selectedRoom) return;
    if (!detailsFormRef.current?.reportValidity()) return;

    setLoading(true);
    setSubmitError(null);

    try {
      const layoutLabel = selectedLayout?.label;
      const booking = await submitBooking(
        {
          roomId: selectedRoom.id,
          date,
          time,
          duration,
          layout: layoutLabel,
          ...form,
        },
        selectedRoom
      );
      setResult(booking);
      setStep("success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not complete your booking. Please try again.";

      setSubmitError(message);

      if (message.toLowerCase().includes("no longer available")) {
        await loadAvailability(date, time, rooms);
        setStep("rooms");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!AFS_PAYMENTS_ENABLED || !selectedRoom || !bookingSummary) return;

    setPayingOnline(true);
    setSubmitError(null);

    try {
      const pending: PendingBooking = {
        room: selectedRoom,
        date,
        time,
        duration,
        layout: selectedLayout?.label,
        totalBhd: bookingSummary.total,
        ...form,
      };
      sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(pending));

      const checkout = await createCheckout({
        roomId: selectedRoom.id,
        durationMinutes: duration,
      });

      setCheckoutId(checkout.checkoutId);
      setAfsBaseUrl(checkout.baseUrl);
      setStep("payment");
    } catch (error) {
      sessionStorage.removeItem(PENDING_BOOKING_KEY);
      setSubmitError(
        error instanceof Error ? error.message : "Could not start payment. Please try again."
      );
    } finally {
      setPayingOnline(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-spire-navy/50 backdrop-blur-sm"
        onClick={resetAndClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-spire-navy">Book a Meeting Room</h3>
            {step !== "success" && (
              <p className="text-xs text-spire-gray">
                {formatLocalDate(date, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {time} · {durationOptions.find((d) => d.value === duration)?.label}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-2 text-spire-gray hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === "rooms" && (
              <motion.div
                key="rooms"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {submitError && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                    {submitError}
                  </div>
                )}

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-spire-gray">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-spire-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-spire-gray">Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-spire-blue"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-spire-gray">Duration</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {durationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDuration(opt.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          duration === opt.value
                            ? "bg-spire-navy text-white"
                            : "bg-gray-100 text-spire-gray hover:bg-gray-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void loadAvailability(date, time, rooms)}
                  className="mb-4 text-xs font-semibold text-spire-blue hover:text-spire-navy"
                >
                  Refresh availability
                </button>

                {checkingRooms ? (
                  <div className="flex items-center justify-center py-12 text-spire-gray">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking availability…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((room) => {
                      const available = availability[room.id];
                      const statusKnown = room.id in availability;
                      const isAvailable = statusKnown ? available : false;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          disabled={!isAvailable || checkingRooms}
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setSubmitError(null);
                            setWorkshopLayout(room.layouts?.[0]?.id ?? "");
                            setStep("details");
                          }}
                          className={`flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-all ${
                            isAvailable
                              ? "border-gray-200 hover:border-spire-blue hover:shadow-md"
                              : "cursor-not-allowed border-gray-100 opacity-50"
                          }`}
                        >
                          <FittedImage
                            src={room.image}
                            alt={room.name}
                            className="h-16 w-20 shrink-0 rounded-lg"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-spire-navy">{room.name}</p>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                  !statusKnown
                                    ? "bg-gray-100 text-gray-500"
                                    : isAvailable
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {!statusKnown
                                  ? "Checking…"
                                  : isAvailable
                                    ? "Available"
                                    : "Booked"}
                              </span>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-spire-gray">
                              <Users className="h-3 w-3" />
                              Up to {room.capacity} pax
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-spire-navy">
                              {formatBhd(room.hourlyRate ?? 5.5)}/hr
                              <span className="font-normal text-spire-gray"> · VAT incl.</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {step === "details" && selectedRoom && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  type="button"
                  onClick={() => setStep("rooms")}
                  className="mb-4 flex items-center gap-1 text-sm text-spire-blue hover:text-spire-navy"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to rooms
                </button>

                <div className="mb-5 rounded-xl bg-spire-light p-4">
                  <p className="font-semibold text-spire-navy">{selectedRoom.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-spire-gray">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatLocalDate(date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {time} · {durationOptions.find((d) => d.value === duration)?.label}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Up to {selectedLayout?.capacity ?? selectedRoom.capacity} pax
                    </span>
                  </p>
                  {bookingSummary && (
                    <div className="mt-3 border-t border-spire-navy/10 pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-spire-gray">
                          {formatBhd(bookingSummary.hourlyRate)}/hr × {bookingSummary.hours} hr
                        </span>
                        <span className="font-bold text-spire-navy">
                          {formatBhd(bookingSummary.total)}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-spire-gray">VAT included</p>
                    </div>
                  )}
                </div>

                {selectedRoom.isWorkshop && selectedRoom.layouts && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-spire-gray">
                      Room layout *
                    </label>
                    <div className="mt-2 space-y-2">
                      {selectedRoom.layouts.map((layout) => (
                        <label
                          key={layout.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                            (workshopLayout || selectedRoom.layouts![0].id) === layout.id
                              ? "border-spire-blue bg-blue-50/50"
                              : "border-gray-200 hover:border-spire-blue/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="workshop-layout"
                            value={layout.id}
                            checked={(workshopLayout || selectedRoom.layouts![0].id) === layout.id}
                            onChange={() => setWorkshopLayout(layout.id)}
                            className="mt-1"
                          />
                          {layout.image && (
                            <FittedImage
                              src={layout.image}
                              alt={layout.label}
                              className="h-14 w-20 shrink-0 rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-spire-navy">
                              {layout.label}
                            </p>
                            <p className="text-xs text-spire-gray">
                              Up to {layout.capacity} pax · {layout.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <form ref={detailsFormRef} onSubmit={handlePayOnline} className="space-y-4">
                  {submitError && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                      {submitError}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-spire-gray">Full name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-spire-blue"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-spire-gray">Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-spire-blue"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-spire-gray">Phone *</label>
                      <input
                        required
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-spire-blue"
                        placeholder="+973 ..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-spire-gray">Company</label>
                    <input
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-spire-blue"
                      placeholder="Startup name (optional)"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-spire-gray">Notes</label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="mt-1 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-spire-blue"
                      placeholder="AV setup, catering, etc."
                    />
                  </div>

                  <p className="text-xs text-spire-gray">
                    By booking, you agree to our{" "}
                    <a
                      href="/terms.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-spire-blue hover:underline"
                    >
                      Terms of Service
                    </a>{" "}
                    (including our{" "}
                    <a
                      href="/terms.html#cancellations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-spire-blue hover:underline"
                    >
                      Cancellation Policy
                    </a>
                    ) and{" "}
                    <a
                      href="/privacy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-spire-blue hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </p>

                  {AFS_PAYMENTS_ENABLED && (
                    <button
                      type="submit"
                      disabled={payingOnline}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-spire-navy-dark disabled:opacity-70"
                    >
                      {payingOnline ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparing payment…
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Pay {formatBhd(bookingSummary?.total ?? 0)} online now
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={loading || payingOnline}
                    onClick={handleReserveBankTransfer}
                    className={
                      AFS_PAYMENTS_ENABLED
                        ? "flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-spire-gray transition-colors hover:border-spire-blue hover:text-spire-navy disabled:opacity-70"
                        : "flex w-full items-center justify-center gap-2 rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-spire-navy-dark disabled:opacity-70"
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Reserving…
                      </>
                    ) : (
                      "Reserve now, pay later by bank transfer"
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {verifyingPayment ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-spire-gray">
                    <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                    Verifying your payment…
                  </div>
                ) : checkoutId ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutId(null);
                        setAfsBaseUrl(null);
                        setStep("details");
                      }}
                      className="mb-4 flex items-center gap-1 text-sm text-spire-blue hover:text-spire-navy"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    {selectedRoom && bookingSummary && (
                      <div className="mb-5 flex items-center justify-between rounded-xl bg-spire-light px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-spire-navy">
                            {selectedRoom.name}
                          </p>
                          <p className="text-xs text-spire-gray">
                            {formatLocalDate(date, { day: "numeric", month: "short" })} · {time} ·{" "}
                            {durationOptions.find((d) => d.value === duration)?.label}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-spire-navy">
                          {formatBhd(bookingSummary.total)}
                        </p>
                      </div>
                    )}

                    <form
                      action={getShopperResultUrl()}
                      className="paymentWidgets"
                      data-brands="VISA MASTER"
                    ></form>

                    <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-spire-gray">
                      <CreditCard className="h-3.5 w-3.5" />
                      Secure payment powered by AFS — card details never touch our servers.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16 text-spire-gray">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing payment…
                  </div>
                )}
              </motion.div>
            )}

            {step === "success" && result && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-4 text-center"
              >
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                    result.paymentStatus === "paid" ? "bg-green-100" : "bg-amber-100"
                  }`}
                >
                  <CheckCircle2
                    className={`h-8 w-8 ${
                      result.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"
                    }`}
                  />
                </div>
                <h4 className="mt-4 text-xl font-bold text-spire-navy">
                  {result.paymentStatus === "paid" ? "Payment successful" : "Booking requested"}
                </h4>
                <p className="mt-2 text-sm text-spire-gray">
                  {result.paymentStatus === "paid" ? (
                    <>Your room is confirmed and paid in full. See you soon!</>
                  ) : (
                    <>
                      Your request is in our system as{" "}
                      <span className="font-semibold text-amber-700">not paid</span>. The Spire
                      team will contact you to arrange payment and confirm your room.
                    </>
                  )}
                </p>

                <div className="mt-6 rounded-xl bg-spire-light p-4 text-left text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-spire-gray">
                    Booking reference
                  </p>
                  <p className="mt-1 font-mono font-bold text-spire-navy">{result.reference}</p>
                  <div className="mt-3 space-y-1 text-spire-gray">
                    <p>
                      <span className="font-medium text-spire-navy">Room:</span>{" "}
                      {result.room.name}
                    </p>
                    {result.layout && (
                      <p>
                        <span className="font-medium text-spire-navy">Layout:</span>{" "}
                        {result.layout}
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-spire-navy">Date:</span>{" "}
                      {formatLocalDate(result.date, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    <p>
                      <span className="font-medium text-spire-navy">Time:</span> {result.time}
                    </p>
                    <p>
                      <span className="font-medium text-spire-navy">
                        {result.paymentStatus === "paid" ? "Amount paid:" : "Amount due:"}
                      </span>{" "}
                      <span className="font-bold text-spire-navy">
                        {formatBhd(result.totalBhd)}
                      </span>
                      <span className="text-xs"> (VAT incl.)</span>
                    </p>
                  </div>
                </div>

                {result.paymentStatus !== "paid" && hasPaymentDetails() ? (
                  <div className="mt-4 rounded-xl border border-spire-navy/15 bg-white p-4 text-left text-sm">
                    <p className="font-semibold text-spire-navy">Bank transfer details</p>
                    <p className="mt-2 text-xs text-spire-gray">
                      Pay within {paymentDetails.paymentDeadlineHours} hours. Put your booking
                      reference in the transfer description.
                    </p>
                    <dl className="mt-3 space-y-2 text-xs">
                      <div>
                        <dt className="text-spire-gray">Account name</dt>
                        <dd className="font-medium text-spire-navy">{paymentDetails.accountName}</dd>
                      </div>
                      <div>
                        <dt className="text-spire-gray">IBAN</dt>
                        <dd className="font-mono font-medium text-spire-navy">
                          {paymentDetails.iban}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-spire-gray">Account number</dt>
                        <dd className="font-mono font-medium text-spire-navy">
                          {paymentDetails.accountNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-spire-gray">Bank</dt>
                        <dd className="font-medium text-spire-navy">{paymentDetails.bankName}</dd>
                      </div>
                      <div>
                        <dt className="text-spire-gray">SWIFT</dt>
                        <dd className="font-mono font-medium text-spire-navy">
                          {paymentDetails.swift}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : result.paymentStatus !== "paid" ? (
                  <p className="mt-4 text-xs text-amber-800">
                    Payment details will be sent to your email. Our team will confirm once payment
                    is received.
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={resetAndClose}
                  className="mt-6 w-full rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-spire-navy-dark"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
