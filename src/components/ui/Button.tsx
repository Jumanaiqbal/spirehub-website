import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

type ButtonVariant = "primary" | "secondary" | "outline" | "white";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  showArrow?: boolean;
  onClick?: () => void;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-spire-navy text-white hover:bg-spire-navy-dark shadow-sm",
  secondary:
    "bg-white text-spire-navy border border-gray-200 hover:border-gray-300 hover:bg-gray-50",
  outline:
    "bg-transparent text-spire-navy border-2 border-spire-navy hover:bg-spire-navy hover:text-white",
  white:
    "bg-white text-spire-navy hover:bg-gray-100 shadow-sm",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  showArrow = true,
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
    >
      {children}
      {showArrow && <ArrowRight className="h-4 w-4" />}
    </motion.button>
  );
}
