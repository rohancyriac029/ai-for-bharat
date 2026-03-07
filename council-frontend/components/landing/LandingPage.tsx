"use client";

import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { AgentRosterSection } from "@/components/landing/AgentRosterSection";
import {
  usePageTransition,
  PageTransitionOverlay,
} from "@/components/ui/PageTransitionOverlay";

// Lazy-load canvas (avoid SSR issues with requestAnimationFrame)
const HeroCanvas = dynamic(
  () => import("@/components/landing/HeroCanvas").then((m) => m.HeroCanvas),
  { ssr: false }
);

export function LandingPage() {
  const { transitioning, mode, navigateToSession } = usePageTransition();

  return (
    <>
      {/* Single global transition overlay */}
      <PageTransitionOverlay transitioning={transitioning} mode={mode} />

      <div className="relative flex min-h-screen flex-col overflow-x-hidden">
        {/* ── Full-page particle canvas background ─────────────────────── */}
        <div className="fixed inset-0 z-0 pointer-events-auto">
          <HeroCanvas />
        </div>

        <Header onNavigateToSession={navigateToSession} />

        <main className="relative z-10 flex-1 max-w-7xl mx-auto px-6 lg:px-20 w-full">
          <HeroSection onNavigateToSession={navigateToSession} />
          <HowItWorksSection />
          <AgentRosterSection />
        </main>

        <Footer />
      </div>
    </>
  );
}
