import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import Button from "../ui/Button";
import { SectionTag } from "../ui/SectionTag";
import heroBanner from "../../assets/spire-building.jpg";

interface HeroProps {
  onOpenJoinForm: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

export default function Hero({ onOpenJoinForm }: HeroProps) {
  return (
    <section className="overflow-hidden bg-white">
      <div className="grid items-center lg:grid-cols-2">
        {/* Left — text on clean white background */}
        <div className="mx-auto w-full max-w-xl px-6 py-16 lg:ml-auto lg:max-w-none lg:px-8 lg:py-24 xl:pr-16">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <SectionTag>Incubate. Elevate. Lead.</SectionTag>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-4 text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl"
          >
            Built for founders.{" "}
            <span className="text-spire-navy">Backed by leaders.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 text-lg text-spire-gray"
          >
            Bahrain&apos;s home for ambitious startups.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-8 flex flex-wrap gap-4"
          >
            <Button onClick={onOpenJoinForm}>Enquire Now</Button>
            <Button variant="secondary" showArrow={false} onClick={() => document.getElementById("meeting-rooms")?.scrollIntoView({ behavior: "smooth" })}>
              <Calendar className="h-4 w-4" />
              Book a Meeting Room
            </Button>
          </motion.div>
        </div>

        {/* Right — image in its own column, natural proportions */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative h-[280px] sm:h-[380px] lg:h-[520px] xl:h-[580px]"
        >
          <img
            src={heroBanner}
            alt="Spire Hub building in Seef, Bahrain"
            className="h-full w-full object-contain object-center"
          />
          {/* Fade the image into the white section background so it reads
              as one continuous scene rather than a hard-edged photo block. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-white to-transparent lg:block xl:w-24" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent sm:h-10" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent lg:hidden" />
        </motion.div>
      </div>
    </section>
  );
}
