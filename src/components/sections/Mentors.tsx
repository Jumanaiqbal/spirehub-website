import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionTag, ArrowLink } from "../ui/SectionTag";
import MentorApplyModal from "./MentorApplyModal";
import { mentors } from "../../data/mentors";

export default function Mentors() {
  const [current, setCurrent] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const visibleCount = 3;
  const maxIndex = mentors.length - visibleCount;

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(maxIndex, c + 1));

  const visibleMentors = mentors.slice(current, current + visibleCount);

  return (
    <section id="mentors" className="bg-spire-light py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <SectionTag>Expert Guidance</SectionTag>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Mentors who built, scaled, and invested.
            </h2>
            <p className="mt-4 text-spire-gray">
              Learn from industry veterans who have walked the path and are ready
              to guide your startup journey.
            </p>
            <div className="mt-6">
              <ArrowLink href="#membership">Explore membership</ArrowLink>
            </div>
            <button
              type="button"
              onClick={() => setApplyOpen(true)}
              className="mt-6 rounded-xl border-2 border-spire-navy px-5 py-2.5 text-sm font-semibold text-spire-navy transition-colors hover:bg-spire-navy hover:text-white"
            >
              Become a mentor
            </button>
          </motion.div>

          <div className="lg:col-span-3">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visibleMentors.map((mentor) => (
                  <motion.div
                    key={mentor.name}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className="overflow-hidden">
                      <img
                        src={mentor.image}
                        alt={mentor.name}
                        className={`h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          mentor.image.endsWith(".svg") ? "object-top" : "object-center"
                        }`}
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-spire-navy">{mentor.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-spire-gray">
                        {mentor.role}
                      </p>
                      {mentor.profileUrl ? (
                        <ArrowLink href={mentor.profileUrl}>View profile</ArrowLink>
                      ) : (
                        <p className="mt-3 text-xs text-spire-gray">Spire Hub mentor</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={prev}
                disabled={current === 0}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-spire-navy transition-colors hover:bg-spire-navy hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                disabled={current >= maxIndex}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-spire-navy transition-colors hover:bg-spire-navy hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <MentorApplyModal isOpen={applyOpen} onClose={() => setApplyOpen(false)} />
    </section>
  );
}



