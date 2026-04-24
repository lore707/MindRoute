import { sql } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import type { Store, ClientRateLimitInfo } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

const IS_DEV = process.env.NODE_ENV !== "production";
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// ── DB STORE ──────────────────────────────────────────────────────────────────

class PgStore implements Store {
  constructor(private readonly windowMs: number) {}

  async increment(key: string): Promise<ClientRateLimitInfo> {
    try {
      const { db } = await import("./db");
      const wMs = this.windowMs;
      const result = await db.execute(sql`
        INSERT INTO rate_limits (key, hits, reset_at)
        VALUES (${key}, 1, NOW() + (${wMs}::bigint * INTERVAL '1 millisecond'))
        ON CONFLICT (key) DO UPDATE SET
          hits = CASE
            WHEN rate_limits.reset_at <= NOW() THEN 1
            ELSE rate_limits.hits + 1
          END,
          reset_at = CASE
            WHEN rate_limits.reset_at <= NOW() THEN NOW() + (${wMs}::bigint * INTERVAL '1 millisecond')
            ELSE rate_limits.reset_at
          END
        RETURNING hits, reset_at
      `);
      const row = (result as any).rows[0] as { hits: number; reset_at: string };
      return { totalHits: Number(row.hits), resetTime: new Date(row.reset_at) };
    } catch (err) {
      console.error("rate-limiter DB error (failing open):", err);
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const { db } = await import("./db");
      await db.execute(sql`
        UPDATE rate_limits SET hits = GREATEST(0, hits - 1) WHERE key = ${key}
      `);
    } catch {}
  }

  async resetKey(key: string): Promise<void> {
    try {
      const { db } = await import("./db");
      await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
    } catch {}
  }
}

// ── SETUP ─────────────────────────────────────────────────────────────────────

export async function ensureRateLimitTable(): Promise<void> {
  if (IS_DEV) return;
  try {
    const { db } = await import("./db");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key      TEXT PRIMARY KEY,
        hits     INTEGER NOT NULL DEFAULT 0,
        reset_at TIMESTAMPTZ NOT NULL
      )
    `);
    // Cleanup expired rows once an hour
    setInterval(async () => {
      try {
        const { db: d } = await import("./db");
        await d.execute(sql`DELETE FROM rate_limits WHERE reset_at < NOW()`);
      } catch {}
    }, HOUR_MS);
  } catch (err) {
    console.error("Could not create rate_limits table:", err);
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function makeKeyGenerator(prefix: string) {
  return (req: Request): string => {
    const user = (req as any).user;
    if (user?.id) return `user:${user.id}:${prefix}`;
    return `ip:${req.ip ?? "unknown"}:${prefix}`;
  };
}

function bilingualHandler(windowMs: number) {
  return (_req: Request, res: Response) => {
    const hours = Math.ceil(windowMs / HOUR_MS);
    const isDaily = hours >= 24;
    res.status(429).json({
      message: isDaily
        ? `Limite giornaliero raggiunto (max 3). Riprova domani. / Daily limit reached (max 3). Try again tomorrow.`
        : `Troppe richieste. Riprova tra ${hours} ora/e. / Too many requests. Try again in ${hours} hour(s).`,
    });
  };
}

const passthrough = (_req: Request, _res: Response, next: NextFunction) => next();

// ── LIMITERS ──────────────────────────────────────────────────────────────────

/**
 * 3 profilazioni / 24h per utente autenticato (user_id) o per IP se anonimo.
 * Protegge POST /api/profiling
 */
export const profilingLimiter = IS_DEV
  ? passthrough
  : rateLimit({
      windowMs: DAY_MS,
      max: 3,
      keyGenerator: makeKeyGenerator("profiling"),
      store: new PgStore(DAY_MS),
      handler: bilingualHandler(DAY_MS),
      standardHeaders: "draft-7",
      legacyHeaders: false,
    });

/**
 * 3 itinerari / 24h per utente autenticato o per IP se anonimo.
 * Protegge POST /api/itinerary/generate e /api/itinerary/generate-stream
 */
export const itineraryLimiter = IS_DEV
  ? passthrough
  : rateLimit({
      windowMs: DAY_MS,
      max: 3,
      keyGenerator: makeKeyGenerator("itinerary"),
      store: new PgStore(DAY_MS),
      handler: bilingualHandler(DAY_MS),
      standardHeaders: "draft-7",
      legacyHeaders: false,
    });

/**
 * 50 mutazioni / ora per IP su tutti gli endpoint /api.
 * Applicato solo a POST, PATCH, PUT, DELETE — le GET non vengono toccate
 * per non interferire con il polling (stats, recent-destination, ecc.).
 */
export const globalApiLimiter = IS_DEV
  ? passthrough
  : rateLimit({
      windowMs: HOUR_MS,
      max: 50,
      keyGenerator: (req: Request) => `ip:${req.ip ?? "unknown"}:global`,
      store: new PgStore(HOUR_MS),
      handler: bilingualHandler(HOUR_MS),
      standardHeaders: "draft-7",
      legacyHeaders: false,
      skip: (req: Request) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
    });
