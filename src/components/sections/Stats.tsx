import { motion } from "framer-motion";
import AnimatedCounter from "../ui/AnimatedCounter";
import { stats } from "../../data/content";

export default function Stats() {
  return (
    <section className="border-y border-gray-100 bg-spire-light">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-8 md:grid-cols-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <AnimatedCounter
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
              <p className="mt-2 text-sm text-spire-gray">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
