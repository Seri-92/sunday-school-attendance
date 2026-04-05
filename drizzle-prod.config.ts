import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.production.local", quiet: true });
config({ quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.production.local or your shell.",
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
