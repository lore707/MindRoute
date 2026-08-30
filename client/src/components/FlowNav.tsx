import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { ArrowLeft } from "lucide-react";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";

// Barra minima del FLUSSO immersivo (quiz + destinazioni). Niente nav marketing
// né shell dashboard: solo logo (→ indietro/dashboard), switch lingua e un'uscita
// sempre evidente ("Salva ed esci" desktop, freccia indietro mobile). Unica fonte
// così quiz e /destinations restano identici e non divergono.
/**
 * Il marchio nella nav del flusso. E' un alias di BrandMark: prima era una
 * copia del tracciato, e cambiare logo significava ricordarsi anche di questa.
 */
export const FlowNavLogo = ({ size = 30 }: { size?: number }) => (
  <BrandMark size={size} idPrefix="flownav" />
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
        <span className="font-serif text-[15px] md:text-[18px]">Mindroute</span>
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
