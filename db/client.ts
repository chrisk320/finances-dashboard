import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Schema = typeof schema;

let _db: NeonHttpDatabase<Schema> | null = null;
let _sql: NeonQueryFunction<false, false> | null = null;

function init(): NeonHttpDatabase<Schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL must be set");
  }
  // `cache: no-store` stops Next.js from caching the driver's query fetches —
  // otherwise a stale (e.g. empty) result can be served regardless of DB state.
  _sql = neon(url, { fetchOptions: { cache: "no-store" } });
  _db = drizzle(_sql, { schema });
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<Schema>, {
  get(_target, prop, receiver) {
    const real = init();
    return Reflect.get(real, prop, receiver);
  },
}) as NeonHttpDatabase<Schema>;
