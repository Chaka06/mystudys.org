// Rate limiter en mémoire — simple et sans dépendance externe
// Suffit pour un projet à l'échelle d'un MVP (Vercel = serverless, chaque instance a sa propre map)

interface RateLimitEntry { count: number; resetAt: number }
const store = new Map<string, RateLimitEntry>();

/**
 * @param key      Identifiant unique (ex: userId + endpoint)
 * @param limit    Nombre max de requêtes
 * @param windowMs Fenêtre de temps en ms
 * @returns true si la limite est dépassée
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) return true;

  entry.count++;
  return false;
}
