"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type TransitionMode = "enter" | "exit-glitch";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePageTransition() {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [mode, setMode] = useState<TransitionMode>("enter");

  const navigateToSession = useCallback(() => {
    setMode("enter");
    setTransitioning(true);
    setTimeout(() => router.push("/session"), 1200);
  }, [router]);

  const navigateToHome = useCallback(() => {
    setMode("exit-glitch");
    setTransitioning(true);
    setTimeout(() => router.push("/"), 1200);
  }, [router]);

  return { transitioning, mode, navigateToSession, navigateToHome };
}

// ─── Overlay Component ────────────────────────────────────────────────────────

interface PageTransitionOverlayProps {
  transitioning: boolean;
  mode: TransitionMode;
}

export function PageTransitionOverlay({ transitioning, mode }: PageTransitionOverlayProps) {
  return (
    <AnimatePresence>
      {transitioning && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-background-dark flex items-center justify-center"
        >
          {mode === "enter" ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <span className="size-3 bg-primary rounded-full animate-ping" />
              <span className="font-mono text-xs text-primary uppercase tracking-widest">
                Initializing Session...
              </span>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-4 anim-glitch">
              <span className="material-symbols-outlined text-red-500 animate-pulse text-2xl">
                warning
              </span>
              <span className="font-mono text-xs text-red-500 uppercase tracking-widest flex flex-col items-center gap-1">
                <span>ERR: SESSION_TERMINATED</span>
                <span className="text-[10px] text-red-500/50">
                  Severing connection to host...
                </span>
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
