import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface SectionTagProps {
  children: React.ReactNode;
}

export function SectionTag({ children }: SectionTagProps) {
  return (
    <span className="text-xs font-semibold uppercase tracking-widest text-spire-blue">
      {children}
    </span>
  );
}

interface ArrowLinkProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
  onClick?: () => void;
}

export function ArrowLink({ children, href = "#" }: ArrowLinkProps) {
  const isExternal = href.startsWith("http");
  return (
    <motion.a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      whileHover={{ x: 4 }}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-spire-blue transition-colors hover:text-spire-navy"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </motion.a>
  );
}
