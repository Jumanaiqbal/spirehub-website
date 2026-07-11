import { motion } from "framer-motion";
import { useState } from "react";
import { Plane, Rocket, BarChart3, Check, Building } from "lucide-react";
import Button from "../ui/Button";
import { SectionTag } from "../ui/SectionTag";
import { membershipPlans } from "../../data/content";

const iconMap: Record<string, React.ReactNode> = {
  plane: <Plane className="h-6 w-6" />,
  rocket: <Rocket className="h-6 w-6" />,
  chart: <BarChart3 className="h-6 w-6" />,
  building: <Building className="h-6 w-6" />,
};

interface MembershipProps {
  onSelectPlan: (planName: string) => void;
}

export default function Membership({ onSelectPlan }: MembershipProps) {
  const [planType, setPlanType] = useState<"standard" | "plus">("standard");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const plans =
    planType === "standard" ? membershipPlans.standard : membershipPlans.plus;

  return (
    <section id="membership" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 max-w-2xl"
        >
          <SectionTag>Membership</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Plans for every stage of your journey.
          </h2>
          <p className="mt-4 text-spire-gray">
            From first idea to scaling globally — choose the membership that
            fits where you are today.
          </p>
        </motion.div>

        {/* Toggles */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Billing Period Toggle */}
          <div className="flex items-center gap-2 self-start rounded-full border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                billingPeriod === "monthly"
                  ? "bg-spire-navy text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                billingPeriod === "yearly"
                  ? "bg-spire-navy text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annually
            </button>
          </div>

          {/* Plan Type Toggle */}
          <div className="flex items-center gap-2 self-start rounded-full border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setPlanType("standard")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                planType === "standard"
                  ? "bg-spire-navy text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
               Without CR 
            </button>
            <button
              onClick={() => setPlanType("plus")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                planType === "plus"
                  ? "bg-spire-navy text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              With CR 
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-6 pt-4 px-2 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible lg:pt-0">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className={`min-w-[80%] sm:min-w-[48%] md:min-w-[40%] lg:min-w-0 flex-shrink-0 snap-start relative flex flex-col rounded-2xl border p-6 lg:h-[420px] transition-shadow hover:shadow-xl ${
                plan.popular
                  ? "border-spire-navy bg-white shadow-lg ring-2 ring-spire-navy"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-spire-navy px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Most Popular
                </span>
              )}

              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-spire-blue/10 text-spire-blue">
                {iconMap[plan.icon]}
              </div>

              <h3 className="text-xl font-bold text-spire-navy">{plan.name}</h3>
              <p className="mt-2 text-sm text-spire-gray">{plan.description}</p>

              <p className="mt-6 text-3xl font-bold text-spire-navy">
                BHD {billingPeriod === "monthly" ? plan.monthly : plan.yearly}
              </p>
              <p className="mt-1 text-sm text-spire-gray">
                {billingPeriod === "monthly" ? "Per month" : "Per year"}
              </p>

              <ul className="mt-4 flex-1 min-h-0 space-y-3 overflow-auto pr-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-spire-blue" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  className="w-full"
                  onClick={() => onSelectPlan(plan.name)}
                >
                  Get Started
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
