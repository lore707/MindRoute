# Marchio MindRoute

`logo-master.png` è **l'originale**. Tutto il resto ne discende: non si
ridisegna il marchio a mano da nessuna parte.

Per rigenerarlo dopo un cambio del master:

```bash
# tracciato pieno → client/src/components/BrandMark.tsx
node script/qa/trace-logo.mjs brand/logo-master.png paths.json 50 1.5 300 106

# tracciato compatto → favicon data-URI + card OG
node script/qa/trace-logo.mjs brand/logo-master.png paths-lite.json 50 3.2 300 106
```

Parametri: soglia su **R−B** (non sulla luminanza: le ali inferiori sono
ombreggiate e qualsiasi soglia di luminanza taglia via mezzo marchio),
epsilon di semplificazione, area minima, riempimento del viewBox 120×120.

`106` tiene lo stesso ingombro ottico del marchio precedente, così nessuna
chiamata esistente a `<BrandMark size={…} />` cambia peso nella pagina.

`logo.svg` è il vettore risultante, comodo per usi esterni (stampa, social).
