import Hero from "../components/sections/Hero";
import Stats from "../components/sections/Stats";
import Features from "../components/sections/Features";
import Mentors from "../components/sections/Mentors";
import Membership from "../components/sections/Membership";
import MeetingRooms from "../components/sections/MeetingRooms";
import Events from "../components/sections/Events";
import Testimonials from "../components/sections/Testimonials";
import CTA from "../components/sections/CTA";
import Seo from "../components/ui/Seo";
import { localBusinessJsonLd } from "../data/business";
import { useJoinModal } from "../components/layout/JoinModalContext";

export default function Home() {
  const openJoinModal = useJoinModal();

  return (
    <>
      <Seo
        title="Spire Hub | Built for Founders. Backed by Leaders."
        description="Bahrain's home for ambitious startups. Coworking space, private offices, meeting rooms, mentorship, and events in Seef, Bahrain."
        path="/"
        jsonLd={localBusinessJsonLd()}
      />
      <Hero onOpenJoinForm={() => openJoinModal()} />
      <Stats />
      <Features />
      <Mentors />
      <Membership onSelectPlan={(planName) => openJoinModal(planName)} />
      <MeetingRooms onOpenJoinForm={() => openJoinModal()} />
      <Events />
      <Testimonials />
      <CTA onOpenJoinForm={() => openJoinModal()} />
    </>
  );
}
