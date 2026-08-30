/**
 * Landing editoriale MindRoute.
 * I visual usano snapshot read-only delle UI reali del prodotto: scelta della
 * meta, profilazione, itinerary flow, Companion e Travel Portrait.
 */

import { useEffect } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { unsplashSized } from "@/lib/img";
import { BrandMark } from "@/components/BrandMark";
import { MotionConfig, Reveal, Stagger, StaggerItem } from "@/lib/motion";

const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&fit=crop&crop=entropy&auto=format&q=80`;

const PHOTO = {
  kyoto: u("1493976040374-85c8e12f0c0e", 2000),
  azores: u("1620998051604-95ff17ccc537"),
  procida: u("1628522241320-8135caa27dcf"),
  alentejo: u("1647628690577-372e0f0631e3"),
  lisbon: u("1525207934214-58e69a8f8a93"),
  bgDesert: u("1542401886-65d6c61db217"),
  bgDolomiti: u("1677741447337-48aba59a8f61"),
  bgAurora: u("1605286700104-15889419f60b"),
  mountains: u("1519681393784-d120267933ba"),
} as const;

const I = {
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5"/></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-4.8A7 7 0 0 1 3 13V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>,
  ig: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  tiktok: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>,
} as const;

const ITINERARY_STOPS = [
  { time: "08:30", key: "led.build.stop1", meta: "led.build.stop1Meta", color: "#D4A853" },
  { time: "12:45", key: "led.build.stop2", meta: "led.build.stop2Meta", color: "#6FB4A8" },
  { time: "16:10", key: "led.build.stop3", meta: "led.build.stop3Meta", color: "#E94560" },
  { time: "20:30", key: "led.build.stop4", meta: "led.build.stop4Meta", color: "#9B8CE0" },
] as const;

export function LandingEditorial({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const heroImg = unsplashSized(PHOTO.kyoto, isMobile ? 900 : 1600, 70);
  const sceneW = isMobile ? 800 : 1400;
  const sized = (src: string, w = sceneW, q = 70) => unsplashSized(src, w, q);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const instant = new URLSearchParams(window.location.search).get("noanim") === "1";
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" }));
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = heroImg;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => link.remove();
  }, [heroImg]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="led">
        <section className="led-hero" id="s-hero">
          <div className="led-hero-photo" style={{ backgroundImage: `url(${heroImg})` }} aria-hidden="true" />
          <div className="led-hero-veil" aria-hidden="true" />
          <div className="led-container"><div className="led-hero-layout">
            <Stagger mount stagger={0.09} delayChildren={0.06} className="led-hero-inner">
              <StaggerItem as="div" className="led-eyebrow"><span className="d" />{t("led.hero.eyebrow")}</StaggerItem>
              <StaggerItem as="h1">
                {t("led.hero.t1")}
                <span className="led-impact-line">{t("led.hero.t2Lead")} <em>{t("led.hero.t2Accent")}</em></span>
              </StaggerItem>
              <StaggerItem as="p" className="led-narr">{t("led.hero.sub")}</StaggerItem>
              <StaggerItem as="div" className="led-hero-row">
                <button className="led-btn" onClick={onStart} data-testid="led-hero-cta">{t("led.hero.cta")} <span className="ar">→</span></button>
                <a className="led-hero-example" href="#s-build">{t("led.hero.example")} <span>↓</span></a>
              </StaggerItem>
              <StaggerItem as="div" className="led-hero-proof">
                {[1, 2, 3].map((n) => <span key={n}><i />{t(`led.hero.proof${n}`)}</span>)}
              </StaggerItem>
            </Stagger>

            <Reveal as="div" className="led-hero-result">
              <div className="led-result-topline"><span>{t("led.hero.result")}</span><b><i />{t("led.hero.ready")}</b></div>
              <div className="led-result-photo" style={{ backgroundImage: `url(${sized(PHOTO.procida, 760, 66)})` }}>
                <div><small>{t("led.hero.location")}</small><h3>Procida</h3><span>{t("led.hero.placeType")}</span></div>
              </div>
              <div className="led-result-copy">
                <p>{t("led.hero.placeSummary")}</p>
                <div className="led-result-traits">{[1, 2, 3].map((n) => <span key={n}>{t(`led.hero.trait${n}`)}</span>)}</div>
                <div className="led-result-why"><small>{t("led.hero.why")}</small><p>{t("led.hero.whyText")}</p></div>
              </div>
              <div className="led-result-caption">{t("led.demo")}</div>
            </Reveal>
          </div></div>
          <div className="led-scroll" aria-hidden="true">{t("led.hero.scroll")}<span className="ch">⌄</span></div>
        </section>

        <section className="led-outcome" id="s-outcome">
          <div className="led-container">
            <Reveal as="header" className="led-outcome-head">
              <div className="led-eyebrow"><span className="d" />{t("led.outcome.label")}</div>
              <h2>{t("led.outcome.title")}</h2>
              <p>{t("led.outcome.body")}</p>
            </Reveal>
            <Stagger className="led-outcome-grid" stagger={0.07}>
              {[1, 2, 3, 4].map((n) => (
                <StaggerItem as="article" className="led-outcome-card" key={n}>
                  <span>0{n}</span>
                  <h3>{t(`led.outcome.${n}.title`)}</h3>
                  <p>{t(`led.outcome.${n}.body`)}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section className="led-feature led-understand" id="how-it-works">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.bgDesert)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-feature-grid">
            <Reveal as="div" className="led-feature-copy">
              <div className="led-chapter"><span>01</span>{t("led.understand.label")}</div>
              <h2>{t("led.understand.title")}</h2>
              <p className="led-feature-body">{t("led.understand.body")}</p>
              <p className="led-feature-aside">{t("led.understand.aside")}</p>
              <p className="led-feature-thesis">{t("led.understand.thesis")}</p>
            </Reveal>
            <Reveal as="div" className="led-product led-understand-product" role="img" aria-label={t("led.understand.visualAlt")}>
              <div className="led-product-topline"><span>{t("led.preview")}</span><span className="led-product-live"><i />Mindroute</span></div>
              <div className="led-understand-flow">
                <div className="led-profile-snapshot">
                  <div className="led-profile-person"><span className="led-avatar">{I.user}</span><span><b>{t("led.understand.person")}</b><small>{t("led.understand.personMeta")}</small></span></div>
                  <Stagger className="led-profile-signals" stagger={0.06}>
                    {["budget", "days", "period", "pace", "company", "avoid"].map((key) => <StaggerItem as="span" key={key} className={key === "pace" || key === "avoid" ? "on" : ""}>{t(`led.understand.${key}`)}</StaggerItem>)}
                  </Stagger>
                </div>
                <div className="led-flow-bridge" aria-hidden="true"><i /><span>→</span></div>
                <div className="led-match-snapshot">
                  <div className="led-snapshot-kicker">{t("led.understand.matches")}</div>
                  <div className="led-match-grid">
                    {[
                      { name: "Procida", country: t("led.country.italy"), img: PHOTO.procida, role: t("led.understand.direct"), roleClass: "direct" },
                      { name: t("led.place.azores"), country: t("led.country.portugal"), img: PHOTO.azores, role: t("led.understand.lateral"), roleClass: "lateral" },
                      { name: "Alentejo", country: t("led.country.portugal"), img: PHOTO.alentejo, role: t("led.understand.surprise"), roleClass: "surprise" },
                    ].map((place, index) => (
                      <div className="led-match-card" key={place.name}>
                        <span className="led-match-photo" style={{ backgroundImage: `url(${sized(place.img, 380, 58)})` }} />
                        <span className="led-match-name">{place.name}</span><span className="led-match-country">{place.country}</span>
                        <span className={`led-match-role ${place.roleClass}`}>{place.role}</span>
                        {index === 0 && <span className="led-match-why">{t("led.understand.why")}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="led-product-caption">{t("led.demo")}</p>
            </Reveal>
          </div>
        </section>

        <section className="led-feature led-build led-feature-reverse" id="s-build">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.bgDolomiti)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-feature-grid">
            <Reveal as="div" className="led-feature-copy">
              <div className="led-chapter"><span>02</span>{t("led.build.label")}</div>
              <h2>{t("led.build.title")}</h2>
              <p className="led-feature-body">{t("led.build.body")}</p><p className="led-feature-aside">{t("led.build.aside")}</p>
              <p className="led-feature-thesis">{t("led.build.thesis")}</p>
              <p className="led-feature-control"><span>{I.edit}</span>{t("led.build.editable")}</p>
            </Reveal>
            <Reveal as="div" className="led-product led-itinerary-product" role="img" aria-label={t("led.build.visualAlt")}>
              <div className="led-product-topline"><span>{t("led.build.preview")}</span><span className="led-product-live"><i />{t("led.build.ready")}</span></div>
              <div className="led-itinerary-head"><span>{t("led.build.destination")}</span><h3>{t("led.build.tripTitle")}</h3><div className="led-day-tabs">{[1, 2, 3, 4, 5].map((day) => <span key={day} className={day === 2 ? "on" : ""}>{day}</span>)}</div></div>
              <div className="led-itinerary-layout">
                <Stagger className="led-itinerary-timeline" stagger={0.07}>
                  {ITINERARY_STOPS.map((stop) => <StaggerItem as="div" className="led-itinerary-stop" key={stop.time} style={{ ["--pc" as string]: stop.color }}><span className="led-stop-rail"><i /></span><span className="led-stop-copy"><small>{stop.time}</small><b>{t(stop.key)}</b><em>{t(stop.meta)}</em></span></StaggerItem>)}
                </Stagger>
                <div className="led-reason-card"><span>{t("led.build.whyLabel")}</span><p>{t("led.build.whyText")}</p><small>{t("led.build.whyEvidence")}</small></div>
              </div>
              <p className="led-product-caption">{t("led.demo")}</p>
            </Reveal>
          </div>
        </section>

        <section className="led-feature led-companion" id="s-companion">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.lisbon)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-feature-grid">
            <Reveal as="div" className="led-feature-copy">
              <div className="led-chapter"><span>03</span>{t("led.companion.label")}</div><h2>{t("led.companion.title")}</h2>
              <div className="led-prompt-list" aria-label={t("led.companion.promptsLabel")}>{[1, 2, 3, 4].map((n) => <span key={n}>“{t(`led.companion.prompt${n}`)}”</span>)}</div>
              <p className="led-feature-body">{t("led.companion.body")}</p><p className="led-feature-thesis">{t("led.companion.thesis")}</p>
            </Reveal>
            <Reveal as="div" className="led-product led-companion-product" role="img" aria-label={t("led.companion.visualAlt")}>
              <div className="led-companion-day">
                <div className="led-mini-day-head"><span>{t("led.companion.day")}</span><b>{t("led.companion.dayTitle")}</b></div>
                <div className="led-mini-stop muted"><i style={{ background: "#D4A853" }} /><span><small>09:00</small>{t("led.companion.oldStop")}</span></div>
                <div className="led-mini-stop changed"><i style={{ background: "#E94560" }} /><span><small>10:30 · {t("led.companion.updated")}</small>{t("led.companion.newStop")}</span></div>
                <div className="led-mini-stop"><i style={{ background: "#6FB4A8" }} /><span><small>13:00</small>{t("led.companion.lunch")}</span></div>
              </div>
              <div className="led-companion-panel">
                <div className="led-companion-head"><span className="led-companion-mark"><i />{I.chat}</span><span><b>{t("led.companion.name")}</b><small>{t("led.companion.context")}</small></span></div>
                <Stagger className="led-chat-thread" stagger={0.12}><StaggerItem as="div" className="led-chat-message me">{t("led.companion.prompt1")}</StaggerItem><StaggerItem as="div" className="led-chat-tool"><i />{t("led.companion.action")}</StaggerItem><StaggerItem as="div" className="led-chat-message ai">{t("led.companion.answer")}</StaggerItem></Stagger>
                <div className="led-chat-input"><span>{t("led.companion.placeholder")}</span><i>↑</i></div>
              </div>
              <p className="led-product-caption">{t("led.demo")}</p>
            </Reveal>
          </div>
        </section>

        <section className="led-feature led-learn led-feature-reverse" id="s-learn">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.bgAurora)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-feature-grid">
            <Reveal as="div" className="led-feature-copy">
              <div className="led-chapter"><span>04</span>{t("led.learn.label")}</div><h2>{t("led.learn.title")}</h2><p className="led-feature-body">{t("led.learn.body")}</p>
              <div className="led-insight-list">{[1, 2, 3, 4].map((n) => <span key={n}><i>{I.check}</i>{t(`led.learn.insight${n}`)}</span>)}</div>
              <p className="led-feature-body">{t("led.learn.evolution")}</p><p className="led-feature-thesis">{t("led.learn.thesis")}</p><p className="led-feature-aside">{t("led.learn.control")}</p>
            </Reveal>
            <Reveal as="div" className="led-product led-portrait-product" role="img" aria-label={t("led.learn.visualAlt")}>
              <div className="led-product-topline"><span>{t("led.learn.preview")}</span><span className="led-product-live"><i />{t("led.learn.alive")}</span></div>
              <div className="led-portrait-history">
                {[{ n: "01", name: t("led.learn.trip1"), img: PHOTO.procida }, { n: "02", name: t("led.learn.trip2"), img: PHOTO.kyoto }, { n: "03", name: t("led.learn.trip3"), img: PHOTO.alentejo }].map((trip) => <div className="led-history-trip" key={trip.n}><span className="led-history-photo" style={{ backgroundImage: `url(${sized(trip.img, 260, 54)})` }} /><small>{t("led.learn.trip")} {trip.n}</small><b>{trip.name}</b></div>)}
                <span className="led-history-line" aria-hidden="true"><i /><i /><i /><b>→</b></span>
              </div>
              <div className="led-portrait-panel">
                <div className="led-portrait-kicker">{t("led.learn.principle")}</div><h3>{t("led.learn.principleTitle")}</h3><p>{t("led.learn.principleBody")}</p>
                <div className="led-confidence"><span>{t("led.learn.confidence")}</span><i><b /></i><strong>87%</strong></div>
                <button type="button" tabIndex={-1}>{t("led.learn.evidence")} <span>3</span></button>
                <div className="led-recognise"><small>{t("led.learn.recognise")}</small><div><span className="on">{t("led.learn.yes")}</span><span>{t("led.learn.partly")}</span><span>{t("led.learn.no")}</span></div></div>
              </div>
              <p className="led-product-caption">{t("led.demo")}</p>
            </Reveal>
          </div>
        </section>

        <section className="led-trust" id="s-trust">
          <div className="led-container">
            <div className="led-trust-grid">
              <Reveal as="div" className="led-trust-copy">
                <div className="led-eyebrow"><span className="d" />{t("led.trust.label")}</div>
                <h2>{t("led.trust.title")}</h2>
                <p>{t("led.trust.body")}</p>
                <div className="led-trust-principles">
                  {[1, 2, 3].map((n) => <article key={n}><span>{I.check}</span><div><h3>{t(`led.trust.${n}.title`)}</h3><p>{t(`led.trust.${n}.body`)}</p></div></article>)}
                </div>
              </Reveal>
              <Reveal as="div" className="led-faq">
                <div className="led-faq-title">{t("led.faq.title")}</div>
                {[1, 2, 3, 4].map((n) => (
                  <details key={n} open={n === 1}>
                    <summary>{t(`led.faq.${n}.q`)}<span>+</span></summary>
                    <p>{t(`led.faq.${n}.a`)}</p>
                  </details>
                ))}
                <Link href="/privacy" className="led-privacy-link">{t("led.foot.privacy")} <span>→</span></Link>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="led-end" id="s-end">
          <div className="led-end-photo" style={{ backgroundImage: `url(${sized(PHOTO.mountains)})` }} aria-hidden="true" /><div className="led-end-veil" aria-hidden="true" />
          <div className="led-container led-end-inner"><Stagger stagger={0.11} amount={0.25}><StaggerItem as="div" className="led-eyebrow"><span className="d" />{t("led.end.eyebrow")}</StaggerItem><StaggerItem as="h1">{t("led.end.t1")}<span className="led-impact-line">{t("led.end.t2Lead")} <em>{t("led.end.t2Accent")}</em></span></StaggerItem><StaggerItem as="div"><button className="led-btn" onClick={onStart} data-testid="led-end-cta">{t("led.end.cta")} <span className="ar">→</span></button></StaggerItem><StaggerItem as="p" className="led-end-note">{t("led.end.note")}</StaggerItem></Stagger></div>
        </section>

        <footer className="led-footer"><div className="led-container"><div className="led-footer-grid">
          <div><div className="led-footer-mark"><BrandMark size={26} idPrefix="foot" /> Mindroute</div><p className="led-footer-tag">{t("footer.tagline")}</p></div>
          <div><div className="led-footer-head">{t("led.foot.product")}</div><Link href="/come-funziona" className="led-footer-link">{t("led.foot.how")}</Link><Link href="/start" className="led-footer-link">{t("led.foot.start")}</Link></div>
          <div><div className="led-footer-head">{t("led.foot.company")}</div><Link href="/privacy" className="led-footer-link">{t("led.foot.privacy")}</Link><a href="mailto:mindroutetravel@gmail.com" className="led-footer-link">{t("led.foot.contact")}</a></div>
          <div><div className="led-footer-head">{t("led.foot.follow")}</div><div className="led-footer-socials"><a href="https://instagram.com/mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="Instagram">{I.ig}</a><a href="https://tiktok.com/@mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="TikTok">{I.tiktok}</a></div></div>
        </div><div className="led-footer-base"><span>{t("footer.copyright")}</span><span>{t("footer.affiliate")}</span></div></div></footer>
      </div>
    </MotionConfig>
  );
}
