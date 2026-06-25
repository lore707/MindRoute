/**
 * LandingCinematic.tsx
 * ───────────────────────────────────────────────────────────────
 * Drop-in cinematic landing page for MindRoute.
 *
 * 8 sections, all cinematic:
 *   ① Hero crossfade with thumbnail picker
 *   ② Marquee destinations strip
 *   ③ Manifesto full-bleed photo + XXL quote
 *   ④ How it works — 3 photo cards
 *   ⑤ Destinations mosaic
 *   ⑥ Product preview — Cinematic Split (answers + match photo)
 *   ⑦ Method — editorial 4-stat line
 *   ⑧ Final CTA — crossfade closure with particles
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { unsplashSized } from "@/lib/img";
import { CURATED_DESTINATIONS_FEED, type DestinationsFeedItem } from "@shared/destinations-feed";

export type HeroPhoto = { img: string; name: string; country: string; mood: string };
export type Step = { n: number; tag: string; title: string; desc: string; img: string };
export type Destination = { name: string; country: string; mood: string; size?: "l" | "s"; img: string };
export type FinalPhoto = { img: string; name: string; coords: string };
export type MarqueeItem = DestinationsFeedItem;

export type LandingData = {
  heroPhotos: HeroPhoto[];          // 4-5 cinematic destinations
  marquee: MarqueeItem[];           // real + curated destinations for the proof-point ticker
  manifestoBg: string;              // full-bleed photo url
  steps: Step[];                    // 3 photo cards
  destinations: Destination[];      // 5 mosaic items
  matchPhoto: string;               // photo shown in product preview (poster/fallback)
  matchVideo?: string;              // optional looping video covering the photo
  finalPhotos: FinalPhoto[];        // 3-5 closing crossfade photos
  onStart?: () => void;             // CTA handler
};

export function LandingCinematic({ data, mode = "landing" }: { data: LandingData; mode?: "landing" | "how" }) {
  const { t, lang } = useI18n();
  // `landing` = slim app-entry: hero + proof marquee only. `how` = the editorial
  // story (how it works, manifesto, destinations, preview, method, closing CTA)
  // that lives at /come-funziona behind the nav. Both share this component so
  // the cinematic helpers (parallax, image sizing, i18n label maps) and the
  // footer are defined once.
  const isLanding = mode === "landing";
  const [heroIdx, setHeroIdx] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [finalIdx, setFinalIdx] = useState(0);

  // Right-size every background-image to the viewport. These are CSS
  // background-images (no srcset possible), and the stored URLs are often
  // Unsplash `full` (multi-MB) — on a phone that stalls the page and the photo
  // "fatica a caricare". We cap the width per slot, smaller on mobile, and let
  // Unsplash serve webp/avif. Computed once at mount (orientation flips are rare
  // and not worth re-fetching every background). full-bleed slots use q=70 since
  // they always sit under a dark overlay/grain where compression is invisible.
  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);
  const W = useMemo(() => ({
    full: isMobile ? 900 : 1600,   // hero / manifesto / final full-bleed
    card: isMobile ? 560 : 780,    // dest mosaic + match photo
    step: isMobile ? 520 : 560,    // how-it-works cards
    thumb: 200,                    // hero thumbnail picker
  }), [isMobile]);
  const bgFull = (u: string) => unsplashSized(u, W.full, 70);

  // Translate server-provided country/mood labels via i18n lookup so the same
  // English-baked data renders in IT when needed. Falls back to the original
  // string if no translation key matches (graceful for unknown values).
  const tx = (prefix: string, val: string) => {
    if (lang === "en") return val;
    const key = `${prefix}.${val.replace(/\s+/g, "")}`;
    const out = t(key);
    return out === key ? val : out;
  };
  const tCountry = (c: string) => tx("landing.country", c);
  const tMood = (m: string) => tx("landing.mood", m);
  // Destination cards have compound moods like "Quiet · Volcanic" — map by
  // canonical English value to a stable i18n key.
  const destMoodMap: Record<string, string> = {
    "Quiet · Volcanic":         "landing.destmood.quietVolcanic",
    "Off-the-grid · Cultural":  "landing.destmood.offgridCultural",
    "Wild · Solitude":          "landing.destmood.wildSolitude",
    "Slow · Pastoral":          "landing.destmood.slowPastoral",
    "Vibrant · Authentic":      "landing.destmood.vibrantAuthentic",
  };
  const tDestMood = (m: string) => {
    if (lang === "en") return m;
    const key = destMoodMap[m];
    if (!key) return m;
    const out = t(key);
    return out === key ? m : out;
  };

  // Step labels — server provides EN text but we override with translations so
  // the three-acts story reads natively in IT. n is 1/2/3.
  const stepText = (n: number) => ({
    tag: `${t("landing.how.stepLabel")} ${n}`,
    title: t(`landing.how.step${n}.title`),
    desc: t(`landing.how.step${n}.desc`),
  });

  // Hero auto-cycle
  useEffect(() => {
    if (hovering) return;
    const id = setInterval(() => setHeroIdx(i => (i + 1) % data.heroPhotos.length), 6500);
    return () => clearInterval(id);
  }, [hovering, data.heroPhotos.length]);

  // Final crossfade auto-cycle
  useEffect(() => {
    const id = setInterval(() => setFinalIdx(i => (i + 1) % data.finalPhotos.length), 6000);
    return () => clearInterval(id);
  }, [data.finalPhotos.length]);

  // Parallax — mouse + scroll
  useEffect(() => {
    let raf = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
    const onMove = (e: MouseEvent) => {
      tmx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      tmy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };
    const tick = () => {
      mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
      const y = window.scrollY;
      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach(el => {
        const d = parseFloat(el.dataset.parallax || "0.2");
        const useScroll = el.dataset.parallaxScroll === "1";
        const tx = -mx * d * 30;
        const ty = useScroll ? -y * d * 0.3 : -my * d * 30;
        el.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    tick();
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // Preload strategy tuned for LCP. The first hero is the LCP element (a CSS
  // background-image, so it can't carry fetchpriority/loading attributes) — we
  // give it a high-priority <link rel=preload> so the browser fetches it as
  // soon as the connection is warm. The remaining hero/final photos only feed
  // the auto-crossfade, so we defer them to idle: warming all ~10 at t=0 floods
  // mobile bandwidth and competes with the one image the user is waiting for.
  useEffect(() => {
    if (!data.heroPhotos.length) return;
    const firstHero = bgFull(data.heroPhotos[0].img);
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = firstHero;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);

    // Warm the rest once the browser is idle (or after a short fallback delay),
    // so they never block the LCP image.
    const rest = [...data.heroPhotos.slice(1), ...data.finalPhotos].map(p => bgFull(p.img));
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      rest.forEach(src => { const img = new Image(); img.decoding = "async"; img.src = src; });
    };
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: any) => number);
    const idleId = ric ? ric(warm, { timeout: 2500 }) : 0;
    const timerId = window.setTimeout(warm, 1800);
    return () => {
      window.clearTimeout(timerId);
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(idleId);
      link.remove();
    };
  }, [data.heroPhotos, data.finalPhotos]);

  // Float particles for final
  const particles = useMemo(() => {
    const arr: Array<{ x: number; sz: number; dur: number; dl: number; dx: number; accent: boolean }> = [];
    for (let i = 0; i < 28; i++) {
      arr.push({
        x: Math.random() * 100,
        sz: 1 + Math.random() * 3,
        dur: 14 + Math.random() * 16,
        dl: Math.random() * 20,
        dx: (Math.random() - 0.5) * 120,
        accent: i % 5 === 0,
      });
    }
    return arr;
  }, []);

  return (
    <div className="landing-cinematic">

      {isLanding && (<>
      {/* ① HERO */}
      <section className="lc-hero" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
        <div className="lc-hero-bg">
          {data.heroPhotos.map((p, i) => (
            <div key={i} className={"lc-hero-photo" + (heroIdx === i ? " active" : "")} style={{ backgroundImage: `url(${bgFull(p.img)})` }} />
          ))}
          <div className="lc-hero-overlay" />
          <div className="lc-hero-grain" data-parallax="0.05" />
        </div>

        <div className="lc-hero-content">
          <div className="lc-hero-left">
            <div className="lc-hero-eyebrow"><div className="lc-eyebrow white"><span className="d" />{t("landing.hero.eyebrow")}</div></div>
            <h1>
              <span className="lc-hero-l1">
                <span className="word w1">{t("landing.hero.title1")}</span>{" "}<span className="word w2">{t("landing.hero.title2")}</span>
              </span><br /><span className="word w3">{t("landing.hero.title3")}</span>
            </h1>
            <p className="lc-hero-tag">{t("landing.hero.tag")}</p>
            <div className="lc-hero-actions">
              <button className="lc-btn-primary lg" onClick={data.onStart}>{t("landing.hero.cta")} →</button>
              <div className="lc-hero-counter"><strong>17</strong>{t("landing.hero.counterLabel")}</div>
            </div>
            <ul className="lc-hero-points">
              <li>{t("landing.hero.point1")}</li>
              <li>{t("landing.hero.point2")}</li>
              <li>{t("landing.hero.point3")}</li>
            </ul>
          </div>

          <div className="lc-hero-thumbs">
            <div className="lc-hero-thumbs-head">
              <span>{t("landing.hero.thumbsHead")}</span>
              <span className="num">{(heroIdx + 1).toString().padStart(2, "0")} / {data.heroPhotos.length.toString().padStart(2, "0")}</span>
            </div>
            {data.heroPhotos.map((p, i) => (
              <div key={i} className={"lc-hero-thumb" + (heroIdx === i ? " active" : "")} onClick={() => setHeroIdx(i)}>
                <div className="lc-hero-thumb-img" style={{ backgroundImage: `url(${unsplashSized(p.img, W.thumb)})` }} />
                <div className="lc-hero-thumb-body">
                  <div className="lc-hero-thumb-name">{p.name}</div>
                  <div className="lc-hero-thumb-meta">{tCountry(p.country)} · {tMood(p.mood)}</div>
                </div>
                <div className="lc-hero-thumb-progress" key={"p-" + heroIdx + "-" + i} />
              </div>
            ))}
          </div>
        </div>

        <div className="lc-hero-scroll">
          <span>{t("landing.hero.scroll")}</span>
          <span className="line" />
        </div>
      </section>

      {/* ② MARQUEE — proof-point: real recent generations + curated fallback */}
      <section className="lc-marquee">
        <div className="lc-marquee-track" data-parallax="0.1">
          {[...data.marquee, ...data.marquee].map((c, i) => (
            <div key={i} className="lc-marquee-item">
              <span className="dot" />
              <span>
                {c.flag ? `${c.flag} ` : ""}{c.name}
                {c.vibe && (
                  <span style={{ marginLeft: 8, opacity: 0.6, fontSize: "0.78em", letterSpacing: ".04em" }}>
                    · {c.vibe}
                  </span>
                )}
                {c.isRecent && c.relativeTime && (
                  <span style={{ marginLeft: 8, color: "var(--lc-accent)", opacity: 0.78, fontSize: "0.72em", fontStyle: "normal", letterSpacing: ".06em" }}>
                    · {c.relativeTime}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
      </>)}

      {!isLanding && (<>
      {/* ③ HOW IT WORKS — moved above manifesto so the value prop lands fast */}
      <section className="lc-how">
        <div className="lc-container">
          <div className="lc-how-head">
            <div className="lc-eyebrow" style={{ justifyContent: "center" }}><span className="d" />{t("landing.how.eyebrow")}</div>
            <h2 dangerouslySetInnerHTML={{ __html: t("landing.how.title") }} />
            <p className="lc-sub">{t("landing.how.sub")}</p>
          </div>
          <div className="lc-steps">
            {data.steps.map(s => {
              const st = stepText(s.n);
              return (
                <div key={s.n} className="lc-step">
                  <div className="lc-step-img" style={{ backgroundImage: `url(${unsplashSized(s.img, W.step)})` }} />
                  <div className="lc-step-num">{s.n}</div>
                  <div className="lc-step-body">
                    <div className="lc-step-tag">{st.tag}</div>
                    <div className="lc-step-title">{st.title}</div>
                    <div className="lc-step-desc">{st.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ④ MANIFESTO */}
      <section className="lc-manifesto">
        <div className="lc-manifesto-bg" style={{ backgroundImage: `url(${bgFull(data.manifestoBg)})` }} />
        <div className="lc-manifesto-content">
          <div className="lc-manifesto-eyebrow"><div className="lc-eyebrow white"><span className="d" />{t("landing.manifesto.eyebrow")}</div></div>
          <p className="lc-manifesto-quote" dangerouslySetInnerHTML={{ __html: t("landing.manifesto.quote") }} />
          <p className="lc-manifesto-sub">{t("landing.manifesto.sub")}</p>
        </div>
      </section>

      {/* ⑤ DESTINATIONS */}
      <section className="lc-destinations">
        <div className="lc-container">
          <div className="lc-dest-head">
            <div className="lc-eyebrow" style={{ justifyContent: "center" }}><span className="d" />{t("landing.dest.eyebrow")}</div>
            <h2 dangerouslySetInnerHTML={{ __html: t("landing.dest.title") }} />
            <p className="lc-sub">{t("landing.dest.sub")}</p>
          </div>
          <div className="lc-dest-mosaic">
            {data.destinations.map((d, i) => (
              <div key={i} className={"lc-dest-card size-" + (d.size || "s")}>
                <div className="lc-dest-card-img" style={{ backgroundImage: `url(${unsplashSized(d.img, W.card)})` }} />
                <div className="lc-dest-card-body">
                  <span className="lc-dest-card-mood">{tDestMood(d.mood)}</span>
                  <div className="lc-dest-card-name">{d.name}</div>
                  <div className="lc-dest-card-country">{tCountry(d.country)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ PRODUCT PREVIEW — Cinematic Split */}
      <section className="lc-preview">
        <div className="lc-container">
          <div className="lc-preview-head">
            <div className="lc-eyebrow" style={{ justifyContent: "center" }}><span className="d" />{t("landing.preview.eyebrow")}</div>
            <h2 dangerouslySetInnerHTML={{ __html: t("landing.preview.title") }} />
          </div>

          <div className="lc-split-stage">
            <div className="lc-split-left">
              <div className="lc-split-left-head">{t("landing.preview.answers")}</div>

              <div className="lc-split-block">
                <div className="lc-split-q">{t("landing.preview.q1")}</div>
                <div className="lc-split-options">
                  <span className="lc-split-opt">{t("landing.preview.q1.wild")}</span>
                  <span className="lc-split-opt on">{t("landing.preview.q1.quiet")}</span>
                  <span className="lc-split-opt">{t("landing.preview.q1.chaotic")}</span>
                  <span className="lc-split-opt on">{t("landing.preview.q1.regen")}</span>
                  <span className="lc-split-opt">{t("landing.preview.q1.festive")}</span>
                </div>
              </div>

              <div className="lc-split-block">
                <div className="lc-split-q">{t("landing.preview.q2")}</div>
                <div className="lc-split-options">
                  <span className="lc-split-opt on">{t("landing.preview.q2.disc")}</span>
                  <span className="lc-split-opt">{t("landing.preview.q2.alive")}</span>
                  <span className="lc-split-opt on">{t("landing.preview.q2.slow")}</span>
                  <span className="lc-split-opt">{t("landing.preview.q2.surp")}</span>
                </div>
              </div>

              <div className="lc-split-block">
                <div className="lc-split-q">{t("landing.preview.q3")}</div>
                <div className="lc-split-options">
                  <span className="lc-split-opt on">{t("landing.preview.q3.crowd")}</span>
                  <span className="lc-split-opt">{t("landing.preview.q3.resort")}</span>
                  <span className="lc-split-opt on">{t("landing.preview.q3.sched")}</span>
                </div>
              </div>
            </div>

            <div className="lc-split-right">
              {/* Layer 0 — poster: same photo used as video's loading frame; also
                  shows through if the video URL fails. */}
              <div className="lc-split-photo" style={{ backgroundImage: `url(${unsplashSized(data.matchPhoto, W.card)})` }} />
              {/* Layer 1 — looping ocean video. Muted+playsInline are required
                  for autoplay on iOS/Android; preload=metadata defers payload
                  until the section is reached. */}
              {data.matchVideo && (
                <video
                  className="lc-split-video"
                  src={data.matchVideo}
                  poster={unsplashSized(data.matchPhoto, W.card)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                />
              )}
              {/* Layer 2 — gradient fade above the video so the bottom copy
                  stays readable regardless of the video's current frame. */}
              <div className="lc-split-photo-fade" />
              <div className="lc-split-photo-overlay">
                <div className="lc-split-tag"><span className="pulse" />{t("landing.preview.matchTag")}</div>
                <h3 className="lc-split-name"><em>Ikaria</em></h3>
                <div className="lc-split-country">{t("landing.preview.matchCountry")}</div>
                <p className="lc-split-quote" dangerouslySetInnerHTML={{ __html: `"${t("landing.preview.matchQuote")}"` }} />
                <div className="lc-split-meta">
                  <div className="lc-split-match">
                    <div className="lc-split-match-pct">94<sup>%</sup></div>
                    <div className="lc-split-match-lbl">{t("landing.preview.matchLabel")}</div>
                  </div>
                  <button className="lc-split-cta">{t("landing.preview.matchCta")} →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ⑦ METHOD — editorial line */}
      <section className="lc-method">
        <div className="lc-container">
          <div className="lc-eyebrow lc-method-eye"><span className="d" />{t("landing.method.eyebrow")}</div>
          <h2 className="lc-method-title" dangerouslySetInnerHTML={{ __html: t("landing.method.title") }} />
          <div className="lc-method-line">
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">7</div>
              <div className="lc-method-cell-l">{t("landing.method.cell1.l")}</div>
              <div className="lc-method-cell-d">{t("landing.method.cell1.d")}</div>
            </div>
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">3</div>
              <div className="lc-method-cell-l">{t("landing.method.cell2.l")}</div>
              <div className="lc-method-cell-d">{t("landing.method.cell2.d")}</div>
            </div>
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">4</div>
              <div className="lc-method-cell-l">{t("landing.method.cell3.l")}</div>
              <div className="lc-method-cell-d">{t("landing.method.cell3.d")}</div>
            </div>
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">∞</div>
              <div className="lc-method-cell-l">{t("landing.method.cell4.l")}</div>
              <div className="lc-method-cell-d">{t("landing.method.cell4.d")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ⑧ FINAL CTA — cinematic closure */}
      <section className="lc-final">
        <div className="lc-final-bg">
          {data.finalPhotos.map((p, i) => (
            <div key={i} className={"lc-final-photo" + (finalIdx === i ? " active" : "")} style={{ backgroundImage: `url(${bgFull(p.img)})` }} />
          ))}
        </div>
        <div className="lc-final-light top" />
        <div className="lc-final-light bot" />
        <div className="lc-final-particles">
          {particles.map((p, i) => (
            <span key={i} className={"lc-final-particle" + (p.accent ? " accent" : "")} style={{
              left: `${p.x}%`, top: "100%", width: p.sz, height: p.sz,
              ["--dur" as any]: p.dur + "s",
              ["--dl" as any]: p.dl + "s",
              ["--dx" as any]: p.dx + "px",
            }} />
          ))}
        </div>
        <div className="lc-final-coords">
          <strong>{t("landing.final.coords")}</strong>
          <span>{data.finalPhotos[finalIdx].name} · {data.finalPhotos[finalIdx].coords}</span>
        </div>
        <div className="lc-final-content">
          <div className="lc-eyebrow lc-final-eyebrow"><span className="d" />{t("landing.final.eyebrow")}</div>
          <h2 className="lc-final-quote" dangerouslySetInnerHTML={{ __html: t("landing.final.title") }} />
          <p className="lc-final-sub">{t("landing.final.sub")}</p>
          <div className="lc-final-cta">
            <button className="lc-btn-primary huge" onClick={data.onStart}>{t("landing.final.cta")} →</button>
            <div className="lc-final-reassure">
              <span><span className="check">✓</span> {t("landing.final.reassureFree")}</span>
              <span className="sep" />
              <span><span className="check">✓</span> {t("landing.final.reassureBook")}</span>
              <span className="sep" />
              <span><span className="check">✓</span> {t("landing.final.reassureMin")}</span>
            </div>
          </div>
        </div>
        <div className="lc-final-thumbs">
          {data.finalPhotos.map((_, i) => (
            <div key={i} className={"lc-final-thumb" + (finalIdx === i ? " active" : "")} onClick={() => setFinalIdx(i)}>
              <div className="lc-final-thumb-fill" />
            </div>
          ))}
        </div>
      </section>
      </>)}

      {/* ⑨ FOOTER */}
      <footer className="lc-footer">
        <div className="lc-footer-grid">
          <div className="lc-footer-brand">
            <div className="lc-footer-mark">MindRoute</div>
            <p className="lc-footer-tagline">{t("footer.tagline")}</p>
          </div>
          <div className="lc-footer-col">
            <div className="lc-footer-head">{t("footer.productHead")}</div>
            <Link href="/start" className="lc-footer-link">{t("footer.productStart")}</Link>
            <Link href="/privacy" className="lc-footer-link">{t("footer.privacy")}</Link>
          </div>
          <div className="lc-footer-col">
            <div className="lc-footer-head">{t("footer.contactHead")}</div>
            <a href="mailto:mindroutetravel@gmail.com" className="lc-footer-link">mindroutetravel@gmail.com</a>
          </div>
          <div className="lc-footer-col">
            <div className="lc-footer-head">{t("footer.socialHead")}</div>
            <a href="https://instagram.com/mindroute.travel" target="_blank" rel="noopener noreferrer" className="lc-footer-link lc-footer-social">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Instagram
            </a>
            <a href="https://tiktok.com/@mindroute.travel" target="_blank" rel="noopener noreferrer" className="lc-footer-link lc-footer-social">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
              TikTok
            </a>
          </div>
        </div>
        <div className="lc-footer-base">
          <span>{t("footer.copyright")}</span>
          <span>{t("footer.affiliate")}</span>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   DEFAULT / FALLBACK DATA — every photo ID is UNIQUE (no repeats
   across hero/steps/destinations/final). Used as initial render
   before /api/landing-images responds and as final safety net if
   the endpoint errors. ?crop=entropy picks the photo's most visually
   interesting region — avoids dead-center crops with sky-only frames.
   ─────────────────────────────────────────────────────────────── */
const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&fit=crop&crop=entropy&auto=format&q=80`;

export const DEFAULT_LANDING_DATA: LandingData = {
  heroPhotos: [
    { img: u("1493976040374-85c8e12f0c0e", 2000), name: "Kyoto",     country: "Japan",     mood: "Contemplative" },
    { img: u("1502786129293-79981df4e689", 2000), name: "Lofoten",   country: "Norway",    mood: "Wild" },
    { img: u("1531168556467-80aace0d0144", 2000), name: "Patagonia", country: "Argentina", mood: "Untamed" },
    { img: u("1523906834658-6e24ef2386f9", 2000), name: "Procida",   country: "Italy",     mood: "Authentic" },
    { img: u("1540959733332-eab4deabeeaf", 2000), name: "Tokyo",     country: "Japan",     mood: "Electric" },
  ],
  // Curated, brand-aligned fallback. The server's /api/destinations-feed merges
  // real recent generations (last 7 days) into this list when available; this
  // array is what we show on first paint and as the silent fallback if the
  // endpoint fails. Kept in /shared so server and client agree on the list.
  marquee: CURATED_DESTINATIONS_FEED,
  manifestoBg: u("1519681393784-d120267933ba", 2000),
  steps: [
    { n: 1, tag: "Step 1", title: "Answer 7 questions", desc: "Not about places — about you. How do you want to feel? What do you need? What do you avoid?", img: u("1455390582262-044cdead277a", 1200) },
    { n: 2, tag: "Step 2", title: "Get your match",     desc: "Three destinations chosen by feeling, not by algorithm. Each one tells you why it's yours.",   img: u("1524661135-423995f22d0b",  1200) },
    { n: 3, tag: "Step 3", title: "Book the whole trip",desc: "Flights, stays, experiences. All ready, all in one place. No more jumping between ten sites.", img: u("1488646953014-85cb44e25828", 1200) },
  ],
  destinations: [
    { name: "Azzorre",    country: "Portogallo", mood: "Quiet · Volcanic",        size: "l", img: u("1586671267731-da2cf3ceeb80", 1400) },
    { name: "Samarcanda", country: "Uzbekistan", mood: "Off-the-grid · Cultural", size: "s", img: u("1605649461784-edc01e2b2f4d",  900) },
    { name: "Islanda",    country: "Iceland",    mood: "Wild · Solitude",         size: "s", img: u("1500530855697-b586d89ba3ee",  900) },
    { name: "Alentejo",   country: "Portogallo", mood: "Slow · Pastoral",         size: "s", img: u("1518684079-3c830dcef090",  900) },
    { name: "Oaxaca",     country: "Messico",    mood: "Vibrant · Authentic",     size: "s", img: u("1564507592333-c60657eea523",  900) },
  ],
  matchPhoto: u("1602941525421-8f8b81d3edbb", 1400),
  // Looping aerial ocean clip from Pexels CDN (free license, direct embed
  // allowed). The CSS layers a gradient on top so subtitles stay readable.
  // To swap: drop a .mp4 in client/public/ and change to "/your-file.mp4".
  matchVideo: "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4",
  finalPhotos: [
    { img: u("1505765050516-f72dcac9c60a", 2000), name: "Patagonia",     coords: "50°26'S · 73°15'W" },
    { img: u("1518710843675-2540dd79065c", 2000), name: "Iceland",       coords: "64°08'N · 21°56'W" },
    { img: u("1489493585363-d69421e0edd3", 2000), name: "Sahara",        coords: "31°N · 4°W" },
    { img: u("1538333702852-1ce8a4cd6c54", 2000), name: "Faroe Islands", coords: "62°00'N · 6°47'W" },
  ],
};
