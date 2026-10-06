import { config } from "dotenv";
import { resolve } from "node:path";

export const workspaceRoot = resolve(__dirname, "../../..");

config({ path: resolve(workspaceRoot, ".env"), quiet: true });

export function port(name: string, fallback: number): number {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }

  return value;
}

export function url(
  name: string,
  fallback: string,
  protocols: string[],
): string {
  const value = process.env[name] || fallback;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${name} uses an unsupported protocol.`);
  }

  return value.replace(/\/$/, "");
}

export function boolean(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be true or false.`);
  }

  return value === "true";
}

export const httpConfig = {
  origin: url("APP_ORIGIN", "http://localhost:5173", ["http:", "https:"]),
  trustProxy: boolean("TRUST_PROXY"),
  secureCookie: boolean("COOKIE_SECURE"),
};
