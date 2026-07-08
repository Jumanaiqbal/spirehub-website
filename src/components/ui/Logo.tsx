import logoImg from "../../assets/logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
};

export default function Logo({ className = "", size = "md" }: LogoProps) {
  return (
    <a href="#" className={`inline-flex items-center ${className}`}>
      <img
        src={logoImg}
        alt="Spire"
        className={`${sizes[size]} w-auto object-contain`}
      />
    </a>
  );
}
