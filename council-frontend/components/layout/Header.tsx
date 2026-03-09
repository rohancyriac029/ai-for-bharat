"use client";

interface HeaderProps {
  onNavigateToSession?: () => void;
}

export function Header({ onNavigateToSession }: HeaderProps = {}) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/80 backdrop-blur-md px-6 lg:px-20 py-4 flex items-center justify-between pointer-events-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 bg-primary rounded">
            <span className="material-symbols-outlined text-white text-xl">account_tree</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">Council</h2>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 tracking-widest">
              [BETA]
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {["Product", "Workflow", "Pricing", "Documentation"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="hidden sm:block text-sm font-medium text-slate-400 hover:text-white px-4 cursor-pointer">
            Log in
          </button>
          <button
            onClick={onNavigateToSession}
            className="bg-primary hover:bg-primary/90 text-white text-sm font-bold h-10 px-6 rounded transition-all shadow-[0_0_20px_rgba(232,115,74,0.3)] cursor-pointer"
          >
            Start Session
          </button>
        </div>
      </header>
    </>
  );
}
