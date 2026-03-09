"use client";

// ──────────────────────────────────────────────────────────────────────────────
// ROLLBACK: To restore the canvas box, uncomment the HeroCanvas import and the
// "Canvas preview window" block below, then remove the full-page canvas from
// LandingPage.tsx.
// ──────────────────────────────────────────────────────────────────────────────

// import dynamic from "next/dynamic";
// const HeroCanvas = dynamic(
//   () => import("@/components/landing/HeroCanvas").then((m) => m.HeroCanvas),
//   { ssr: false }
// );

interface HeroSectionProps {
  onNavigateToSession?: () => void;
}

export function HeroSection({ onNavigateToSession }: HeroSectionProps = {}) {

  return (
    <section className="py-20 lg:py-32 flex flex-col items-center text-center">
      {/* Status pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-border-dark/50 border border-border-dark mb-8">
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          v0.8.2 Protocol Active
        </span>
      </div>

      {/* Heading */}
      <h1 className="text-5xl lg:text-8xl font-black text-white leading-[1.1] tracking-tighter mb-8 max-w-4xl">
        You are the{" "}
        <span className="text-primary italic">Director.</span>
      </h1>

      {/* Subheading */}
      <p className="text-lg lg:text-xl text-slate-400 max-w-2xl leading-relaxed mb-12">
        Engage with a multi-agent debate and synthesis workflow. Orchestrate
        intelligence like never before with high-fidelity dialectic conflict.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onNavigateToSession}
          className="pointer-events-auto bg-primary hover:bg-primary/90 text-white text-lg font-bold h-14 px-10 rounded-lg transition-all shadow-[0_0_40px_rgba(232,115,74,0.2)] cursor-pointer"
        >
          Begin Your Session
        </button>
        <button className="pointer-events-auto border border-border-dark hover:bg-card-dark text-white text-lg font-bold h-14 px-10 rounded-lg transition-all cursor-pointer">
          View Demo
        </button>
      </div>

      {/* ── REMOVED: Canvas preview window (now full-page bg in LandingPage) ──
      <div className="mt-20 w-full aspect-video rounded-xl border border-border-dark bg-card-dark relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <HeroCanvas />
          <div className="absolute z-10 pointer-events-none flex flex-col items-center justify-center opacity-80 mix-blend-screen overflow-hidden w-full h-full">
            <div className="text-sm font-mono text-primary mb-2 opacity-0 group-hover:opacity-60 uppercase tracking-widest transition-all duration-700 delay-100">
              Simulating Consensus Protocol...
            </div>
            <div className="w-[300px] h-[300px] rounded-full border border-primary/10 animate-[spin_12s_linear_infinite] opacity-0 group-hover:opacity-100 relative transition-all duration-1000">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 bg-primary rounded-full shadow-[0_0_15px_#E8734A]" />
            </div>
            <div className="w-[450px] h-[450px] rounded-full border border-slate-500/10 animate-[spin_20s_linear_infinite_reverse] absolute opacity-0 group-hover:opacity-100 transition-all duration-1000" />
          </div>
        </div>
        <div className="absolute bottom-6 left-6 flex gap-2">
          <div className="size-3 rounded-full bg-red-500/50 border border-red-500" />
          <div className="size-3 rounded-full bg-primary/50 border border-primary" />
          <div className="size-3 rounded-full bg-green-500/50 border border-green-500" />
        </div>
      </div>
      ── END REMOVED */}
    </section>
  );
}
