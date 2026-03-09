const STEPS = [
  {
    icon: "forum",
    title: "Debate",
    description:
      "Agents engage in structural dialectic conflict to surface hidden contradictions.",
    filled: false,
  },
  {
    icon: "mediation",
    title: "Mediate",
    description:
      "Synthesizing opposing viewpoints into a unified logical framework for analysis.",
    filled: false,
  },
  {
    icon: "bolt",
    title: "Direct",
    description:
      "You make the final executive decision, steering the consensus toward your objective.",
    filled: true,
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 border-t border-border-dark">
      {/* Heading */}
      <div className="flex flex-col items-center mb-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
        <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">
          Protocol Lifecycle
        </p>
      </div>

      {/* Steps */}
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-12 px-4">
        {/* Dashed connector */}
        <div className="hidden md:block absolute top-12 left-0 w-full h-[1px] dashed-connector -z-10 opacity-30" />

        {STEPS.map((step) => (
          <div
            key={step.title}
            className="flex flex-col items-center md:items-start text-center md:text-left max-w-xs group"
          >
            <div
              className={
                step.filled
                  ? "pointer-events-auto size-24 rounded-2xl bg-primary border border-white/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(232,115,74,0.4)]"
                  : "pointer-events-auto size-24 rounded-2xl bg-card-dark border border-border-dark flex items-center justify-center mb-6 group-hover:border-primary/50 transition-colors"
              }
            >
              <span
                className={`material-symbols-outlined text-4xl ${
                  step.filled ? "text-white" : "text-primary"
                }`}
              >
                {step.icon}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
