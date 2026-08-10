import pg from "pg";

const { Pool } = pg;

export type DbPool = InstanceType<typeof Pool>;

export function createDbPool(connectionString: string): DbPool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
}
