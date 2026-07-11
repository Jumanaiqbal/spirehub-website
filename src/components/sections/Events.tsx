import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionTag } from "../ui/SectionTag";
import EventRegisterModal from "./EventRegisterModal";
import { fetchUpcomingEvents, type SpireEvent } from "../../services/events";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop";

function formatEventDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", {
      timeZone: "Asia/Bahrain",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

function formatEventTimeRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bahrain",
    hour: "numeric",
    minute: "2-digit",
  };
  const start = new Date(startIso).toLocaleTimeString("en-US", opts);
  const end = new Date(endIso).toLocaleTimeString("en-US", opts);
  return `${start} – ${end}`;
}

export default function Events() {
  const [events, setEvents] = useState<SpireEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [registeringEvent, setRegisteringEvent] = useState<SpireEvent | null>(null);

  useEffect(() => {
    fetchUpcomingEvents()
      .then((upcoming) => setEvents(upcoming))
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, []);

  if (loaded && events.length === 0) {
    return null;
  }

  return (
    <section id="events" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 max-w-2xl"
        >
          <SectionTag>Events</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Connect. Learn. Be inspired.
          </h2>
          <p className="mt-4 text-spire-gray">
            Join workshops, founder talks, and networking events designed to
            accelerate your startup journey.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.imageUrl ?? FALLBACK_IMAGE}
                  alt={event.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-spire-navy shadow-sm">
                  {formatEventDate(event.dateBegin)}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-spire-navy">{event.name}</h3>
                <p className="mt-1 text-sm text-spire-gray">
                  {formatEventTimeRange(event.dateBegin, event.dateEnd)}
                </p>
                <button
                  type="button"
                  onClick={() => setRegisteringEvent(event)}
                  className="mt-3 flex items-center gap-1 text-sm font-medium text-spire-blue transition-colors hover:text-spire-navy"
                >
                  Register
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <EventRegisterModal
        event={registeringEvent}
        onClose={() => setRegisteringEvent(null)}
      />
    </section>
  );
}
