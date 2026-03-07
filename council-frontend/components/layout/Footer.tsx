export function Footer() {
  return (
    <footer className="border-t border-border-dark bg-background-dark py-12 px-6 lg:px-20 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <span className="material-symbols-outlined text-white">account_tree</span>
          <h2 className="text-sm font-bold tracking-tight text-white uppercase">Council</h2>
        </div>

        {/* Links */}
        <div className="flex gap-8">
          {[
            "STATUS: OPERATIONAL",
            "TERMS OF DEBATE",
            "SECURITY ENCLAVE",
          ].map((link) => (
            <a
              key={link}
              href="#"
              className="text-xs font-mono text-slate-500 hover:text-white transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-slate-600 text-[10px] font-mono">
          © 2024 COUNCIL SYSTEMS INC. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
}
