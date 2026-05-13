/**
 * Utilitaire serveur — envoie un push à un utilisateur depuis n'importe quelle
 * Server Action ou API route. Ne plante jamais (erreurs silencieuses).
 */
export async function sendPush(
  recipientId: string,
  title: string,
  body: string,
  url = "/notifications"
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mystudys.org";
  const key     = process.env.INTERNAL_API_KEY;
  if (!key) return;

  try {
    await fetch(`${baseUrl}/api/push/send`, {
      method:  "POST",
      headers: {
        "Content-Type":   "application/json",
        "x-internal-key": key,
      },
      body: JSON.stringify({ recipientId, title, body, url }),
    });
  } catch {}
}
