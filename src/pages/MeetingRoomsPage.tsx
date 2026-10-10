import ServiceHero from "../components/sections/ServiceHero";
import ServiceProse from "../components/sections/ServiceProse";
import MeetingRooms from "../components/sections/MeetingRooms";
import CTA from "../components/sections/CTA";
import Seo from "../components/ui/Seo";
import { localBusinessJsonLd } from "../data/business";
import { useJoinModal } from "../components/layout/JoinModalContext";

export default function MeetingRoomsPage() {
  const openJoinModal = useJoinModal();

  return (
    <>
      <Seo
        title="Meeting Rooms & Workshop Space in Seef, Bahrain | Spire Hub"
        description="Book a meeting room or workshop space in Seef, Bahrain by the hour at Spire Hub. Screens, whiteboards, fast WiFi and flexible layouts for interviews, workshops and board meetings."
        path="/meeting-rooms"
        jsonLd={localBusinessJsonLd({
          description:
            "Hourly meeting rooms and a reconfigurable workshop room in Seef, Bahrain, bookable online with card payment.",
        })}
      />
      <ServiceHero
        tag="Meeting Rooms"
        title="Meeting rooms in Seef, book by the hour"
        lead="Need a room for an interview, a client pitch, or a full-day workshop? Book online, pay by card, and walk into a room that's ready."
        highlights={[
          "Rooms for 2 to 20+ people",
          "Screens, whiteboards and flip charts included",
          "Reconfigurable workshop room — classroom, U-shape or boardroom",
          "Members get discounted and included hours",
        ]}
        image="/rooms/meeting-room-1.jpeg"
        imageAlt="Meeting room at Spire Hub in Seef, Bahrain"
      />
      <ServiceProse
        blocks={[
          {
            heading: "How booking works",
            body: (
              <p>
                Pick a room and a time on the booking form below, confirm, and
                pay by card. You'll get an invoice by email and WhatsApp. The
                room is yours for the slot you booked — no deposit, no membership
                needed.
              </p>
            ),
          },
          {
            heading: "The workshop room",
            body: (
              <p>
                Our largest space reconfigures for training days, hackathons and
                board sessions, with a podium and flip chart. Spire Hub members
                get 50% off the workshop room.
              </p>
            ),
          },
        ]}
      />
      <MeetingRooms onOpenJoinForm={() => openJoinModal()} />
      <CTA onOpenJoinForm={() => openJoinModal()} />
    </>
  );
}
