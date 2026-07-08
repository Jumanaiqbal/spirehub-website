import { useState } from "react";
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

export default function App() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Header onOpenJoinForm={() => setIsJoinModalOpen(true)} />
      <main>
        <Hero onOpenJoinForm={() => setIsJoinModalOpen(true)} />
        <Stats />
        <Features />
        <Mentors />
        <Membership />
        <MeetingRooms />
        <Events />
      <Testimonials />
        <CTA onOpenJoinForm={() => setIsJoinModalOpen(true)} />
      </main>
      <Footer />
      <JoinFormModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}
