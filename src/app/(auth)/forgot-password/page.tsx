"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { isRateLimited } from "@/lib/rateLimit";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Rate limit : 3 demandes / heure par email
    if (isRateLimited(`reset:${trimmed}`, 3, 3600_000)) {
      toast.error("Trop de tentatives. Réessayez dans 1 heure.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        // Ne pas révéler si l'email existe — message générique
        console.error("[reset-password]", error.message);
      }

      // Toujours afficher le succès (sécurité : évite l'énumération d'emails)
      setSent(true);
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50/30 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <Image src="/logostudys.png" alt="STUDY'S" width={56} height={56} style={{ width: "auto", height: "56px" }} className="object-contain" priority />
            <h1 className="font-bold text-2xl">
              <span className="text-orange-500">STUDY</span><span className="text-green-600">'S</span>
            </h1>
          </Link>
        </div>

        <Card className="bg-white border-gray-100">
          <CardHeader className="pb-2 text-center">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
              {sent ? <CheckCircle className="h-6 w-6 text-green-600" /> : <Mail className="h-6 w-6 text-orange-500" />}
            </div>
            <CardTitle className="font-display text-xl">
              {sent ? "Email envoyé !" : "Mot de passe oublié ?"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Si un compte existe pour <span className="font-semibold text-gray-800">{email}</span>,
                  un lien de réinitialisation a été envoyé. Vérifiez votre boîte mail et les spams.
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                  <Link href="/login">Retour à la connexion</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-500 text-center leading-relaxed">
                  Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
                <Input
                  type="email"
                  placeholder="Votre adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                  autoComplete="email"
                  required
                />
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" loading={loading}>
                  Envoyer le lien
                </Button>
                <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-orange-500 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
