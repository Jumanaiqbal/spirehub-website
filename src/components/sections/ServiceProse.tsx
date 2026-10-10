import type { ReactNode } from "react";

interface Block {
  heading: string;
  body: ReactNode;
}

/** Simple, crawlable prose section for the service pages. */
export default function ServiceProse({ blocks }: { blocks: Block[] }) {
  return (
    <section className="bg-spire-light py-16 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-2 lg:px-8">
        {blocks.map((block) => (
          <div key={block.heading}>
            <h2 className="text-xl font-bold text-spire-navy">{block.heading}</h2>
            <div className="mt-3 space-y-3 text-spire-gray">{block.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
