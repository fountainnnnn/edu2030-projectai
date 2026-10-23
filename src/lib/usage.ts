import type Database from "better-sqlite3";

// Usage limits for the public demo. Every judged or run prompt costs OpenRouter calls,
// so each visitor (by IP) and the whole site get a budget. Over budget, the routes
// answer with the offline rule-based scorer and fallback response instead of the LLM,
// so the quest still works and nothing is spent.

export const MAX_PROMPT_CHARS = 4000;

const IP_LIMIT_PER_HOUR = Number(process.env.PAI_IP_LIMIT_PER_HOUR ?? 30);
const DAILY_LIMIT = Number(process.env.PAI_DAILY_LIMIT ?? 300);
const HOUR_MS = 60 * 60 * 1000;

// Per-IP window in memory: one Railway replica, and a restart only resets the hourly
// window. The daily cap is the cost ceiling, so it lives in SQLite and survives restarts.
const ipWindows = new Map<string, { start: number; count: number }>();

// Railway's edge appends the client address to X-Forwarded-For, so the rightmost entry
// is the one a client cannot forge.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  return last || "unknown";
}

function allowIp(ip: string, now: number): boolean {
  const entry = ipWindows.get(ip);
  if (!entry || now - entry.start >= HOUR_MS) {
    ipWindows.set(ip, { start: now, count: 1 });
    if (ipWindows.size > 10_000) {
      for (const [key, value] of ipWindows) {
        if (now - value.start >= HOUR_MS) ipWindows.delete(key);
      }
    }
    return true;
  }
  if (entry.count >= IP_LIMIT_PER_HOUR) return false;
  entry.count += 1;
  return true;
}

function allowToday(db: Database.Database): boolean {
  db.exec(`CREATE TABLE IF NOT EXISTS llm_usage (day TEXT PRIMARY KEY, count INTEGER NOT NULL)`);
  const day = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`SELECT count FROM llm_usage WHERE day = ?`).get(day) as
    | { count: number }
    | undefined;
  if ((row?.count ?? 0) >= DAILY_LIMIT) return false;
  db.prepare(
    `INSERT INTO llm_usage (day, count) VALUES (?, 1)
     ON CONFLICT(day) DO UPDATE SET count = count + 1`,
  ).run(day);
  return true;
}

/** Counts one LLM-backed request. Returns false when the visitor or the site is over budget. */
export function allowLlmCall(db: Database.Database, req: Request): boolean {
  return allowIp(clientIp(req), Date.now()) && allowToday(db);
}
