"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F8F9FB" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            STUDY&apos;S rencontre un problème
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, maxWidth: 320 }}>
            Une erreur critique est survenue. Rechargez la page.
          </p>
          <button
            onClick={reset}
            style={{ padding: "10px 24px", background: "#F97316", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
