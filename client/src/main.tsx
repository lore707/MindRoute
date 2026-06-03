import { createRoot } from "react-dom/client";
import App from "./App";

// Self-hosted fonts (latin subset, only the weights actually used). Replaces the
// two render-blocking Google Fonts requests — served same-origin, font-display:swap,
// so first paint no longer waits on a third-party round-trip. Heavy mobile win.
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/dm-sans/latin-400-italic.css";
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/playfair-display/latin-800.css";
import "@fontsource/playfair-display/latin-400-italic.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
