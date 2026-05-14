/**
 * Rate limiter hybride :
 * - Si UPSTASH_REDIS_REST_URL + TOKEN configurés → Redis distribué (production Vercel)
 * - Sinon → fallback in-memory (développement local)
 *
 * Upstash Redis gratuit : 10 000 req/jour, parfait pour un MVP
 * https://console.upstash.com
 */

// ─── Fallback in-memory (dev local) ──────────────────────────────────────────

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

function inMemoryLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  // Clean-up périodique pour éviter les memory leaks
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k);
    }
  }

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

// ─── Redis distribué (production) ────────────────────────────────────────────

let redisRateLimiter: ((key: string, limit: number, windowMs: number) => Promise<boolean>) | null = null;

async function getRedisLimiter() {
  if (redisRateLimiter) return redisRateLimiter;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");
    const redis = new Redis({ url, token });

    redisRateLimiter = async (key, limit, windowMs) => {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
        prefix: "studys:rl",
      });
      const { success } = await limiter.limit(key);
      return !success; // true = limité
    };

    return redisRateLimiter;
  } catch {
    return null;
  }
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Vérifie si une requête est rate-limitée.
 * @returns true si la limite est dépassée (bloquer), false si OK (laisser passer)
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const redis = await getRedisLimiter();
  if (redis) return redis(key, limit, windowMs);
  return inMemoryLimit(key, limit, windowMs);
}

/**
 * Version synchrone (in-memory uniquement) — pour les contextes sans async.
 * Préférer checkRateLimit() en production.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  return inMemoryLimit(key, limit, windowMs);
}
