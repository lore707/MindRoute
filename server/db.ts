// Drizzle DB wiring. When DATABASE_URL is set, storage.ts selects
// DatabaseStorage (backed by this pool); otherwise it falls back to the
// in-memory MemoryStorage for local/dev without a database.
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Single shared pool for the whole app (queries + connect-pg-simple sessions +
// rate-limiter). `max` is capped conservatively so we never exhaust the Postgres
// connection limit under load — the classic "too many clients already" outage.
// Tune up only after confirming the DB plan's connection ceiling.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// An error on an IDLE client (DB restart, network blip) is emitted on the pool.
// If unhandled, Node crashes the whole process — log and keep serving instead.
pool.on("error", (err) => {
  console.error("pg pool idle-client error (continuing):", err);
});

// ── Resilienza cold-start (Neon free va in scale-to-zero dopo ~5 min idle) ──
// Quando il DB dorme, la PRIMA query dopo il risveglio può fallire con errori
// di connessione transitori ("Connection terminated…", control-plane XX000):
// la connessione non raggiunge nemmeno il DB. Ritentiamo con un breve backoff,
// così il risveglio di Neon viene assorbito e l'utente non vede un 500.
// SOLO letture (SELECT/WITH): le scritture non si ritentano, per non rischiare
// doppie esecuzioni se una connessione cade dopo aver eseguito la query.
const TRANSIENT_MSGS = [
  "connection terminated",
  "connection timeout",
  "timeout expired",
  "control plane request failed",
  "terminating connection",
  "econnreset",
  "etimedout",
  "epipe",
];
// XX000 = internal (Neon control plane); 57P0x = admin shutdown; 08xxx = connection failure.
const TRANSIENT_CODES = new Set(["XX000", "57P01", "57P03", "08006", "08003", "08001", "08004"]);

function isTransient(err: any): boolean {
  if (!err) return false;
  if (err.code && TRANSIENT_CODES.has(String(err.code))) return true;
  const msg = String(err?.message ?? err).toLowerCase();
  return TRANSIENT_MSGS.some((t) => msg.includes(t));
}

function isReadOnly(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const head = text.trimStart().slice(0, 8).toLowerCase();
  return head.startsWith("select") || head.startsWith("with");
}

const RETRY_DELAYS = [250, 750]; // 2 ritentativi, backoff crescente
const rawQuery = pool.query.bind(pool);
(pool as any).query = function retryingQuery(...args: any[]) {
  // Forma a callback: nessun retry (drizzle usa le promise).
  if (typeof args[args.length - 1] === "function") return (rawQuery as any)(...args);
  const cfg = args[0];
  const text = typeof cfg === "string" ? cfg : cfg?.text;
  if (!isReadOnly(text)) return (rawQuery as any)(...args);

  const attempt = async (i: number): Promise<any> => {
    try {
      return await (rawQuery as any)(...args);
    } catch (err) {
      if (i < RETRY_DELAYS.length && isTransient(err)) {
        console.warn(`db read retry ${i + 1}/${RETRY_DELAYS.length} (${(err as any)?.code ?? "conn"}) — DB cold start?`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]));
        return attempt(i + 1);
      }
      throw err;
    }
  };
  return attempt(0);
};

export const db = drizzle(pool, { schema });

/**
 * Idempotent, non-destructive DB hardening run at startup:
 *   - indexes on the foreign-key / filter columns we actually query (CREATE INDEX
 *     IF NOT EXISTS — safe to re-run), so queries don't full-scan as data grows;
 *   - prune recent_destinations (grows on every itinerary, never deleted).
 * Each statement is guarded independently so a missing table never aborts boot.
 */
export async function ensureIndexes(): Promise<void> {
  const stmts = [
    `CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_itineraries_destination_id ON itineraries(destination_id)`,
    `CREATE INDEX IF NOT EXISTS idx_recent_destinations_created_at ON recent_destinations(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_saved_moments_user_id ON saved_moments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_saved_places_user_itin ON saved_places(user_id, itinerary_id)`,
    `CREATE INDEX IF NOT EXISTS idx_trait_snapshots_user_id ON trait_snapshots(user_id)`,
  ];
  for (const s of stmts) {
    try { await pool.query(s); } catch (err) { console.error("ensureIndexes:", s, err); }
  }
  try {
    await pool.query(
      `DELETE FROM recent_destinations
       WHERE id NOT IN (SELECT id FROM recent_destinations ORDER BY created_at DESC LIMIT 500)`,
    );
  } catch (err) { console.error("prune recent_destinations:", err); }
}

