/**
 * AccountRedesign.tsx
 * ───────────────────────────────────────────────────────────────
 * Account v3 — "dossier narrativo" a 5 capitoli (package fornito 29/05),
 * integrato con i DATI REALI già serviti a MyAccount (zero dati finti):
 *
 *   Cap I    Bentornato      hero full-bleed (ultimo aperto)
 *   Cap II   Il tuo ritratto  markup v3 alimentato da /api/me/portrait
 *   Cap III  Da riprendere    continueItems reali (featured + 2 mini)
 *   Cap IV   La collezione    trips reali + search/durata/regione
 *   Cap V    Il tuo atlante   AccountAtlas REALE (Leaflet, /api/me/atlas)
 *   ↳ Settings drawer da destra
 *
 * Sfondo: crossfade ambient sulle foto reali dei viaggi (non statico).
 *
 * Presentational: accetta lo stesso `AccountData` di AccountCinematic, così
 * MyAccount.tsx non cambia il wiring dei dati — basta lo swap del componente.
 * Stili in styles/account-redesign.css, scoped sotto `.account`.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { AccountAtlas } from "./AccountAtlas";
import type { AccountData } from "./AccountCinematic";
import type { PortraitData } from "./AccountPortrait";

const STEP_IDS = ["sec-hero", "sec-reading", "sec-resume", "sec-coll", "sec-atlas"];
const DURATION_FILTERS = ["Tutte", "≤3 giorni", "4–7 giorni", "8+ giorni"];
const REGION_TABS = ["Tutti", "Europa", "Asia", "Africa", "Americhe", "Oceania"];

function confidenceNote(c: PortraitData["confidence"], trips: number): string {
  if (c === "solid") return `Sintetizzato da ${trips} ${trips === 1 ? "viaggio" : "viaggi"}`;
  if (c === "forming") return "Un primo ritratto, che si affina a ogni viaggio";
  return "Stiamo ancora imparando chi sei — più viaggi, più preciso";
}

/* ──────────────── Cap II — Ritratto (dati reali) ──────────────── */
function PortraitReal({ portrait, userName, fallbackQuote }: {
  portrait: PortraitData | null | undefined;
  userName: string;
  fallbackQuote: string;
}) {
  const [open, setOpen] = useState(false);
  const p = portrait;
  const portraitText = p?.narrative?.portrait ?? fallbackQuote;
  const tripCount = p?.tripCount ?? 0;
  const hasSeek = (p?.seek?.length ?? 0) > 0;
  const hasAvoid = (p?.avoid?.length ?? 0) > 0;
  const hasEvo = !!p?.evolution;
  const showDivider = hasSeek || hasAvoid || hasEvo;
  const splitWords = hasSeek && hasAvoid;

  return (
    <div className="portrait">

      {/* ① Ritratto (LOUD) */}
      <div className="portrait-card">
        <div className="portrait-mark">
          <span className="star">❋</span>
          <span>Il tuo ritratto</span>
          <span className="sep" />
          <span className="who">— per {userName}{tripCount > 0 ? `, dopo ${tripCount} ${tripCount === 1 ? "viaggio" : "viaggi"}` : ""}</span>
        </div>
        <p className="portrait-text">{portraitText}</p>

        {p && p.chosen.length > 0 && (
          <div className="portrait-evidence">
            <span className="pin">Da cosa lo deduciamo</span>
            <span className="body">
              Le mete che hai davvero scelto: <em>{p.chosen.map(c => c.name).join(" · ")}</em>.
            </span>
          </div>
        )}

        {p && (
          <div className="portrait-source">
            <div className="left">
              <span className="dot" />
              <span>{confidenceNote(p.confidence, tripCount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ② Paradosso (LOUD, gold) — solo se la narrativa ne ha trovato uno */}
      {p?.narrative?.paradox && (
        <div className="paradox-card">
          <div className="paradox-mark">Il tuo paradosso</div>
          <p className="paradox-text">{p.narrative.paradox}</p>
        </div>
      )}

      {/* ③ Scarto rivelatore — lo trattiamo come "linea" sopra il divisore */}
      {p?.revealed && (
        <div className="paradox-card" style={{ borderColor: "rgba(233,69,96,.3)", background: "linear-gradient(160deg,rgba(233,69,96,.10),rgba(26,14,26,.75))" }}>
          <div className="paradox-mark" style={{ color: "var(--accent)" }}>Lo scarto rivelatore</div>
          <p className="paradox-text">
            A parole cerchi <strong>{p.revealed.saidPole}</strong>, ma scegliendo vai verso <strong>{p.revealed.chosePole}</strong>.
          </p>
        </div>
      )}

      {/* Divisore — da qui sussurra */}
      {showDivider && (
        <div className="portrait-divider"><span>le tue parole, e come cambiano</span></div>
      )}

      {/* ④ Whisper row: cerchi / eviti + evoluzione */}
      {showDivider && (
        <div className="whisper-row">

          {(hasSeek || hasAvoid) && (
            <div className={"whisper-card" + (splitWords ? " split" : "")}>
              {hasSeek && (
                <div className="whisper-col seek">
                  <div className="whisper-mark"><span className="glyph">✓</span> Cosa cerchi</div>
                  {p!.seek.map((w, i) => <div key={i} className="whisper-line">{w}</div>)}
                </div>
              )}
              {hasAvoid && (
                <div className="whisper-col avoid">
                  <div className="whisper-mark"><span className="glyph">×</span> Cosa ti spegne</div>
                  {p!.avoid.map((w, i) => <div key={i} className="whisper-line">{w}</div>)}
                </div>
              )}
            </div>
          )}

          {hasEvo && (
            <div className="whisper-evo">
              <div className="mark">Come stai cambiando</div>
              <p className="line">{p!.evolution!.phrase}</p>
              <div className="tline">
                {p!.evolution!.points.map((pt, i) => (
                  <span key={i} style={{ display: "contents" }}>
                    {i > 0 && <span className="seg" />}
                    <span className={"leg" + (pt.isNow ? " now" : "")}><span className="dot" />{pt.whenLabel}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ⑤ DNA — i 5 assi reali, sotto disclosure */}
      {p && p.axes.length > 0 && (
        <div className="details">
          <button className={"details-toggle" + (open ? " open" : "")} onClick={() => setOpen(!open)}>
            {open ? "Nascondi il tuo DNA di viaggio" : "Vedi i numeri dietro il ritratto"}
            <span className="chev">⌄</span>
          </button>
          {open && (
            <div className="details-panel">
              {p.axes.map(a => (
                <div key={a.axis} className="details-row">
                  <span className="nm">{a.axis}</span>
                  <span className="v"><em>{a.value}</em>/100 · {a.magnitude === "neutro" ? "equilibrio" : a.pole}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ──────────────── Settings Drawer ──────────────── */
function SettingsDrawer({ open, onClose, data }: { open: boolean; onClose: () => void; data: AccountData }) {
  return (
    <>
      <div className={"drawer-overlay" + (open ? " open" : "")} onClick={onClose} />
      <aside className={"drawer" + (open ? " open" : "")}>
        <div className="drawer-head">
          <div className="drawer-head-text">
            <span className="l">Account</span>
            <span className="v">Impostazioni</span>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Chiudi">×</button>
        </div>
        <div className="drawer-body">

          <div className="drawer-group">
            <div className="drawer-group-head">Profilo</div>
            <div className="drawer-row"><span className="lbl">Nome</span><span className="val">{data.userName}</span></div>
            {data.email && <a className="drawer-row" href={"mailto:" + data.email}><span className="lbl">Email</span><span className="val">{data.email}</span></a>}
          </div>

          {data.settings.length > 0 && (
            <div className="drawer-group">
              <div className="drawer-group-head">Preferenze</div>
              {data.settings.map((s, i) => (
                <a key={i} className="drawer-row" href={s.href ?? "#"}>
                  <span className="lbl">{s.label}</span><span className="val">{s.value}</span>
                </a>
              ))}
            </div>
          )}

          <div className="drawer-group">
            <div className="drawer-group-head">Account</div>
            <div className="drawer-danger">
              <button className="drawer-btn-signout" onClick={data.onLogout}>↗ Esci</button>
              <button className="drawer-btn-delete" onClick={data.onDelete}>Elimina account</button>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}

/* ──────────────── App ──────────────── */
export function AccountRedesign({ data }: { data: AccountData }) {
  const [ambientIdx, setAmbientIdx] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState("Tutte");
  const [region, setRegion] = useState("Tutti");
  const [search, setSearch] = useState("");

  // Immagini per il crossfade ambient: le cover reali dei viaggi, fallback hero.
  const ambient = useMemo(() => {
    const imgs = data.trips.map(t => t.img).filter(Boolean);
    const uniq = Array.from(new Set(imgs));
    return uniq.length > 0 ? uniq : [data.heroImg];
  }, [data.trips, data.heroImg]);

  // Ambient crossfade
  useEffect(() => {
    if (ambient.length <= 1) return;
    const t = setInterval(() => setAmbientIdx(i => (i + 1) % ambient.length), 7000);
    return () => clearInterval(t);
  }, [ambient.length]);

  // Step rail segue lo scroll
  useEffect(() => {
    const onScroll = () => {
      let best = 0;
      STEP_IDS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) best = i;
      });
      setActiveStep(best);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function jumpTo(i: number) {
    const el = document.getElementById(STEP_IDS[i]);
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
  }

  const totalDays = useMemo(
    () => data.trips.reduce((acc, t) => acc + (parseInt(t.duration) || 0), 0),
    [data.trips],
  );

  const filteredTrips = useMemo(() => data.trips.filter(t => {
    const dur = parseInt(t.duration);
    if (filter === "≤3 giorni" && dur > 3) return false;
    if (filter === "4–7 giorni" && (dur < 4 || dur > 7)) return false;
    if (filter === "8+ giorni" && dur < 8) return false;
    if (region !== "Tutti" && t.continent !== region) return false;
    if (search && !t.dest.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [data.trips, filter, region, search]);

  const featured = data.continueItems[0];
  const sides = data.continueItems.slice(1, 3);

  return (
    <div className="account">
      {/* Ambient layer — foto reali in crossfade */}
      <div className="ax-bg-stage">
        {ambient.map((src, i) => (
          <div key={src + i} className={"ax-bg-photo" + (ambientIdx === i ? " active" : "")} style={{ backgroundImage: `url(${src})` }} />
        ))}
      </div>
      <div className="ax-grain" />

      {/* Nav */}
      <nav className="nav">
        <a className="brand" href="/"><span className="blogo" />MindRoute</a>
        <div className="nav-r">
          <span className="pill">Italiano</span>
          <button className="nav-profile" onClick={() => setDrawerOpen(true)}>
            <span className="av">{data.avatarInitial ?? data.userName[0]}</span>
            <span className="nm">{data.userName}</span>
          </button>
          <button className="nav-cta" onClick={data.onNewItinerary}>+ Nuovo itinerario</button>
        </div>
      </nav>

      {/* Step rail */}
      <div className="step-rail">
        {["I", "II", "III", "IV", "V"].map((n, i) => (
          <div key={n} className={"step-dot" + (activeStep === i ? " active" : "")} onClick={() => jumpTo(i)}>{n}</div>
        ))}
      </div>

      <div className="stage">

        {/* ════════ Cap I — Hero ════════ */}
        <section id="sec-hero" className="hero">
          <div className="hero-photo" style={{ backgroundImage: `url(${data.heroImg})` }} />
          <div className="hero-content">
            <div className="hero-eyebrow">{data.greeting ?? "Bentornato,"}</div>
            <h1 className="hero-title">{data.userName}, il tuo<br /><em>MindRoute<span className="dot">.</span></em></h1>
            <div className="hero-row">
              <div className="hero-avatar">{data.avatarInitial ?? data.userName[0]}</div>
              <div className="hero-stats">
                {data.heroStats.map((s, i) => (
                  <div key={i} className="hero-stat"><span className="n">{s.value}</span><span className="l">{s.label}</span></div>
                ))}
              </div>
              <div className="hero-actions">
                <button className="btn-primary" onClick={data.onNewItinerary}>+ Nuovo itinerario</button>
                <button className="btn-ghost" onClick={data.onSecondaryCta}>{data.secondaryCtaLabel ?? "↓ Continua a esplorare"}</button>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ Cap II — Il ritratto ════════ */}
        <section id="sec-reading" className="section">
          <div className="container">
            <div className="chapter-head">
              <div>
                <div className="chapter-eyebrow"><span className="num">Capitolo II</span> · il tuo ritratto</div>
                <h2 className="chapter-title">Dopo {data.portrait?.tripCount ?? data.trips.length} {(data.portrait?.tripCount ?? data.trips.length) === 1 ? "viaggio" : "viaggi"},<br />sappiamo <em>chi sei</em>.</h2>
              </div>
              <p className="chapter-sub">Non un punteggio. Un'osservazione, scritta in linguaggio umano, costruita solo su ciò che hai davvero scelto.</p>
            </div>

            <PortraitReal portrait={data.portrait} userName={data.userName} fallbackQuote={data.profileQuote} />
          </div>
        </section>

        {/* ════════ Cap III — Da riprendere ════════ */}
        {featured && (
          <section id="sec-resume" className="section">
            <div className="container">
              <div className="chapter-head">
                <div>
                  <div className="chapter-eyebrow"><span className="num">Capitolo III</span> · da riprendere</div>
                  <h2 className="chapter-title">{data.continueItems.length > 1 ? `${data.continueItems.length} viaggi ti aspettano` : "Un viaggio ti aspetta"}<br /><em>a metà strada</em>.</h2>
                </div>
                <p className="chapter-sub">"Ti eri fermato. La storia non è finita." — gli itinerari aperti, salvati, sospesi.</p>
              </div>

              <div className="resume-grid">
                <a className="resume-main" href={featured.href ?? "#"}>
                  <div className="photo" style={{ backgroundImage: `url(${featured.img})` }} />
                  <div className="resume-content">
                    {featured.date && <div className="resume-badge"><span className="pulse" />Ultimo aperto · {featured.date}</div>}
                    <div className="resume-foot">
                      <h3 className="resume-name">{featured.title}</h3>
                      {featured.quote && <p className="resume-quote">"{featured.quote}"</p>}
                      <div className="resume-actions">
                        <span className="btn-primary">Riprendi il viaggio →</span>
                        <span className="btn-ghost">Esplora un'altra direzione</span>
                      </div>
                    </div>
                  </div>
                </a>

                <div className="resume-side">
                  {sides.map((t, i) => (
                    <a key={i} className="resume-mini" href={t.href ?? "#"}>
                      <div className="photo" style={{ backgroundImage: `url(${t.img})` }} />
                      <div className="mini-content">
                        <div className="arrow">↗</div>
                        <div>
                          {t.sub && <div className="resume-mini-meta">{t.sub}{t.date ? ` · ${t.date}` : ""}</div>}
                          <div className="resume-mini-name">{t.title}</div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ════════ Cap IV — Collezione ════════ */}
        <section id="sec-coll" className="section">
          <div className="container">
            <div className="chapter-head">
              <div>
                <div className="chapter-eyebrow"><span className="num">Capitolo IV</span> · la collezione</div>
                <h2 className="chapter-title">I miei <em>viaggi</em>.</h2>
              </div>
              <p className="chapter-sub"><span style={{ color: "var(--accent)" }}>{data.trips.length} itinerari</span> · oltre {totalDays} giorni di sogno</p>
            </div>

            <div className="coll-bar">
              <div className="coll-search">
                <svg viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <input placeholder="Cerca destinazione…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="coll-filters">
                {DURATION_FILTERS.map(f => (
                  <button key={f} className={"coll-filter" + (filter === f ? " on" : "")} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            <div className="coll-tabs">
              {REGION_TABS.map(r => (
                <button key={r} className={"coll-tab" + (region === r ? " on" : "")} onClick={() => setRegion(r)}>{r}</button>
              ))}
            </div>

            <div className="coll-grid">
              {filteredTrips.map((t, i) => (
                <a key={i} className="coll-card" href={t.href ?? "#"}>
                  <div className="photo" style={{ backgroundImage: `url(${t.img})` }} />
                  <div className="coll-card-content">
                    <div className="coll-card-top">
                      <div className="when">
                        <span>{t.date}</span>
                        <span className="region">{t.continent}</span>
                      </div>
                      <span className="days">{t.duration}</span>
                    </div>
                    <div className="coll-card-bottom">
                      <div className="name">{t.dest}</div>
                      {t.quote && <div className="blurb">"{t.quote}"</div>}
                    </div>
                  </div>
                </a>
              ))}
              {filteredTrips.length === 0 && (
                <div className="coll-empty">Nessun viaggio corrisponde ai filtri attivi.</div>
              )}
            </div>
          </div>
        </section>

        {/* ════════ Cap V — Atlante (mappa Leaflet reale) ════════ */}
        <section id="sec-atlas" className="section">
          {/* AccountAtlas porta i propri stili scoped sotto .account-cinematic */}
          <div className="account-cinematic">
            <AccountAtlas
              data={data.atlas ?? null}
              loading={data.atlasLoading}
              narrative={data.statsNarrative}
              narrativeBold={data.statsBold}
            />
          </div>

          <div className="container">
            <div className="settings-rail">
              <div className="settings-rail-text">
                <span className="l">Impostazioni · gestione</span>
                <span className="v">Tutto pronto. Quando vuoi, puoi uscire o sistemare le preferenze.</span>
              </div>
              <div className="settings-rail-actions">
                <button className="btn-ghost" onClick={() => setDrawerOpen(true)}>Apri impostazioni →</button>
              </div>
            </div>
          </div>
        </section>

      </div>

      <SettingsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} data={data} />
    </div>
  );
}
