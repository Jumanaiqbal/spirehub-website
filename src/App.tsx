import { useEffect, useState } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Hero from "./components/sections/Hero";
import Stats from "./components/sections/Stats";
import Features from "./components/sections/Features";
import Mentors from "./components/sections/Mentors";
import Membership from "./components/sections/Membership";
import MeetingRooms from "./components/sections/MeetingRooms";
import Events from "./components/sections/Events";
import Testimonials from "./components/sections/Testimonials";
import CTA from "./components/sections/CTA";
import JoinFormModal from "./components/sections/JoinForm";
import WhatsAppButton from "./components/ui/WhatsAppButton";

export default function App() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Deep links like /#events land before React has rendered the sections,
  // so the browser's native anchor jump finds nothing. Once mounted, scroll
  // to the hash target ourselves — retrying briefly since some sections
  // (e.g. events) appear only after data loads.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (attempts++ < 20) {
        window.setTimeout(tryScroll, 150);
      }
    };
    window.setTimeout(tryScroll, 100);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header onOpenJoinForm={() => setIsJoinModalOpen(true)} />
      <main>
        <Hero onOpenJoinForm={() => setIsJoinModalOpen(true)} />
        <Stats />
        <Features />
        <Mentors />
        <Membership
          onSelectPlan={(planName) => {
            setSelectedPlan(planName);
            setIsJoinModalOpen(true);
          }}
        />
        <MeetingRooms onOpenJoinForm={() => setIsJoinModalOpen(true)} />
        <Events />
      <Testimonials />
        <CTA onOpenJoinForm={() => setIsJoinModalOpen(true)} />
      </main>
      <Footer />
      <WhatsAppButton />
      <JoinFormModal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false);
          setSelectedPlan(null);
        }}
        initialPlan={selectedPlan}
      />
    </div>
  );
}
