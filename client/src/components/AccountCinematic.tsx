/**
 * AccountCinematic.tsx
 * ───────────────────────────────────────────────────────────────
 * Drop-in cinematic redesign della pagina /my-account.
 *
 * Componente puramente presentational: accetta `data: AccountData` e renderizza
 * le 6 sezioni del redesign editoriale. Tutte le fetch, lo stato applicativo
 * (modal, saved moments, trait history, comparison) restano dentro MyAccount.tsx
 * che si occupa di mappare i dati e di renderizzare sezioni custom dopo questa.
 *
 * Stile auto-scoped: tutto sotto `.account-cinematic` o con prefisso `ac-`,
 * niente conflitti con Tailwind o altri componenti.
 * ─────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
import { AccountPortrait, type PortraitData } from "./AccountPortrait";
import { AccountAtlas, type AtlasData } from "./AccountAtlas";

export type Trait = { pct: string; name: string; desc: string; bar: number };
export type ContinueItem = { title: string; quote?: string; sub?: string; date?: string; img: string; featured?: boolean; href?: string };
export type Trip = {
  dest: string; quote: string;
  duration: string;          // "4 giorni"
  date: string;              // "set 2026"
  continent: string;         // "Europa"
  size?: "l" | "m" | "s";    // mosaic size — if omitted, auto-cycles
  img: string;
  href?: string;
  taken?: boolean;           // viaggio EFFETTIVAMENTE fatto (trip_status="confirmed")
};
export type StatCell = { value: string; label: string; sub?: string; goldNum?: boolean };
export type SettingRow = { label: string; value: string; href?: string };

export type AccountData = {
  userName: string;            // "Lorenzo"
  greeting?: string;           // default: "Bentornato,"
  email: string;
  avatarInitial?: string;      // default: userName[0]
  heroImg: string;             // last opened trip cover
  heroStats: Array<{ value: string; label: string }>; // 4 inline
  profileQuote: string;        // long quote with possible {emWord}
  emWord?: string;             // word/phrase to italicize accent inside profileQuote
  profileByline: string;       // "Distillato dai tuoi 9 viaggi · ..."
  traits: Trait[];
  // Capitolo II bottom-up dal real-data endpoint (/api/me/portrait). Quando
  // presente sostituisce la vecchia sezione "profilo viaggiatore"; quando
  // assente (anonimo / nessun segnale) si ricade sul profilo semplice.
  portrait?: PortraitData | null;
  continueItems: ContinueItem[]; // first one is featured
  trips: Trip[];
  stats: StatCell[];           // 4 cells in the novelistic stats section (fallback)
  statsNarrative: string;      // long sentence with possible <strong></strong> patterns via {bold: string[]}
  statsBold?: string[];        // words to wrap in <strong>
  // Capitolo V "Atlante" — mappa Leaflet con i luoghi reali (/api/me/atlas).
  // Quando wired sostituisce la sezione stats; atlasLoading copre il geocoding.
  atlas?: AtlasData | null;
  atlasLoading?: boolean;
  // Momenti "cuorati" (Ondata B) — usati dalla vista Riprendi del dashboard
  // per il pannello "Da non perdere" del viaggio in evidenza. Opzionale:
  // AccountCinematic non li renderizza.
  savedMoments?: Array<{
    itineraryId: number;
    momentSnapshot: { title: string; image_url: string | null; location_name: string | null } | null;
  }>;
  settings: SettingRow[];      // 3-9 settings rows
  onNewItinerary?: () => void;
  onSecondaryCta?: () => void; // bottone ghost hero (es. "Genera dal profilo" o scroll-to-collection)
  // Daily Compass: una card "growth" accettata pre-compila l'override del
  // modal "Genera dal profilo" con il testo della sfida.
  onChallenge?: (challenge: string) => void;
  secondaryCtaLabel?: string;  // default: "↓ Continua a esplorare"
  onLogout?: () => void;
  onDelete?: () => void;
};

const DEFAULT_GREETING = "Bentornato,";
const MOSAIC_SIZES: Array<"l" | "m" | "s"> = ["l", "m", "s", "m", "s", "l", "m", "s"];

// Duration / region filter keys (language-neutral, stored in state)
type DurFilter = "all" | "short" | "medium" | "long";
type RegFilter = "all" | "europe" | "asia" | "africa" | "americas" | "oceania";

// Continent value stored on Trip objects (server-side, always Italian)
const CONTINENT_VALUES: Record<Exclude<RegFilter, "all">, string> = {
  europe:   "Europa",
  asia:     "Asia",
  africa:   "Africa",
  americas: "Americhe",
  oceania:  "Oceania",
};

export function AccountCinematic({ data }: { data: AccountData }) {
  const { t } = useI18n();

  const DUR_FILTERS: Array<{ key: DurFilter; label: string }> = [
    { key: "all",    label: t("acin.filter.all")    },
    { key: "short",  label: t("acin.filter.short")  },
    { key: "medium", label: t("acin.filter.medium") },
    { key: "long",   label: t("acin.filter.long")   },
  ];

  const REG_FILTERS: Array<{ key: RegFilter; label: string }> = [
    { key: "all",      label: t("acin.region.all")      },
    { key: "europe",   label: t("acin.region.europe")   },
    { key: "asia",     label: t("acin.region.asia")     },
    { key: "africa",   label: t("acin.region.africa")   },
    { key: "americas", label: t("acin.region.americas") },
    { key: "oceania",  label: t("acin.region.oceania")  },
  ];

  const [filter, setFilter] = useState<DurFilter>("all");
  const [continent, setContinent] = useState<RegFilter>("all");
  const [search, setSearch] = useState("");

  // Right-size background-images per viewport (same rationale as the landing):
  // these are CSS backgrounds of Unsplash photos, often stored at full res. On a
  // phone that's why they "faticano a caricare". Cap width, smaller on mobile.
  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);
  const heroW = isMobile ? 900 : 1600;   // full-bleed hero
  const cardW = isMobile ? 560 : 760;    // featured / side / mosaic cards

  const totalDays = useMemo(() => data.trips.reduce((acc, trip) => acc + (parseInt(trip.duration) || 0), 0), [data.trips]);

  const filtered = useMemo(() => {
    const continentVal = continent !== "all" ? CONTINENT_VALUES[continent] : null;
    return data.trips.filter(trip => {
      const dur = parseInt(trip.duration);
      if (filter === "short"  && dur > 3) return false;
      if (filter === "medium" && (dur < 4 || dur > 7)) return false;
      if (filter === "long"   && dur < 8) return false;
      if (continentVal && trip.continent !== continentVal) return false;
      if (search && !trip.dest.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data.trips, filter, continent, search]);

  const featured = data.continueItems[0];
  const sides = data.continueItems.slice(1, 3);

  // Replace emWord in profileQuote → JSX with italic accent
  const profileQuoteNode = data.emWord && data.profileQuote.includes(data.emWord)
    ? (() => {
        const [before, after] = data.profileQuote.split(data.emWord!);
        return <>{before}<em>{data.emWord}</em>{after}</>;
      })()
    : data.profileQuote;

  // Bold words inside statsNarrative
  const narrativeNode = (() => {
    if (!data.statsBold || data.statsBold.length === 0) return data.statsNarrative;
    const parts: Array<string | JSX.Element> = [data.statsNarrative];
    data.statsBold.forEach((bold, i) => {
      const out: typeof parts = [];
      parts.forEach(part => {
        if (typeof part !== "string") { out.push(part); return; }
        const split = part.split(bold);
        split.forEach((s, j) => {
          out.push(s);
          if (j < split.length - 1) out.push(<strong key={`${i}-${j}`}>{bold}</strong>);
        });
      });
      parts.length = 0; parts.push(...out);
    });
    return parts;
  })();

  return (
    <div className="account-cinematic stage">

      {/* ① HERO PERSONALE */}
      <section className="ac-hero">
        <div className="ac-hero-img" style={{ backgroundImage: `linear-gradient(to top, rgba(10,7,16,1) 0%, rgba(10,7,16,.55) 35%, rgba(10,7,16,.25) 70%, rgba(10,7,16,.55) 100%), radial-gradient(ellipse 40% 60% at 20% 50%, rgba(212,168,83,.25), transparent 70%), url(${unsplashSized(data.heroImg, heroW, 72)})` }} />
        <div className="ac-hero-content">
          <div className="ac-hero-avatar">{data.avatarInitial ?? data.userName[0]}</div>
          <div>
            <div className="ac-hero-greeting">{data.greeting ?? DEFAULT_GREETING}</div>
            <h1>{data.userName}{t("acin.hero.titlePre")}<br /><em>{t("acin.hero.titleEm")}</em></h1>
            <div className="ac-hero-stats-inline">
              {data.heroStats.map((s, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
                  {i > 0 && <span className="ac-sep" />}
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </span>
              ))}
            </div>
            <div className="ac-hero-actions">
              <button className="ac-btn-primary" onClick={data.onNewItinerary}>{t("acct.hero.newItin")}</button>
              <button className="ac-btn-ghost" onClick={data.onSecondaryCta}>{data.secondaryCtaLabel ?? t("acct.cta.exploreMore")}</button>
            </div>
          </div>
        </div>
      </section>

      {/* ② IL TUO RITRATTO (bottom-up, dati reali) — fallback al profilo
            semplice quando l'endpoint non ha segnale. */}
      {data.portrait?.available ? (
        <AccountPortrait
          data={data.portrait}
          userName={data.userName}
          fallbackQuote={data.profileQuote}
        />
      ) : (
      <section className="ac-profile">
        <div className="ac-container">
          <div className="ac-profile-grid">
            <div>
              <div className="ac-eyebrow"><span className="d" />{t("acin.profile.eyebrow")}</div>
              <p className="ac-profile-quote">{profileQuoteNode}</p>
              <div className="ac-profile-byline">
                <div className="ac-profile-byline-ic" />
                <div className="ac-profile-byline-text" dangerouslySetInnerHTML={{ __html: data.profileByline }} />
              </div>
            </div>
            <div>
              <div className="ac-traits-head">{t("acin.profile.traitsHead")}</div>
              <div className="ac-traits">
                {data.traits.map((tr, i) => (
                  <div key={i} className="ac-trait">
                    <div className="ac-trait-pct">{tr.pct}</div>
                    <div>
                      <div className="ac-trait-name">{tr.name}</div>
                      <div className="ac-trait-desc">{tr.desc}</div>
                    </div>
                    <div className="ac-trait-bar"><div className="ac-trait-bar-fill" style={{ width: tr.bar + "%" }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ③ CONTINUA */}
      {featured && (
        <section className="ac-continue">
          <div className="ac-container">
            <div className="ac-continue-head">
              <div>
                <div className="ac-eyebrow"><span className="d" />{t("acin.cap3.eyebrow")}</div>
                <h2>
                  {data.continueItems.length > 1
                    ? t("acin.cap3.title.many").replace("{n}", String(data.continueItems.length))
                    : t("acin.cap3.title.one")}
                  <br /><em>{t("acin.cap3.titleEm")}</em>
                </h2>
              </div>
              <p className="ac-continue-sub">{t("acin.cap3.sub")}</p>
            </div>
            <div className="ac-continue-grid">
              <a className="ac-cont-featured" href={featured.href ?? "#"}>
                <div className="ac-cont-featured-img" style={{ backgroundImage: `url(${unsplashSized(featured.img, cardW)})` }} />
                <div className="ac-cont-featured-body">
                  {featured.date && (
                    <div className="ac-cont-featured-tag">
                      <span className="ac-pulse" />{t("acin.cap3.lastOpened").replace("{date}", featured.date)}
                    </div>
                  )}
                  <h3>{featured.title}</h3>
                  {featured.quote && <p className="ac-cont-featured-quote">"{featured.quote}"</p>}
                  <div className="ac-cont-featured-actions">
                    <span className="ac-btn-primary">{t("acin.cap3.resume")}</span>
                    <span className="ac-btn-ghost">{t("acin.cap3.exploreOther")}</span>
                  </div>
                </div>
              </a>
              <div className="ac-cont-sides">
                {sides.map((c, i) => (
                  <a key={i} className="ac-cont-side" href={c.href ?? "#"}>
                    <div className="ac-cont-side-img" style={{ backgroundImage: `url(${unsplashSized(c.img, cardW)})` }} />
                    <div className="ac-cont-side-arr">↗</div>
                    <div className="ac-cont-side-body">
                      {c.sub && <div className="ac-cont-side-eyebrow">{c.sub}</div>}
                      <div className="ac-cont-side-title">{c.title}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ④ COLLEZIONE */}
      <section className="ac-collection" id="ac-collection">
        <div className="ac-container">
          <div className="ac-col-head">
            <div>
              <div className="ac-eyebrow"><span className="d" />{t("acin.cap4.eyebrow")}</div>
              <h2 dangerouslySetInnerHTML={{ __html: t("acct.cap4.title") }} />
            </div>
            <div className="ac-col-head-meta">
              <strong>{data.trips.length}</strong>{" "}
              {t("acin.cap4.itineraries")} {t("acin.cap4.subDays").replace("{n}", String(totalDays))}
            </div>
          </div>

          <div className="ac-col-filters">
            <div className="ac-col-search">
              <span>⌕</span>
              <input
                placeholder={t("acin.cap4.searchPlaceholder")}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="ac-col-divider" />
            <div className="ac-col-tags">
              {DUR_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={"ac-col-tag" + (filter === f.key ? " active" : "")}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="ac-col-divider" />
            <div className="ac-col-tags">
              {REG_FILTERS.map(r => (
                <button
                  key={r.key}
                  className={"ac-col-tag" + (continent === r.key ? " active" : "")}
                  onClick={() => setContinent(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ac-col-mosaic">
            {filtered.map((trip, i) => {
              const size = trip.size ?? MOSAIC_SIZES[i % MOSAIC_SIZES.length];
              return (
                <a key={i} className={"ac-col-card size-" + size} href={trip.href ?? "#"}>
                  <div className="ac-col-card-img" style={{ backgroundImage: `url(${unsplashSized(trip.img, cardW)})` }} />
                  <div className="ac-col-action">{t("acin.cap4.cardOpen")}</div>
                  <div className="ac-col-card-body">
                    <div className="ac-col-card-eyebrow">
                      <span>{trip.date}</span><span>·</span><span>{trip.continent}</span><span className="duration">{trip.duration}</span>
                    </div>
                    <div className="ac-col-card-title">{trip.dest}</div>
                    <div className="ac-col-card-quote">"{trip.quote}"</div>
                  </div>
                </a>
              );
            })}
            {filtered.length === 0 && (
              <div className="ac-col-empty">{t("acin.cap4.empty")}</div>
            )}
          </div>
        </div>
      </section>

      {/* ⑤ ATLANTE (mappa reale) — fallback alle stats novelistic se non wired */}
      {(data.atlas !== undefined || data.atlasLoading) ? (
        <AccountAtlas
          data={data.atlas ?? null}
          loading={data.atlasLoading}
          narrative={data.statsNarrative}
          narrativeBold={data.statsBold}
        />
      ) : (
      <section className="ac-stats-novel">
        <div className="ac-container">
          <div className="ac-stats-intro">
            <div className="ac-eyebrow gold"><span className="d" />{t("acin.stats.eyebrow")}</div>
            <h2 dangerouslySetInnerHTML={{ __html: t("acin.stats.title").replace("{n}", String(totalDays)) }} />
            <p className="ac-stats-sub">{t("acin.stats.sub")}</p>
          </div>

          <div className="ac-stats-novel-grid">
            {data.stats.map((s, i) => (
              <div key={i} className="ac-stats-novel-cell">
                <div className="ac-stats-novel-v">{s.goldNum ? <em>{s.value}</em> : s.value}</div>
                <div className="ac-stats-novel-l">{s.label}</div>
                {s.sub && <div className="ac-stats-novel-sub">{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="ac-stats-narrative">
            <p>"{narrativeNode}"</p>
          </div>
        </div>
      </section>
      )}

      {/* ⑥ SETTINGS */}
      <section className="ac-settings">
        <div className="ac-container">
          <div className="ac-eyebrow" style={{ marginBottom: 32 }}><span className="d" />{t("acin.settings.eyebrow")}</div>
          <div className="ac-settings-grid">
            {data.settings.map((s, i) => (
              <a key={i} className="ac-set-row" href={s.href ?? "#"}>
                <span className="ac-set-label">{s.label}</span>
                <span className="ac-set-value">{s.value}</span>
              </a>
            ))}
            <a className="ac-set-row" href={"mailto:" + data.email}>
              <span className="ac-set-label">{t("acin.settings.emailLabel")}</span>
              <span className="ac-set-value">{data.email}</span>
            </a>
          </div>
          <div className="ac-danger-row">
            <div className="ac-danger-left">{t("acin.settings.dangerText")}</div>
            <div className="ac-danger-actions">
              <button className="ac-danger-btn logout" onClick={data.onLogout}>{t("acin.settings.logout")}</button>
              <button className="ac-danger-btn delete" onClick={data.onDelete}>{t("acin.settings.delete")}</button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
