import ServiceHero from "../components/sections/ServiceHero";
import ServiceProse from "../components/sections/ServiceProse";
import Membership from "../components/sections/Membership";
import CTA from "../components/sections/CTA";
import Seo from "../components/ui/Seo";
import { localBusinessJsonLd } from "../data/business";
import { useJoinModal } from "../components/layout/JoinModalContext";
import officeExterior from "../assets/spire-hub-office-exterior-seef-bahrain.jpg";

export default function PrivateOffices() {
  const openJoinModal = useJoinModal();

  return (
    <>
      <Seo
        title="Private Offices in Seef, Bahrain | Spire Hub"
        description="Lockable private offices for teams of 1 to 3+ at Spire Hub in Seef, Bahrain. Optional CR address for EWA and municipality registration, meeting rooms, and a founder community — one monthly price."
        path="/private-offices"
        jsonLd={localBusinessJsonLd({
          description:
            "Private serviced offices in Seef, Bahrain for startup teams, with optional commercial registration address, meeting rooms and coworking access.",
        })}
      />
      <ServiceHero
        tag="Private Offices"
        title="Private offices for founding teams"
        lead="Your own lockable room inside a building full of founders. Move in with a desk, a chair and a door that closes — everything else is handled."
        highlights={[
          "Offices sized for 1, 3, or more team members",
          "Optional CR address included (EWA & municipality)",
          "Unlimited meeting-room access on Plus plans",
          "Fully serviced — internet, cleaning, tea and coffee, utilities",
        ]}
        image={officeExterior}
        imageAlt="Spire Hub private offices building in Seef, Bahrain"
      />
      <ServiceProse
        blocks={[
          {
            heading: "Room sizes",
            body: (
              <p>
                Solo offices for one person, Team offices for up to three, and
                larger fit-outs on request. Start small and move up a size as you
                hire — without changing address.
              </p>
            ),
          },
          {
            heading: "CR address",
            body: (
              <p>
                The Plus plans include a commercial registration address you can
                use for your EWA and municipality paperwork, so you can register
                the company where you actually work.
              </p>
            ),
          },
          {
            heading: "What's serviced",
            body: (
              <p>
                Rent covers high-speed internet, electricity and water, cleaning,
                tea and specialty coffee, and access to shared meeting rooms.
                There are no separate utility or service invoices.
              </p>
            ),
          },
          {
            heading: "The community",
            body: (
              <p>
                Private-office members get the same invitations to mentor
                sessions, workshops and Spire Hub events as everyone else — the
                door closes when you need it to, and opens onto a room full of
                people building companies.
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
