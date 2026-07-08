import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionTag, ArrowLink } from "../ui/SectionTag";
import { events } from "../../data/content";

export default function Events() {
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
          <div className="mt-4">
            <ArrowLink href="#">View all events</ArrowLink>
          </div>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <motion.article
              key={event.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -8 }}
              className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-spire-navy shadow-sm">
                  {event.date}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-spire-navy">{event.title}</h3>
                <p className="mt-1 text-sm text-spire-gray">{event.time}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-spire-blue transition-colors group-hover:text-spire-navy">
                  View Details
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
