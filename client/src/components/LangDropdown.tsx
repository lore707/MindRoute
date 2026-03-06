import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";

function FlagGB({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="gb"><path d="M0 0v30h60V0z"/></clipPath>
      <g clipPath="url(#gb)">
        <path d="M0 0v30h60V0z" fill="#012169"/>
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
        <path d="M0 0l60 30m0-30L0 30" clipPath="url(#gb)" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );
}

function FlagIT({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="40" fill="#009246"/>
      <rect x="20" width="20" height="40" fill="#fff"/>
      <rect x="40" width="20" height="40" fill="#CE2B37"/>
    </svg>
  );
}

const langs = [
  { code: "en" as const, label: "English" },
  { code: "it" as const, label: "Italiano" },
];

function FlagIcon({ code, className }: { code: string; className?: string }) {
  return code === "it" ? <FlagIT className={className} /> : <FlagGB className={className} />;
}

export default function LangDropdown({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = langs.find(l => l.code === lang) || langs[0];

  const isExplicitDark = variant === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        data-testid="button-lang"
        className={`flex items-center gap-1.5 px-3 py-[6px] border rounded-full text-[12px] font-medium hover:border-[#E94560] hover:text-[#E94560] transition-all bg-transparent cursor-pointer ${
          isExplicitDark
            ? "border-white/20 text-white/70"
            : "border-[var(--border-input)] text-[var(--text-secondary)]"
        }`}
      >
        <FlagIcon code={current.code} className="w-[18px] h-[13px] rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1.5 min-w-[150px] border rounded-xl overflow-hidden z-[200] animate-in fade-in slide-in-from-top-1 duration-150 ${
          isExplicitDark
            ? "bg-[#2A2A3E] border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            : "bg-[var(--surface-card)] border-[var(--border-input)] shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
        }`}>
          {langs.map(l => (
            <button
              key={l.code}
              data-testid={`lang-option-${l.code}`}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer border-none bg-transparent text-left ${
                l.code === lang
                  ? "text-[#E94560]"
                  : isExplicitDark
                    ? "text-white/70 hover:bg-white/10"
                    : "text-[var(--text-primary)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              <FlagIcon code={l.code} className="w-[20px] h-[14px] rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]" />
              <span>{l.label}</span>
              {l.code === lang && (
                <svg className="w-3.5 h-3.5 ml-auto text-[#E94560]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
