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

