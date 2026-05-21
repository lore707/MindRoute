import { Link } from "wouter";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-5 py-20" style={{ background: "#0a0710" }}>
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-6" style={{ background: "rgba(233,69,96,0.12)", border: "1px solid rgba(233,69,96,0.3)" }}>
          <Compass className="w-6 h-6 sm:w-7 sm:h-7 text-[#E94560]" />
        </div>
        <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#E94560] mb-3">404</p>
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-white leading-tight tracking-tight mb-3">Sei fuori rotta.</h1>
        <p className="text-white/55 text-[14px] sm:text-[15px] leading-relaxed mb-8 max-w-sm mx-auto">
          La pagina che cercavi non esiste — o forse non esiste ancora. Torna alla mappa e ricominciamo.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-[#E94560] text-white font-semibold text-[14px] no-underline transition-all"
          style={{ boxShadow: "0 12px 32px -8px rgba(233,69,96,0.5)" }}
        >
          Torna alla home →
        </Link>
      </div>
    </div>
  );
}
