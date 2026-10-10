import ServiceHero from "../components/sections/ServiceHero";
import ServiceProse from "../components/sections/ServiceProse";
import Membership from "../components/sections/Membership";
import CTA from "../components/sections/CTA";
import Seo from "../components/ui/Seo";
import { localBusinessJsonLd } from "../data/business";
import { useJoinModal } from "../components/layout/JoinModalContext";
import officeExterior from "../assets/spire-hub-office-exterior-seef-bahrain.jpg";

export default function Coworking() {
  const openJoinModal = useJoinModal();

  return (
    <>
      <Seo
        title="Coworking Space in Seef, Bahrain | Spire Hub"
        description="Hot desks, fixed desks and day passes at Spire Hub — a coworking space in Seef, Bahrain built for founders. Fast internet, meeting rooms, free tea and coffee, and a startup community."
        path="/coworking"
        jsonLd={localBusinessJsonLd({
          description:
            "Coworking space in Seef, Bahrain with hot desks, fixed desks, day passes and meeting rooms for startups and freelancers.",
        })}
      />
      <ServiceHero
        tag="Coworking"
        title="Coworking space in Seef, Bahrain"
        lead="A calm, well-designed place to do your best work — surrounded by founders building the next thing. Come for a day, a month, or make it your team's home."
        highlights={[
          "Shared workspace and fixed-desk options for one person or a whole team",
          "High-speed internet, free tea, water and specialty coffee",
          "Meeting-room access included, with 50% off the workshop room",
          "No hidden charges — one clear monthly price",
        ]}
        image={officeExterior}
        imageAlt="Spire Hub coworking space exterior in Seef, Bahrain"
      />
      <ServiceProse
        blocks={[
          {
            heading: "Who it's for",
            body: (
              <>
                <p>
                  Freelancers, remote workers, and early-stage startup teams who
                  want more than a coffee shop — a professional address, reliable
                  internet, and people to bounce ideas off.
                </p>
                <p>
                  Members range from solo founders on the Flex plan to funded
                  teams in private offices upstairs.
                </p>
              </>
            ),
          },
          {
            heading: "What's included",
            body: (
              <p>
                Desk access during opening hours (Sunday to Thursday, 9am–6pm),
                meeting-room credits, unlimited internet, tea and water, and
                invitations to Spire Hub events and mentor sessions. Need a CR
                address for EWA and municipality registration? The Plus plans
                include it.
              </p>
            ),
          },
          {
            heading: "Day passes",
            body: (
              <p>
                Just visiting Bahrain or testing the space before you commit? Ask
                about a day pass — a full day at a hot desk with everything a
                member gets, no membership required.
              </p>
            ),
          },
          {
            heading: "Where we are",
            body: (
              <p>
                Building 2740, Road 3649, Seef — a few minutes from Seef Mall and
                the Bahrain Financial Harbour, with parking on site.
              </p>
            ),
          },
        ]}
      />
      <Membership onSelectPlan={(planName) => openJoinModal(planName)} />
      <CTA onOpenJoinForm={() => openJoinModal()} />
    </>
  );
}
