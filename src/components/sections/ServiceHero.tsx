import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { SectionTag } from "../ui/SectionTag";
import { useJoinModal } from "../layout/JoinModalContext";

interface ServiceHeroProps {
  tag: string;
  title: string;
  lead: string;
  highlights: string[];
  image: string;
  imageAlt: string;
}

export default function ServiceHero({
  tag,
  title,
  lead,
  highlights,
  image,
  imageAlt,
}: ServiceHeroProps) {
  const openJoinModal = useJoinModal();

  return (
    <section className="overflow-hidden bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <SectionTag>{tag}</SectionTag>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-lg text-spire-gray">{lead}</p>
          <ul className="mt-6 space-y-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2 text-spire-gray">
                <Check className="mt-1 h-4 w-4 flex-none text-spire-blue" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button onClick={() => openJoinModal()}>Book a tour</Button>
            <Link
              to="/#membership"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-spire-navy transition-colors hover:bg-gray-50"
            >
              See membership plans
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover"
            width={1086}
            height={815}
          />
        </div>
      </div>
    </section>
  );
}
