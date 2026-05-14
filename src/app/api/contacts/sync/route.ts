import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

function normalizePhone(p: string): string {
  let n = p.replace(/[\s\-\(\)\.]+/g, "");
  n = n.replace(/^\+/, "");
  n = n.replace(/^00/, "");
  // Numéro local ivoirien 10 chiffres commençant par 0 (ex: 0799298420 → 2250799298420)
  if (/^0\d{9}$/.test(n)) n = "225" + n;
  return n;
}

function hashPhone(phone: string): string {
  return createHash("sha256").update(normalizePhone(phone)).digest("hex");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { phones } = await req.json();
  if (!Array.isArray(phones) || phones.length === 0) {
    return NextResponse.json({ error: "Liste de numéros requise" }, { status: 400 });
  }

  // Limiter à 5000 contacts max
  const limited = phones.slice(0, 5000);

  // Hacher les numéros côté serveur pour la confidentialité
  const hashes = [...new Set(
    limited
      .map((p: string) => hashPhone(String(p)))
      .filter((h) => h.length === 64)
  )];

  if (hashes.length === 0) return NextResponse.json({ synced: 0 });

  const newSet = new Set(hashes);

  // Récupérer les anciens hashes pour supprimer uniquement ceux disparus
  const { data: existing } = await supabase
    .from("phone_contacts")
    .select("phone_hash")
    .eq("user_id", user.id);

  const toDelete = (existing ?? [])
    .map((r: any) => r.phone_hash)
    .filter((h: string) => !newSet.has(h));

  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 500) {
      await supabase.from("phone_contacts")
        .delete()
        .eq("user_id", user.id)
        .in("phone_hash", toDelete.slice(i, i + 500));
    }
  }

  // Upsert les nouveaux (sans risque de perte si insert partiel)
  const rows = hashes.map((h) => ({ user_id: user.id, phone_hash: h }));
  for (let i = 0; i < rows.length; i += 500) {
    await supabase.from("phone_contacts")
      .upsert(rows.slice(i, i + 500), { onConflict: "user_id,phone_hash" });
  }

  return NextResponse.json({ synced: hashes.length });
}
