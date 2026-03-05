/**
 * Shared Redis connection helper for debugger scripts.
 * Reads REDIS_URL from project .env file, connects with ioredis.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";

// Find .env relative to this script (project root)
const __dirname =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../../../..");
const envPath = resolve(projectRoot, ".env");

function loadEnv(): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      let val = trimmed.slice(eqIdx + 1).trim();
      // strip surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
  } catch {
    console.error(`Failed to read ${envPath}`);
    process.exit(1);
  }
  return vars;
}

const env = loadEnv();

export const REDIS_URL = env.REDIS_URL;
export const SUBSCRIBER_ID = env.SUBSCRIBER_ID;
export const KEY_PREFIX = `tenant:${SUBSCRIBER_ID}:`;

if (!REDIS_URL) {
  console.error("REDIS_URL not found in .env");
  process.exit(1);
}

export function createClient(): Redis {
  return new Redis(REDIS_URL);
}

export function withRedis(fn: (client: Redis) => Promise<void>): void {
  const client = createClient();
  fn(client)
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    })
    .finally(() => {
      client.disconnect();
    });
}
