import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Don't hard-crash at import time (breaks `next build`); surface a clear
  // warning instead. Any actual query will fail loudly at request time.
  console.warn(
    "[flikpik] DATABASE_URL is not set. Copy .env.example to .env.local.",
  );
}

const sql = neon(
  connectionString ??
    "postgresql://user:pass@localhost.neon.tech/db?sslmode=require",
);

export const db = drizzle(sql, { schema });

export { schema };
