import { motion } from "framer-motion";
import Button from "../ui/Button";

interface CTAProps {
  onOpenJoinForm: () => void;
}

export default function CTA({ onOpenJoinForm }: CTAProps) {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-between gap-8 rounded-2xl bg-spire-navy px-8 py-14 md:flex-row md:px-16"
        >
          <div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Ready to build what&apos;s next?
            </h2>
            <p className="mt-3 text-blue-100">
              Join Spire Hub and take your ideas further, faster.
            </p>
          </div>
          <Button
            variant="white"
            className="shrink-0"
            onClick={onOpenJoinForm}
          >
            Join Spire Hub
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
