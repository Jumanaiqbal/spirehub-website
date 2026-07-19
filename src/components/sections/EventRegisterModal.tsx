import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, Clock, Download, Loader2, MapPin, X } from "lucide-react";
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { registerForEvent } from "../../services/events";
import type { EventQuestion, SpireEvent } from "../../services/events";

interface EventRegisterModalProps {
  event: SpireEvent | null;
  onClose: () => void;
}

/**
 * The form renders whatever questions the event has configured in Odoo.
 * Name/email/phone are needed for the registration record and ticket, so
 * synthetic fields fill in for them when an event doesn't ask its own.
 */
type FormField =
  | { key: string; kind: "question"; question: EventQuestion }
  | { key: string; kind: "base"; base: "name" | "email" | "phone" };

const BASE_LABELS: Record<"name" | "email" | "phone", string> = {
  name: "Full name",
  email: "Email address",
  phone: "Phone number",
};

const PLACEHOLDERS: Record<string, string> = {
  name: "Your name",
  email: "you@example.com",
  phone: "+973 XXXX XXXX",
  company_name: "Company or startup name",
};

function inputTypeFor(type: string): string {
  if (type === "email") return "email";
  if (type === "phone") return "tel";
  return "text";
}

const BAHRAIN_TZ: Intl.DateTimeFormatOptions = { timeZone: "Asia/Bahrain" };

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    ...BAHRAIN_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    ...BAHRAIN_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildFields(event: SpireEvent | null): FormField[] {
  const questions = event?.questions ?? [];
  const fields: FormField[] = questions.map((question) => ({
    key: `q${question.id}`,
    kind: "question",
    question,
  }));

  const has = (type: string) => questions.some((q) => q.type === type);
  if (!has("phone")) fields.unshift({ key: "base-phone", kind: "base", base: "phone" });
  if (!has("email")) fields.unshift({ key: "base-email", kind: "base", base: "email" });
  if (!has("name")) fields.unshift({ key: "base-name", kind: "base", base: "name" });

  return fields;
}

export default function EventRegisterModal({ event, onClose }: EventRegisterModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [registeredName, setRegisteredName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketQr, setTicketQr] = useState<string | null>(null);

  const fields = useMemo(() => buildFields(event), [event]);

  const handleClose = () => {
    setValues({});
    setRegisteredName("");
    setError(null);
    setTicketQr(null);
    onClose();
  };

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Base registration fields come from the matching typed question when
    // the event asks its own, otherwise from the synthetic base field.
    const valueOfType = (type: "name" | "email" | "phone" | "company_name") => {
      const question = (event.questions ?? []).find((q) => q.type === type);
      if (question) return (values[`q${question.id}`] ?? "").trim();
      return (values[`base-${type}`] ?? "").trim();
    };

    const name = valueOfType("name");
    const email = valueOfType("email");
    const phone = valueOfType("phone") || "-";
    const company = valueOfType("company_name");

    const answers = (event.questions ?? [])
      .map((question) => {
        const raw = (values[`q${question.id}`] ?? "").trim();
        if (!raw) return null;
        return question.type === "simple_choice"
          ? { questionId: question.id, answerId: Number(raw) }
          : { questionId: question.id, text: raw };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerForEvent({
        eventId: event.id,
        name,
        email,
        phone,
        company: company || undefined,
        answers,
      });
      setRegisteredName(name);
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

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue";

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
                  Thanks, {registeredName.split(" ")[0]}! You're on the list for{" "}
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
              <>
                <div className="mt-5 space-y-2.5 rounded-xl bg-spire-light p-4 text-sm text-spire-gray">
                  <p className="flex items-start gap-2.5">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-spire-blue" />
                    <span className="font-medium text-spire-navy">
                      {formatEventDate(event.dateBegin)}
                    </span>
                  </p>
                  <p className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-spire-blue" />
                    <span>
                      {formatEventTime(event.dateBegin)} – {formatEventTime(event.dateEnd)}{" "}
                      (Bahrain time)
                    </span>
                  </p>
                  {(event.venueName || event.venueAddress) && (
                    <p className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-spire-blue" />
                      <span className="whitespace-pre-line">
                        {event.venueAddress ?? event.venueName}
                      </span>
                    </p>
                  )}
                </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {fields.map((field) => {
                  if (field.kind === "base") {
                    return (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700">
                          {BASE_LABELS[field.base]}
                        </label>
                        <input
                          type={inputTypeFor(field.base)}
                          required
                          value={values[field.key] ?? ""}
                          onChange={(e) => setValue(field.key, e.target.value)}
                          className={inputClass}
                          placeholder={PLACEHOLDERS[field.base]}
                        />
                      </div>
                    );
                  }

                  const { question } = field;
                  const label = (
                    <label className="block text-sm font-medium text-gray-700">
                      {question.title}
                      {!question.required && (
                        <span className="font-normal text-gray-400"> (optional)</span>
                      )}
                    </label>
                  );

                  if (question.type === "simple_choice") {
                    return (
                      <div key={field.key}>
                        {label}
                        <select
                          required={question.required}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setValue(field.key, e.target.value)}
                          className={inputClass}
                        >
                          <option value="" disabled>
                            Select an option…
                          </option>
                          {question.options.map((option) => (
                            <option key={option.id} value={String(option.id)}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key}>
                      {label}
                      <input
                        type={inputTypeFor(question.type)}
                        required={question.required}
                        value={values[field.key] ?? ""}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className={inputClass}
                        placeholder={PLACEHOLDERS[question.type] ?? ""}
                      />
                    </div>
                  );
                })}

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
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
