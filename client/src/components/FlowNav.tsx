import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";

// Barra minima del FLUSSO immersivo (quiz + destinazioni). Niente nav marketing
// né shell dashboard: solo logo (→ indietro/dashboard), switch lingua e un'uscita
// sempre evidente ("Salva ed esci" desktop, freccia indietro mobile). Unica fonte
// così quiz e /destinations restano identici e non divergono.
export const FlowNavLogo = ({ size = 30 }: { size?: number }) => (
  <svg viewBox="0 0 120 120" fill="none" style={{ width: size, height: size }}>
    <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="#E94560" opacity="0.85" />
    <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="#E94560" opacity="0.55" />
    <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="#E94560" opacity="0.85" />
    <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="#E94560" opacity="0.55" />
    <ellipse cx="60" cy="60" rx="5" ry="6" fill="var(--text-primary)" />
    <path d="M58 66L60 108L62 66" fill="#E94560" opacity="0.7" />
    <circle cx="60" cy="48" r="3.5" fill="var(--text-primary)" />
  </svg>
);

// hideLang: nascondi il toggle lingua quando la vista mostra contenuto generato
// monolingua (es. /destinations dopo il match) — cambiarlo darebbe un mix EN/IT.
// Nel quiz resta visibile (i testi sono tutti tradotti dinamicamente).
export function FlowNav({ hideLang = false }: { hideLang?: boolean }) {
  const { t } = useI18n();
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-3 py-2.5 md:px-8 md:py-4 flex items-center justify-between gap-2 backdrop-blur-xl transition-colors duration-300" style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }}>
      <Link href="/" className="flex items-center gap-2 md:gap-2.5 no-underline text-[var(--text-primary)] min-h-[44px]" data-testid="link-home">
        <FlowNavLogo size={26} />
        <span className="font-serif text-[15px] md:text-[18px]">MindRoute</span>
      </Link>
      <div className="flex items-center gap-2 md:gap-3">
        {!hideLang && <LangDropdown />}
        <Link href="/" className="hidden sm:inline-flex px-4 py-[7px] border border-[var(--border-input)] text-[var(--text-secondary)] rounded-full text-[13px] no-underline hover:border-[#E94560] hover:text-[#E94560] transition-all bg-transparent cursor-pointer" data-testid="link-exit">
          {t('nav.saveExit')}
        </Link>
        <Link href="/" className="sm:hidden flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border-input)] text-[var(--text-secondary)] no-underline hover:border-[#E94560] hover:text-[#E94560] transition-all" data-testid="link-exit-mobile" aria-label="Esci">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </nav>
  );
}
