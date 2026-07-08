import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { testimonials } from "../../data/content";

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const prev = () =>
    setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () =>
    setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  return (
    <section className="bg-spire-light py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl"
        >
          Loved by a community of builders.
        </motion.h2>

        <div className="relative mt-14">
          <button
            onClick={prev}
            className="absolute -left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-spire-navy shadow-sm transition-colors hover:bg-spire-navy hover:text-white md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mx-auto max-w-3xl overflow-hidden px-4 md:px-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl bg-white p-8 shadow-sm md:p-12"
              >
                <Quote className="h-8 w-8 text-spire-blue/40" />
                <p className="mt-4 text-lg leading-relaxed text-gray-700 md:text-xl">
                  &ldquo;{testimonials[current].quote}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="font-semibold text-spire-navy">
                    {testimonials[current].name}
                  </p>
                  <p className="text-sm text-spire-gray">
                    {testimonials[current].role}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={next}
            className="absolute -right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-spire-navy shadow-sm transition-colors hover:bg-spire-navy hover:text-white md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-8 bg-spire-navy" : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
