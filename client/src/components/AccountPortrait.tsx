/**
 * AccountPortrait.tsx
 * ───────────────────────────────────────────────────────────────
 * Capitolo II della pagina account — "Il tuo ritratto", costruito BOTTOM-UP
 * dai dati reali serviti da GET /api/me/portrait.
 *
 * Ogni blocco è grounded:
 *   - Ritratto / Paradosso → narrativa Haiku, vincolata ai soli fatti veri
 *   - Lo scarto rivelatore  → divergenza quiz↔scelta reale
 *   - Le tue parole         → chip verbatim che l'utente ha selezionato
 *   - Come stai cambiando   → evoluzione nel tempo (solo con ≥3 snapshot)
 *   - DNA                   → i 5 assi reali del trait engine
 *
 * Presentational: nessuna fetch qui. Stili in styles/account-portrait.css,
 * scoped sotto `.account-cinematic` con prefisso `.ac-pt-`.
 * ─────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export type AxisMagnitude = "neutro" | "lieve" | "chiaro" | "forte";

export interface PortraitAxis {
  axis: string;
  value: number;        // 0-100
  poleLeft: string;
  poleRight: string;
  pole: string;         // "" when neutral
  magnitude: AxisMagnitude;
}

export interface PortraitData {
  available: boolean;
  confidence: "nascent" | "forming" | "solid";
  tripCount: number;
  snapshotCount: number;
  seek: string[];
  avoid: string[];
  ownWords: string | null;
  axes: PortraitAxis[];
  chosen: Array<{ name: string; date: string | null }>;
  counts: { destinations: number; days: number; continents: number };
  revealed: { saidPole: string; chosePole: string; theme: string } | null;
  evolution: { phrase: string; points: Array<{ whenLabel: string; isNow: boolean }> } | null;
  narrative: { portrait: string; paradox: string | null } | null;
}

export function AccountPortrait({
  data,
  userName,
  fallbackQuote,
}: {
  data: PortraitData;
  userName: string;
  fallbackQuote?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const portraitText = data.narrative?.portrait ?? fallbackQuote ?? null;
  const hasWords = data.seek.length > 0 || data.avoid.length > 0;
  const splitWords = data.seek.length > 0 && data.avoid.length > 0;

  const confidenceNote =
    data.confidence === "solid" ? t("acin.pt.conf.solid").replace("{n}", String(data.tripCount))
    : data.confidence === "forming" ? t("acin.pt.conf.forming")
    : t("acin.pt.conf.nascent");

  return (
    <section className="ac-portrait-sec" id="ac-portrait">
      <div className="ac-container">

        {/* chapter head */}
        <div className="ac-pt-head">
          <div>
            <div className="ac-eyebrow"><span className="d" />{t("acin.pt.eyebrow")}</div>
            <h2 className="ac-pt-title">{(data.tripCount === 1 ? t("acin.pt.title.one") : t("acin.pt.title.many")).replace("{n}", String(data.tripCount))}<br />{t("acin.pt.title2pre")}<em>{t("acin.pt.title2em")}</em>.</h2>
          </div>
          <p className="ac-pt-sub">{t("acin.pt.sub")}</p>
        </div>

        {/* ① Ritratto (LOUD) */}
        {portraitText && (
          <div className="ac-pt-card">
            <div className="ac-pt-mark">
              <span className="star">❋</span>
              <span>{t("acin.pt.mark")}</span>
              <span className="sep" />
              <span className="who">{(data.tripCount === 1 ? t("acin.pt.who.one") : t("acin.pt.who.many")).replace("{name}", userName).replace("{n}", String(data.tripCount))}</span>
            </div>
            <p className="ac-pt-text">{portraitText}</p>

            {data.chosen.length > 0 && (
              <div className="ac-pt-evidence">
                <span className="pin">{t("acin.pt.evidencePin")}</span>
                <span className="body">
                  {t("acin.pt.evidenceBody").replace("{list}", data.chosen.map(c => c.name).join(" · "))}
                </span>
              </div>
            )}

            <div className="ac-pt-source">
              <span className="dot" />
              <span>{confidenceNote}</span>
            </div>
          </div>
        )}

        {/* ② Paradosso (LOUD, gold) — solo se la narrativa ne ha trovato uno */}
        {data.narrative?.paradox && (
          <div className="ac-pt-paradox">
            <div className="ac-pt-paradox-mark">{t("acin.pt.paradoxMark")}</div>
            <p className="ac-pt-paradox-text">{data.narrative.paradox}</p>
          </div>
        )}

        {/* ③ Lo scarto rivelatore */}
        {data.revealed && (
          <div className="ac-pt-revealed">
            <div className="ac-pt-revealed-mark">{t("acin.pt.revealedMark")}</div>
            <p className="ac-pt-revealed-text">
              {t("acin.pt.revealedPre")}<em>{data.revealed.saidPole}</em>{t("acin.pt.revealedMid")}<strong>{data.revealed.chosePole}</strong>.
            </p>
          </div>
        )}

        {(hasWords || data.evolution) && (
          <div className="ac-pt-divider"><span>{t("acin.pt.divider")}</span></div>
        )}

        <div className="ac-pt-row">

          {/* ④ Le tue parole — verbatim */}
          {hasWords && (
            <div className={"ac-pt-words" + (splitWords ? " split" : "")}>
              {data.seek.length > 0 && (
                <div className="ac-pt-words-col seek">
                  <div className="ac-pt-words-mark"><span className="glyph">✓</span> {t("acin.pt.seekMark")}</div>
                  {data.seek.map((w, i) => <div key={i} className="ac-pt-words-line">{w}</div>)}
                </div>
              )}
              {data.avoid.length > 0 && (
                <div className="ac-pt-words-col avoid">
                  <div className="ac-pt-words-mark"><span className="glyph">×</span> {t("acin.pt.avoidMark")}</div>
                  {data.avoid.map((w, i) => <div key={i} className="ac-pt-words-line">{w}</div>)}
                </div>
              )}
              {data.ownWords && (
                <div className="ac-pt-ownwords">
                  <span className="q">{t("acin.pt.ownWords")}</span>
                  <span className="t">"{data.ownWords}"</span>
                </div>
              )}
            </div>
          )}

          {/* ⑤ Come stai cambiando */}
          {data.evolution && (
            <div className="ac-pt-evo">
              <div className="mark">{t("acin.pt.evoMark")}</div>
              <p className="line">{data.evolution.phrase}</p>
              <div className="tline">
                {data.evolution.points.map((p, i) => (
                  <span key={i} style={{ display: "contents" }}>
                    {i > 0 && <span className="seg" />}
                    <span className={"leg" + (p.isNow ? " now" : "")}><span className="dot" />{p.whenLabel}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ⑥ DNA — i 5 assi reali */}
        {data.axes.length > 0 && (
          <div className="ac-pt-details">
            <button className={"ac-pt-toggle" + (open ? " open" : "")} onClick={() => setOpen(!open)}>
              {open ? t("acin.pt.dnaHide") : t("acin.pt.dnaShow")}
              <span className="chev">⌄</span>
            </button>
            {open && (
              <div className="ac-pt-axes">
                {data.axes.map(a => (
                  <div key={a.axis} className={"ac-pt-axis" + (a.magnitude === "neutro" ? " neutral" : "")}>
                    <div className="ac-pt-axis-poles">
                      <span className={a.value < 50 ? "on" : ""}>{a.poleLeft}</span>
                      <span className={a.value >= 50 ? "on" : ""}>{a.poleRight}</span>
                    </div>
                    <div className="ac-pt-axis-track">
                      <div className="ac-pt-axis-dot" style={{ left: `${a.value}%` }} />
                    </div>
                    <div className="ac-pt-axis-meta">
                      {a.magnitude === "neutro" ? t("acin.pt.neutralAxis") : `${t(`acin.pt.mag.${a.magnitude}`)} · ${a.pole}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
