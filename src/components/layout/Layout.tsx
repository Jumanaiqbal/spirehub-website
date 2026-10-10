import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "../ui/WhatsAppButton";
import JoinFormModal from "../sections/JoinForm";
import {
  JoinModalContext,
  useJoinModal,
  type OpenJoinModal,
} from "./JoinModalContext";

export function JoinModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const open: OpenJoinModal = (nextPlan = null) => {
    setPlan(nextPlan);
    setIsOpen(true);
  };

  return (
    <JoinModalContext.Provider value={open}>
      {children}
      <JoinFormModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setPlan(null);
        }}
        initialPlan={plan}
      />
    </JoinModalContext.Provider>
  );
}

/**
 * Deep links like /#events (and cross-page links to the homepage sections)
 * land before React has painted the target section, so the browser's native
 * anchor jump finds nothing. Once mounted, scroll to the hash target
 * ourselves — retrying briefly since some sections (e.g. events) appear only
 * after data loads.
 */
function useHashScroll() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    const id = hash.slice(1);
    if (!id) return;

    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (attempts++ < 20) {
        window.setTimeout(tryScroll, 150);
      }
    };
    window.setTimeout(tryScroll, 100);
  }, [hash, pathname]);
}

export default function Layout() {
  const open = useJoinModal();
  useHashScroll();

  return (
    <div className="min-h-screen bg-white">
      <Header onOpenJoinForm={() => open()} />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export function RootLayout() {
  return (
    <JoinModalProvider>
      <Layout />
    </JoinModalProvider>
  );
}
