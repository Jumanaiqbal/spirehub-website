import { motion } from "framer-motion";
import { Users, TrendingUp, Building2, Sparkles } from "lucide-react";
import { features } from "../../data/content";

const iconMap: Record<string, React.ReactNode> = {
  users: <Users className="h-6 w-6" />,
  trending: <TrendingUp className="h-6 w-6" />,
  building: <Building2 className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
};

export default function Features() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-spire-blue/10 text-spire-blue">
                {iconMap[feature.icon]}
              </div>
              <h3 className="text-base font-semibold text-spire-navy">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-spire-gray">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
