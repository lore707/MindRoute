import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Privacy() {
  const { lang } = useI18n();
  const it = lang === "it";
  return (
    <div className="min-h-screen" style={{ background: "#0f0a10" }}>
      <div className="max-w-3xl mx-auto px-5 sm:px-6 pt-20 md:pt-24 pb-12 md:pb-16">
     <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 md:mb-12 transition-colors min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> {it ? "Torna alla home" : "Back to home"}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-2 leading-tight">Privacy Policy</h1>
        <p className="text-white/40 text-[13px] sm:text-sm mb-8 md:mb-12">{it ? "Ultimo aggiornamento: marzo 2026" : "Last updated: March 2026"}</p>

        <div className="space-y-8 md:space-y-10 text-white/70 leading-relaxed text-[14px] sm:text-[15px]">

         <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "1. Titolare del trattamento" : "1. Data Controller"}</h2>
            <p>{it ? "Il titolare del trattamento dei dati è Lorenzo De Filippis, raggiungibile all'indirizzo email" : "The data controller is Lorenzo De Filippis, reachable at"} <a href="mailto:mindroutetravel@gmail.com" className="text-[#E94560] hover:underline">mindroutetravel@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "2. Dati raccolti" : "2. Data Collected"}</h2>
            <p className="mb-3">{it ? "MindRoute raccoglie i seguenti dati durante l'utilizzo del servizio:" : "MindRoute collects the following data during use of the service:"}</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-white">{it ? "Risposte al quiz di profilazione" : "Profiling quiz answers"}</strong> — {it ? "le risposte che fornisci durante il percorso di profilazione psicologica e i dati logistici del viaggio (budget, date, destinazione di partenza, ecc.). Questi dati sono conservati esclusivamente in memoria volatile del server e vengono eliminati automaticamente al riavvio del server o al termine della sessione." : "the answers you provide during the psychological profiling flow and travel logistics data (budget, dates, departure city, etc.). This data is stored exclusively in server volatile memory and is automatically deleted on server restart or session end."}</li>
              <li><strong className="text-white">{it ? "Indirizzo IP" : "IP Address"}</strong> — {it ? "utilizzato esclusivamente per la limitazione delle richieste (rate limiting) al fine di prevenire abusi del servizio. Non viene conservato in modo persistente." : "used exclusively for rate limiting to prevent service abuse. Not stored persistently."}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "3. Finalità del trattamento" : "3. Purpose of Processing"}</h2>
            <p>{it ? "I dati raccolti sono utilizzati esclusivamente per:" : "Collected data is used exclusively to:"}</p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li>{it ? "Generare destinazioni di viaggio personalizzate in base al tuo profilo psicologico" : "Generate personalized travel destinations based on your psychological profile"}</li>
              <li>{it ? "Creare itinerari di viaggio su misura" : "Create tailored travel itineraries"}</li>
              <li>{it ? "Prevenire abusi del servizio tramite rate limiting" : "Prevent service abuse via rate limiting"}</li>
              <li>{it ? "Solo se acconsenti esplicitamente (checkbox dedicata), inviarti email relative ai tuoi viaggi: promemoria di prenotazione, consigli pre-partenza e un breve check-in post-viaggio. Puoi revocare il consenso in qualsiasi momento dal link presente in ogni email o scrivendoci." : "Only if you explicitly consent (dedicated checkbox), send you emails about your trips: booking reminders, pre-departure tips and a short post-trip check-in. You can withdraw consent at any time via the link in every email or by contacting us."}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "4. Base giuridica" : "4. Legal Basis"}</h2>
            <p>{it ? "Il trattamento dei dati si basa sul tuo consenso (art. 6, par. 1, lett. a) del GDPR) e sull'esecuzione del servizio richiesto (art. 6, par. 1, lett. b) del GDPR)." : "Data processing is based on your consent (Art. 6(1)(a) GDPR) and the performance of the requested service (Art. 6(1)(b) GDPR)."}</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "5. Cookie" : "5. Cookies"}</h2>
            <p className="mb-3">{it ? "Il sito utilizza:" : "The site uses:"}</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-white">{it ? "Cookie tecnici essenziali" : "Essential technical cookies"}</strong> — {it ? "necessari per il funzionamento del servizio (preferenza lingua, stato della sessione)." : "necessary for the service to function (language preference, session state)."}</li>
              <li><strong className="text-white">{it ? "Cookie statistici (Google Analytics 4)" : "Analytics cookies (Google Analytics 4)"}</strong> — {it ? "attivi SOLO se accetti dal banner dei cookie. Se rifiuti, la misurazione avviene senza cookie e senza identificarti (Google Consent Mode). Puoi cambiare idea cancellando i dati di navigazione del sito." : "active ONLY if you accept via the cookie banner. If you decline, measurement is cookieless and does not identify you (Google Consent Mode). You can change your mind by clearing the site's browsing data."}</li>
              <li><strong className="text-white">{it ? "Cookie di terze parti" : "Third-party cookies"}</strong> — {it ? "i link affiliate presenti negli itinerari (Hotels.com, Expedia, Viator, Klook, Civitatis, Musement, TripAdvisor, FlixBus e altri) possono impostare cookie sui loro siti quando vi accedi tramite i nostri link. MindRoute non ha controllo su questi cookie. Ti invitiamo a consultare le privacy policy dei singoli servizi." : "affiliate links in itineraries (Hotels.com, Expedia, Viator, Klook, Civitatis, Musement, TripAdvisor, FlixBus and others) may set cookies on their sites when accessed through our links. MindRoute has no control over these cookies. Please consult the privacy policies of each service."}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "6. Conservazione dei dati" : "6. Data Retention"}</h2>
            <p>{it ? "Le risposte al quiz e gli itinerari generati sono conservati insieme al tuo account per permetterti di ritrovarli e per migliorare i suggerimenti futuri. Vengono eliminati definitivamente quando cancelli l'account (dalla pagina Account). Gli indirizzi IP sono usati solo per il rate limiting e non vengono conservati oltre la finestra tecnica necessaria." : "Quiz answers and generated itineraries are stored with your account so you can revisit them and to improve future suggestions. They are permanently deleted when you delete your account (from the Account page). IP addresses are used only for rate limiting and are not retained beyond the necessary technical window."}</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "7. Condivisione dei dati" : "7. Data Sharing"}</h2>
            <p>{it ? "MindRoute non vende, cede o condivide i tuoi dati personali con terze parti, ad eccezione di quanto necessario per l'erogazione del servizio (elaborazione tramite API di Anthropic per la generazione dei contenuti AI). Anthropic tratta i dati in conformità alla propria" : "MindRoute does not sell, transfer or share your personal data with third parties, except as necessary to provide the service (processing via Anthropic API for AI content generation). Anthropic processes data in accordance with its"} <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#E94560] hover:underline">privacy policy</a>.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "8. I tuoi diritti" : "8. Your Rights"}</h2>
            <p className="mb-3">{it ? "In conformità al GDPR, hai il diritto di:" : "Under the GDPR, you have the right to:"}</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>{it ? "Accedere ai tuoi dati personali" : "Access your personal data"}</li>
              <li>{it ? "Richiedere la rettifica o la cancellazione dei dati" : "Request rectification or deletion of data"}</li>
              <li>{it ? "Opporti al trattamento" : "Object to processing"}</li>
              <li>{it ? "Richiedere la portabilità dei dati" : "Request data portability"}</li>
              <li>{it ? "Presentare un reclamo all'autorità di controllo (Garante per la protezione dei dati personali)" : "Lodge a complaint with the supervisory authority (Italian Data Protection Authority)"}</li>
            </ul>
            <p className="mt-3">{it ? "Per esercitare i tuoi diritti, contattaci a" : "To exercise your rights, contact us at"} <a href="mailto:mindroutetravel@gmail.com" className="text-[#E94560] hover:underline">mindroutetravel@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "9. Link di affiliazione" : "9. Affiliate Links"}</h2>
            <p>{it ? "MindRoute partecipa a programmi di affiliazione con partner commerciali nel settore travel (tra cui Booking.com, Hotels.com, GetYourGuide, Viator, Klook, TripAdvisor, Expedia). Quando clicchi su un link affiliate e completi un acquisto, MindRoute può ricevere una commissione senza costi aggiuntivi per te." : "MindRoute participates in affiliate programs with commercial partners in the travel sector (including Booking.com, Hotels.com, GetYourGuide, Viator, Klook, TripAdvisor, Expedia). When you click an affiliate link and complete a purchase, MindRoute may receive a commission at no additional cost to you."}</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{it ? "10. Modifiche alla privacy policy" : "10. Changes to this Privacy Policy"}</h2>
            <p>{it ? "Questa privacy policy può essere aggiornata periodicamente. Le modifiche sostanziali verranno comunicate tramite avviso sul sito. La data dell'ultimo aggiornamento è indicata in cima a questa pagina." : "This privacy policy may be updated periodically. Substantial changes will be communicated via a notice on the site. The date of the last update is shown at the top of this page."}</p>
          </section>

        </div>
      </div>
    </div>
  );
}
