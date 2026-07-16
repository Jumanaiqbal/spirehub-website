interface FittedImageProps {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Shows the full photo uncropped (object-contain) over a blurred, scaled
 * copy of itself — avoids both cropping the subject and dead letterbox space
 * when photo and container aspect ratios don't match.
 */


export default function FittedImage({ src, alt, className = "", children }: FittedImageProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-lg"
      />
      <img
        src={src}
        alt={alt}
        className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
      />
      {children}
    </div>
  );
}
