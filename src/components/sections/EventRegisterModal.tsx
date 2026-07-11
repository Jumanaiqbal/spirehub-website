import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Download, Loader2, X } from "lucide-react";
import { useState } from "react";
import QRCode from "qrcode";
import { registerForEvent } from "../../services/events";
import type { SpireEvent } from "../../services/events";

interface EventRegisterModalProps {
  event: SpireEvent | null;
  onClose: () => void;
}

export default function EventRegisterModal({ event, onClose }: EventRegisterModalProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketQr, setTicketQr] = useState<string | null>(null);

  const handleClose = () => {
    setForm({ name: "", email: "", phone: "", company: "" });
    setError(null);
    setTicketQr(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerForEvent({ eventId: event.id, ...form });
      if (result.barcode) {
        const qrDataUrl = await QRCode.toDataURL(result.barcode, { width: 320, margin: 1 });
        setTicketQr(qrDataUrl);
      } else {
        setTicketQr("none");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not register. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const success = ticketQr !== null;

  return (
    <AnimatePresence>
      {event && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-spire-navy">
                  {success ? "You're registered!" : "Register"}
                </h2>
                {!success && (
                  <p className="mt-1 text-sm text-gray-600">{event.name}</p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 transition hover:text-gray-600"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {success ? (
              <div className="mt-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Thanks, {form.name.split(" ")[0]}! You're on the list for{" "}
                  <span className="font-medium text-spire-navy">{event.name}</span>.
                  We'll see you there.
                </p>
                <p className="mt-2 text-xs text-spire-gray">
                  We've also emailed you a ticket with calendar and map links —
                  or use the QR code below.
                </p>

                {ticketQr && ticketQr !== "none" && (
                  <div className="mt-6 rounded-xl border border-gray-200 p-4">
                    <img
                      src={ticketQr}
                      alt="Your event ticket QR code"
                      className="mx-auto h-40 w-40"
                    />
                    <p className="mt-3 text-xs text-spire-gray">
                      Show this QR code at check-in
                    </p>
                    <a
                      href={ticketQr}
                      download={`spire-hub-ticket-${event.id}.png`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-spire-blue hover:text-spire-navy"
                    >
                      <Download className="h-4 w-4" />
                      Download ticket
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 w-full rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-spire-navy-dark"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="+973 XXXX XXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="Startup name"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-spire-navy px-6 py-3 font-semibold text-white transition hover:bg-spire-navy-dark disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register"
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
