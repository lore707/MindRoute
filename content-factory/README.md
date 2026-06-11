# Content Factory — MindRoute

Pipeline di contenuti giornalieri per Instagram/TikTok: 1 run = 1 carosello pronto da postare (slide 1080×1350 + caption + hashtag), brandizzato MindRoute (corallo/ink/cream, Playfair + DM Sans, farfalla).

## Uso

```bash
npm run content                                   # rotazione automatica pilastro+destinazione
npm run content -- --pillar deep-dive             # forza il pilastro
npm run content -- --dest "Kyoto, Japan"          # forza la destinazione (città con experience bank)
npm run content -- --dry                          # test visivo senza chiamate API
```

Richiede in `.env` (root del repo) o nell'ambiente: `ANTHROPIC_API_KEY`, `UNSPLASH_ACCESS_KEY`.

Output in `content-factory/out/<data>-<slug>/` (gitignorato, ma sincato da OneDrive → accessibile da telefono):
- `slide-NN.png` — le slide in ordine
- `caption.txt` — caption + hashtag, da incollare
- `meta.json` — piano, copy completa, **crediti fotografi Unsplash** (citarli nella caption è buona pratica per le linee guida Unsplash)

## Pilastri (rotazione automatica via `state.json`)

| Pilastro | Formato | Grounding |
|---|---|---|
| `tre-posti` | "3 posti per chi…" (persona del quiz) | `destination-catalog.ts` |
| `deep-dive` | 1 città in 5 luoghi veri | `experience-bank.ts` |
| `itinerario-30s` | 3 giorni in 3 slide | `experience-bank.ts` |
| `quiz-bait` | slide tipografiche sulla personalità di viaggio | nessuno (niente luoghi) |

Anti-invenzione: ogni nome di luogo nelle slide deve esistere nel blocco di grounding, stessa filosofia della generazione itinerari.

## File

- `brand.ts` — palette, logo farfalla, font loader (woff da @fontsource)
- `render.ts` — satori + resvg (niente browser), 4 layout: cover / place / statement / cta
- `planner.ts` — rotazione LRU pilastri + destinazioni, stato in `state.json`
- `copywriter.ts` — copy via `claude-sonnet-4-6`, output JSON vincolato
- `images.ts` — Unsplash orientation=portrait, crop esatto 1080×1350, no duplicati nella run
- `run.ts` — orchestratore
- `config.json` — url del sito sulla slide CTA (da aggiornare quando ci sarà il dominio custom)

## TODO (fasi successive)

- **Fase 2 — video**: slide → MP4 1080×1920 con Ken Burns + crossfade (ffmpeg) + voiceover TTS (Edge TTS) + sottotitoli. ffmpeg non è installato sulla macchina.
- **Fase 3 — scheduling**: Task Scheduler Windows che lancia `npm run content` una volta al giorno.
