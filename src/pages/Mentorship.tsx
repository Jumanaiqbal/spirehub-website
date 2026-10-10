import ServiceHero from "../components/sections/ServiceHero";
import ServiceProse from "../components/sections/ServiceProse";
import Mentors from "../components/sections/Mentors";
import Events from "../components/sections/Events";
import CTA from "../components/sections/CTA";
import Seo from "../components/ui/Seo";
import { localBusinessJsonLd } from "../data/business";
import { useJoinModal } from "../components/layout/JoinModalContext";

export default function Mentorship() {
  const openJoinModal = useJoinModal();

  return (
    <>
      <Seo
        title="Startup Mentorship & Incubation in Bahrain | Spire Hub"
        description="Spire Hub connects founders in Bahrain with mentors who have built, scaled and invested — plus workshops and events. Guidance on fundraising, growth, product and operations."
        path="/mentorship"
        jsonLd={localBusinessJsonLd({
          description:
            "Startup mentorship, incubation support and founder events in Bahrain, connecting early-stage teams with experienced operators and investors.",
        })}
      />
      <ServiceHero
        tag="Mentorship & Incubation"
        title="Mentors who built, scaled and invested"
        lead="Every founder hits questions they can't answer alone. Spire Hub puts you in the room with people who have already been there — and keeps you there through the hard parts."
        highlights={[
          "1:1 sessions with operators, founders and investors",
          "Workshops on fundraising, growth, product and hiring",
          "Introductions across the Spire Hub network",
          "Open to members and select non-members",
        ]}
        image="/rooms/workshop-classroom.jpeg"
        imageAlt="Mentor-led workshop at Spire Hub in Bahrain"
      />
      <ServiceProse
        blocks={[
          {
            heading: "How it works",
            body: (
              <p>
                Tell us what you're working on and where you're stuck. We match
                you with a mentor from the network for a focused session, then
                follow up — mentorship at Spire Hub is a relationship, not a
                one-off.
              </p>
            ),
          },
          {
            heading: "Become a mentor",
            body: (
              <p>
                If you've built or scaled a company and want to give time back to
                Bahrain's founders, we'd like to hear from you. Use the "Become a
                mentor" button in the mentors section below.
              </p>
            ),
          },
        ]}
      />
      <Mentors />
      <Events />
      <CTA onOpenJoinForm={() => openJoinModal()} />
    </>
  );
}
