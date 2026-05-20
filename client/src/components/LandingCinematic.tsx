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

export type HeroPhoto = { img: string; name: string; country: string; mood: string };
export type Step = { n: number; tag: string; title: string; desc: string; img: string };
export type Destination = { name: string; country: string; mood: string; size?: "l" | "s"; img: string };
export type FinalPhoto = { img: string; name: string; coords: string };

export type LandingData = {
  heroPhotos: HeroPhoto[];          // 4-5 cinematic destinations
  marquee: string[];                // destination names for ticker
  manifestoBg: string;              // full-bleed photo url
  steps: Step[];                    // 3 photo cards
  destinations: Destination[];      // 5 mosaic items
  matchPhoto: string;               // photo shown in product preview
  finalPhotos: FinalPhoto[];        // 3-5 closing crossfade photos
  onStart?: () => void;             // CTA handler
};

export function LandingCinematic({ data }: { data: LandingData }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [finalIdx, setFinalIdx] = useState(0);

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

  // Preload — decode hero + final photos in the background so the crossfade
  // never shows a blank/black flash. Browsers cache the bytes; second paint is
  // instant. Limited to hero+final because those are the slots that auto-cycle;
  // steps/destinations are static so the browser already lazy-loads them.
  useEffect(() => {
    const toPreload = [...data.heroPhotos.map(p => p.img), ...data.finalPhotos.map(p => p.img)];
    toPreload.forEach(src => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
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

      {/* ① HERO */}
      <section className="lc-hero" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
        <div className="lc-hero-bg">
          {data.heroPhotos.map((p, i) => (
            <div key={i} className={"lc-hero-photo" + (heroIdx === i ? " active" : "")} style={{ backgroundImage: `url(${p.img})` }} />
          ))}
          <div className="lc-hero-overlay" />
          <div className="lc-hero-grain" data-parallax="0.05" />
        </div>

        <div className="lc-hero-content">
          <div className="lc-hero-left">
            <div className="lc-hero-eyebrow"><div className="lc-eyebrow white"><span className="d" />AI-powered travel profiling</div></div>
            <h1>
              <span className="word w1">Travel starts</span><br />
              <span className="word w2">with </span><span className="word w3">who you are.</span>
            </h1>
            <p className="lc-hero-tag">Every trip starts from an emotion. MindRoute turns it into a real place — destination, itinerary, and bookings ready in under 3 minutes.</p>
            <div className="lc-hero-actions">
              <button className="lc-btn-primary lg" onClick={data.onStart}>Discover your trip →</button>
              <div className="lc-hero-counter"><strong>17</strong>itineraries already imagined</div>
            </div>
          </div>

          <div className="lc-hero-thumbs">
            <div className="lc-hero-thumbs-head">
              <span>Featured destinations</span>
              <span className="num">{(heroIdx + 1).toString().padStart(2, "0")} / {data.heroPhotos.length.toString().padStart(2, "0")}</span>
            </div>
            {data.heroPhotos.map((p, i) => (
              <div key={i} className={"lc-hero-thumb" + (heroIdx === i ? " active" : "")} onClick={() => setHeroIdx(i)}>
                <div className="lc-hero-thumb-img" style={{ backgroundImage: `url(${p.img})` }} />
                <div className="lc-hero-thumb-body">
                  <div className="lc-hero-thumb-name">{p.name}</div>
                  <div className="lc-hero-thumb-meta">{p.country} · {p.mood}</div>
                </div>
                <div className="lc-hero-thumb-progress" key={"p-" + heroIdx + "-" + i} />
              </div>
            ))}
          </div>
        </div>

        <div className="lc-hero-scroll">
          <span>Scroll</span>
          <span className="line" />
        </div>
      </section>

      {/* ② MARQUEE */}
      <section className="lc-marquee">
        <div className="lc-marquee-track" data-parallax="0.1">
          {[...data.marquee, ...data.marquee].map((c, i) => (
            <div key={i} className="lc-marquee-item"><span className="dot" />{c}</div>
          ))}
        </div>
      </section>

      {/* ③ MANIFESTO */}
      <section className="lc-manifesto">
        <div className="lc-manifesto-bg" style={{ backgroundImage: `url(${data.manifestoBg})` }} data-parallax="0.15" data-parallax-scroll="1" />
        <div className="lc-manifesto-content">
          <div className="lc-manifesto-eyebrow"><div className="lc-eyebrow white"><span className="d" />Why MindRoute</div></div>
          <p className="lc-manifesto-quote">The destination is<br />the answer. You are<br /><em>the question.</em></p>
          <p className="lc-manifesto-sub">Most travel planners show you options. MindRoute removes the doubt — starting from how you feel, not from a map.</p>
        </div>
      </section>

      {/* ④ HOW IT WORKS */}
      <section className="lc-how">
        <div className="lc-container">
          <div className="lc-how-head">
            <div className="lc-eyebrow" style={{ justifyContent: "center" }}><span className="d" />How it works</div>
            <h2>Your story,<br /><em>in three acts.</em></h2>
            <p className="lc-sub">Three minutes, three steps. From the silence of Reykjavik to the heat of Marrakech — your next chapter, ready to be lived.</p>
          </div>
          <div className="lc-steps">
            {data.steps.map(s => (
              <div key={s.n} className="lc-step">
                <div className="lc-step-img" style={{ backgroundImage: `url(${s.img})` }} />
                <div className="lc-step-num">{s.n}</div>
                <div className="lc-step-body">
                  <div className="lc-step-tag">{s.tag}</div>
                  <div className="lc-step-title">{s.title}</div>
                  <div className="lc-step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ DESTINATIONS */}
      <section className="lc-destinations">
        <div className="lc-container">
          <div className="lc-dest-head">
            <div className="lc-eyebrow" style={{ justifyContent: "center" }}><span className="d" />Anywhere in the world</div>
            <h2>From quiet to wild,<br /><em>your kind of place.</em></h2>
            <p className="lc-sub">Five examples from real itineraries already generated. Yours will look different — chosen for you.</p>
          </div>
          <div className="lc-dest-mosaic">
            {data.destinations.map((d, i) => (
              <div key={i} className={"lc-dest-card size-" + (d.size || "s")}>
                <div className="lc-dest-card-img" style={{ backgroundImage: `url(${d.img})` }} />
                <div className="lc-dest-card-body">
                  <span className="lc-dest-card-mood">{d.mood}</span>
                  <div className="lc-dest-card-name">{d.name}</div>
                  <div className="lc-dest-card-country">{d.country}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ PRODUCT PREVIEW — Cinematic Split (V2 only) */}
      <section className="lc-preview">
        <div className="lc-container">
          <div className="lc-preview-head">
            <div className="lc-eyebrow" style={{ justifyContent: "center" }}><span className="d" />What you get</div>
            <h2>Not a list.<br /><em>A diagnosis.</em></h2>
          </div>

          <div className="lc-split-stage">
            <div className="lc-split-left">
              <div className="lc-split-left-head">Your answers</div>

              <div className="lc-split-block">
                <div className="lc-split-q">How do you want to feel?</div>
                <div className="lc-split-options">
                  <span className="lc-split-opt">Wild</span>
                  <span className="lc-split-opt on">Quiet</span>
                  <span className="lc-split-opt">Chaotic</span>
                  <span className="lc-split-opt on">Regenerating</span>
                  <span className="lc-split-opt">Festive</span>
                </div>
              </div>

              <div className="lc-split-block">
                <div className="lc-split-q">What do you need?</div>
                <div className="lc-split-options">
                  <span className="lc-split-opt on">Disconnect</span>
                  <span className="lc-split-opt">Feel alive</span>
                  <span className="lc-split-opt on">Slow down</span>
                  <span className="lc-split-opt">Be surprised</span>
                </div>
              </div>

              <div className="lc-split-block">
                <div className="lc-split-q">What do you avoid?</div>
                <div className="lc-split-options">
                  <span className="lc-split-opt on">Crowded places</span>
                  <span className="lc-split-opt">Resorts</span>
                  <span className="lc-split-opt on">Strict schedules</span>
                </div>
              </div>
            </div>

            <div className="lc-split-right">
              <div className="lc-split-photo" style={{ backgroundImage: `url(${data.matchPhoto})` }} />
              <div className="lc-split-photo-overlay">
                <div className="lc-split-tag"><span className="pulse" />Your match · Profile 1 of 3</div>
                <h3 className="lc-split-name"><em>Ikaria</em></h3>
                <div className="lc-split-country">Greece · Aegean Sea</div>
                <p className="lc-split-quote">"You chose <em>quiet</em> and <em>disconnect</em> — signals that you need a reset, not just a vacation. Ikaria is the island where bars open at midnight and time stops making sense."</p>
                <div className="lc-split-meta">
                  <div className="lc-split-match">
                    <div className="lc-split-match-pct">94<sup>%</sup></div>
                    <div className="lc-split-match-lbl">Psychological match</div>
                  </div>
                  <button className="lc-split-cta">See itinerary →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ⑦ METHOD — editorial line */}
      <section className="lc-method">
        <div className="lc-container">
          <div className="lc-eyebrow lc-method-eye"><span className="d" />The method</div>
          <h2 className="lc-method-title">Not magic. <em>A method.</em></h2>
          <div className="lc-method-line">
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">7</div>
              <div className="lc-method-cell-l">Dimensions</div>
              <div className="lc-method-cell-d">Emotions mapped, not destinations listed.</div>
            </div>
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">3</div>
              <div className="lc-method-cell-l">Archetypes</div>
              <div className="lc-method-cell-d">Quiet · Wild · Authentic.</div>
            </div>
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">4</div>
              <div className="lc-method-cell-l">Chapters / day</div>
              <div className="lc-method-cell-d">Arrival, immersion, defining, departure.</div>
            </div>
            <div className="lc-method-cell">
              <div className="lc-method-cell-n">∞</div>
              <div className="lc-method-cell-l">Bookings</div>
              <div className="lc-method-cell-d">Flights, stays, experiences — one place.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ⑧ FINAL CTA — cinematic closure */}
      <section className="lc-final">
        <div className="lc-final-bg">
          {data.finalPhotos.map((p, i) => (
            <div key={i} className={"lc-final-photo" + (finalIdx === i ? " active" : "")} style={{ backgroundImage: `url(${p.img})` }} />
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
          <strong>Now showing</strong>
          <span>{data.finalPhotos[finalIdx].name} · {data.finalPhotos[finalIdx].coords}</span>
        </div>
        <div className="lc-final-content">
          <div className="lc-eyebrow lc-final-eyebrow"><span className="d" />Your turn</div>
          <h2 className="lc-final-quote">Stop forcing the destination.<em>Start listening.</em></h2>
          <p className="lc-final-sub">Answer 7 questions. Get your destination, itinerary, and bookings — in under 3 minutes.</p>
          <div className="lc-final-cta">
            <button className="lc-btn-primary huge" onClick={data.onStart}>Discover your trip →</button>
            <div className="lc-final-reassure">
              <span><span className="check">✓</span> Free to start</span>
              <span className="sep" />
              <span><span className="check">✓</span> Bookings integrated</span>
              <span className="sep" />
              <span><span className="check">✓</span> 3 minutes</span>
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
  marquee: [
    "Tokyo", "Reykjavik", "Lofoten", "Procida", "Bali", "Patagonia",
    "Lisbon", "Kyoto", "Faroe Islands", "Oaxaca", "Sicily", "Hanoi",
    "Cairo", "Cape Town", "Lima", "Marrakech", "Samarkand", "Buenos Aires",
  ],
  manifestoBg: u("1469854523086-cc02fe5d8800", 2000),
  steps: [
    { n: 1, tag: "Step 1", title: "Answer 7 questions", desc: "Not about places — about you. How do you want to feel? What do you need? What do you avoid?", img: u("1455390582262-044cdead277a", 1200) },
    { n: 2, tag: "Step 2", title: "Get your match",     desc: "Three destinations chosen by feeling, not by algorithm. Each one tells you why it's yours.",   img: u("1524661135-423995f22d0b",  1200) },
    { n: 3, tag: "Step 3", title: "Book the whole trip",desc: "Flights, stays, experiences. All ready, all in one place. No more jumping between ten sites.", img: u("1488646953014-85cb44e25828", 1200) },
  ],
  destinations: [
    { name: "Azzorre",    country: "Portogallo", mood: "Quiet · Volcanic",        size: "l", img: u("1586671267731-da2cf3ceeb80", 1400) },
    { name: "Samarcanda", country: "Uzbekistan", mood: "Off-the-grid · Cultural", size: "s", img: u("1605649461784-edc01e2b2f4d",  900) },
    { name: "Islanda",    country: "Iceland",    mood: "Wild · Solitude",         size: "s", img: u("1500530855697-b586d89ba3ee",  900) },
    { name: "Alentejo",   country: "Portogallo", mood: "Slow · Pastoral",         size: "s", img: u("1568797629192-908a1c11ca80",  900) },
    { name: "Oaxaca",     country: "Messico",    mood: "Vibrant · Authentic",     size: "s", img: u("1564507592333-c60657eea523",  900) },
  ],
  matchPhoto: u("1602941525421-8f8b81d3edbb", 1400),
  finalPhotos: [
    { img: u("1505765050516-f72dcac9c60a", 2000), name: "Patagonia",     coords: "50°26'S · 73°15'W" },
    { img: u("1518710843675-2540dd79065c", 2000), name: "Iceland",       coords: "64°08'N · 21°56'W" },
    { img: u("1489493585363-d69421e0edd3", 2000), name: "Sahara",        coords: "31°N · 4°W" },
    { img: u("1538333702852-1ce8a4cd6c54", 2000), name: "Faroe Islands", coords: "62°00'N · 6°47'W" },
  ],
};
