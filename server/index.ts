import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupAuth } from "./auth";
import { ensureRateLimitTable, globalApiLimiter } from "./rate-limiter";
import { pool, ensureIndexes } from "./db";
import { createServer } from "http";

// Top-level safety net: a stray unhandled rejection / uncaught exception would
// otherwise terminate the whole process (full outage). Log loudly and keep
// serving — uptime-first, as the product is read-mostly and route errors are
// already handled by the Express error middleware below.
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION (continuing):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION (continuing):", err);
});

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5000", "http://localhost:5173"];

// Vite marks the JS/CSS tags as `crossorigin`, so the browser fetches the
// bundle in CORS mode even though it's same-origin — meaning the response MUST
// carry Access-Control-Allow-Origin or the browser blocks it. We therefore:
//   1) reflect same-origin requests (Origin host === Host) so the app's own
//      assets work on ANY domain it's served from (onrender.com, mindroute.co,
//      future domains/CDN) without touching an env allowlist;
//   2) keep ALLOWED_ORIGINS for genuine cross-origin API consumers;
//   3) NEVER throw on a disallowed origin — returning an Error here surfaced as
//      a 500 on every crossorigin asset for unlisted hosts (custom-domain bug).
//      We omit the CORS headers instead: a clean block, not a 500.
app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  let allow = false;
  if (!origin) {
    allow = true; // same-origin navigation / non-CORS request
  } else {
    try { allow = new URL(origin).host === req.headers.host; } catch { /* malformed Origin */ }
    if (!allow && allowedOrigins.includes(origin)) allow = true;
  }
  callback(null, { origin: allow, credentials: true });
}));
// Security headers di base. NIENTE Content-Security-Policy qui: index.html usa
// script inline deliberati (gtag stub, pre-hero) — una CSP va progettata con i
// nonce, non improvvisata (vedi docs/SECURITY.md). Questi tre sono a rischio zero.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

const httpServer = createServer(app);
const PgSession = connectPgSimple(session);

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

app.use(session({
  store: new PgSession({
    // Reuse the single capped pool from db.ts instead of letting
    // connect-pg-simple open its OWN pool (another default-10) — keeps total
    // Postgres connections bounded so we don't hit the plan's connection limit.
    pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "dev_only_secret_not_for_production",
  resave: false,
  saveUninitialized: false,
 cookie: { 
    secure: process.env.NODE_ENV === "production", 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
    httpOnly: true,
  }
}));
app.use(passport.initialize());
app.use(passport.session());
setupAuth(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Liveness probe — deliberately placed before the logger, the /api rate-limiter
// and route registration so it answers instantly with zero DB work. Used both
// by Render's health check and by the external keep-alive ping that prevents
// the free instance from spinning down (cold starts add 30-60s to first load).
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // NB: non logghiamo MAI il body della risposta — conteneva PII (utente,
      // email, trait, profiling). Solo metodo/path/status/durata.
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // NOTE: DB maintenance (ensureRateLimitTable/ensureIndexes) is intentionally
  // NOT awaited here — it runs in the background after listen() so slow startup
  // queries can never delay binding past Render's port-detection window. The
  // rate-limiter store fails open until its table exists, so early requests are
  // safe.
  app.use("/api", globalApiLimiter);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    // Best-effort DB maintenance AFTER the port is open — never blocks binding.
    ensureRateLimitTable()
      .then(() => ensureIndexes())
      .catch((e) => console.error("startup DB maintenance failed (non-fatal):", e));
  });
})();
