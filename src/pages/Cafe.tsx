import ServiceHero from "../components/sections/ServiceHero";
import ServiceProse from "../components/sections/ServiceProse";
import CTA from "../components/sections/CTA";
import Seo from "../components/ui/Seo";
import { localBusinessJsonLd } from "../data/business";
import { useJoinModal } from "../components/layout/JoinModalContext";
import officeExterior from "../assets/spire-hub-office-exterior-seef-bahrain.jpg";

export default function Cafe() {
  const openJoinModal = useJoinModal();

  return (
    <>
      <Seo
        title="Specialty Coffee & Café in Seef, Bahrain | Spire Hub"
        description="The café at Spire Hub in Seef, Bahrain serves specialty coffee in a workspace built for founders. Drop in to work, meet, or just for the coffee."
        path="/cafe"
        jsonLd={localBusinessJsonLd({
          "@type": ["LocalBusiness", "CoworkingSpace", "CafeOrCoffeeShop"],
          description:
            "Specialty coffee café inside Spire Hub, a coworking space in Seef, Bahrain — open to members and walk-in guests.",
        })}
      />
      <ServiceHero
        tag="Café"
        title="Specialty coffee, in a room full of founders"
        lead="You can smell the coffee from the door. The Spire Hub café is open to members and guests — a good place to work, take a meeting, or just get a proper flat white."
        highlights={[
          "Specialty coffee and tea",
          "Comfortable seating and fast WiFi",
          "Walk-ins welcome during opening hours",
          "The same space our members build companies in",
        ]}
        image={officeExterior}
        imageAlt="The café and workspace at Spire Hub in Seef, Bahrain"
      />
      <ServiceProse
        blocks={[
          {
            heading: "Just here for coffee",
            body: (
              <p>
                You don't need a membership to visit. Come in, order at the
                counter, and find a seat. If you end up staying all day, ask
                about a day pass.
              </p>
            ),
          },
          {
            heading: "Opening hours",
            body: (
              <p>
                Sunday to Thursday, 9am–6pm, at Building 2740, Road 3649, Seef —
                near Seef Mall with parking on site.
              </p>
            ),
          },
        ]}
      />
      <CTA onOpenJoinForm={() => openJoinModal()} />
    </>
  );
}
