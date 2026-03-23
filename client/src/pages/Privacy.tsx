import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: "#0f0a10" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Torna alla home
        </Link>
        <h1 className="text-4xl font-serif font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-12">Ultimo aggiornamento: marzo 2026</p>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Titolare del trattamento</h2>
            <p>Il titolare del trattamento dei dati è Lorenzo De Filippis, raggiungibile all'indirizzo email <a href="mailto:mindroutetravel@gmail.com" className="text-[#E94560] hover:underline">mindroutetravel@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Dati raccolti</h2>
            <p className="mb-3">MindRoute raccoglie i seguenti dati durante l'utilizzo del servizio:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-white">Risposte al quiz di profilazione</strong> — le risposte che fornisci durante il percorso di profilazione psicologica e i dati logistici del viaggio (budget, date, destinazione di partenza, ecc.). Questi dati sono conservati esclusivamente in memoria volatile del server e vengono eliminati automaticamente al riavvio del server o al termine della sessione.</li>
              <li><strong className="text-white">Indirizzo IP</strong> — utilizzato esclusivamente per la limitazione delle richieste (rate limiting) al fine di prevenire abusi del servizio. Non viene conservato in modo persistente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Finalità del trattamento</h2>
            <p>I dati raccolti sono utilizzati esclusivamente per:</p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li>Generare destinazioni di viaggio personalizzate in base al tuo profilo psicologico</li>
              <li>Creare itinerari di viaggio su misura</li>
              <li>Prevenire abusi del servizio tramite rate limiting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Base giuridica</h2>
            <p>Il trattamento dei dati si basa sul tuo consenso (art. 6, par. 1, lett. a) del GDPR) e sull'esecuzione del servizio richiesto (art. 6, par. 1, lett. b) del GDPR).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Cookie</h2>
            <p className="mb-3">MindRoute non utilizza cookie propri di profilazione o tracciamento. Il sito utilizza esclusivamente:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-white">Cookie tecnici essenziali</strong> — necessari per il funzionamento del servizio (preferenza lingua, stato della sessione).</li>
              <li><strong className="text-white">Cookie di terze parti</strong> — i link affiliate presenti negli itinerari (Booking.com, Hotels.com, GetYourGuide, Viator, Klook, TripAdvisor, Expedia e altri) possono impostare cookie sui loro siti quando vi accedi tramite i nostri link. MindRoute non ha controllo su questi cookie. Ti invitiamo a consultare le privacy policy dei singoli servizi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Conservazione dei dati</h2>
            <p>I dati di profilazione e l'indirizzo IP non vengono conservati in modo persistente. Vengono eliminati automaticamente al riavvio del server o al termine della sessione di utilizzo.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Condivisione dei dati</h2>
            <p>MindRoute non vende, cede o condivide i tuoi dati personali con terze parti, ad eccezione di quanto necessario per l'erogazione del servizio (elaborazione tramite API di Anthropic per la generazione dei contenuti AI). Anthropic tratta i dati in conformità alla propria <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#E94560] hover:underline">privacy policy</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. I tuoi diritti</h2>
            <p className="mb-3">In conformità al GDPR, hai il diritto di:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Accedere ai tuoi dati personali</li>
              <li>Richiedere la rettifica o la cancellazione dei dati</li>
              <li>Opporti al trattamento</li>
              <li>Richiedere la portabilità dei dati</li>
              <li>Presentare un reclamo all'autorità di controllo (Garante per la protezione dei dati personali)</li>
            </ul>
            <p className="mt-3">Per esercitare i tuoi diritti, contattaci a <a href="mailto:mindroutetravel@gmail.com" className="text-[#E94560] hover:underline">mindroutetravel@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Link di affiliazione</h2>
            <p>MindRoute partecipa a programmi di affiliazione con partner commerciali nel settore travel (tra cui Booking.com, Hotels.com, GetYourGuide, Viator, Klook, TripAdvisor, Expedia). Quando clicchi su un link affiliate e completi un acquisto, MindRoute può ricevere una commissione senza costi aggiuntivi per te.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Modifiche alla privacy policy</h2>
            <p>Questa privacy policy può essere aggiornata periodicamente. Le modifiche sostanziali verranno comunicate tramite avviso sul sito. La data dell'ultimo aggiornamento è indicata in cima a questa pagina.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
