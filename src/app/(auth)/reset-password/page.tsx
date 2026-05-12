"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase injecte le token via le fragment d'URL (#access_token=...)
  // Le client Supabase le récupère automatiquement via onAuthStateChange
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Session établie, l'utilisateur peut changer son mot de passe
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error("Le mot de passe doit contenir au moins une majuscule");
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error("Le mot de passe doit contenir au moins un chiffre");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Erreur lors de la réinitialisation. Le lien a peut-être expiré.");
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/feed"), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50/30 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Image src="/logostudys.png" alt="STUDY'S" width={56} height={56} style={{ width: "auto", height: "56px" }} className="object-contain mx-auto" priority />
          <h1 className="font-bold text-2xl mt-3">
            <span className="text-orange-500">STUDY</span>
            <span className="text-green-600">'S</span>
          </h1>
        </div>

        <Card>
          <CardHeader className="pb-2 text-center">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
              {done ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Lock className="h-6 w-6 text-orange-500" />
              )}
            </div>
            <CardTitle>
              {done ? "Mot de passe mis à jour !" : "Nouveau mot de passe"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Votre mot de passe a été modifié. Redirection vers votre compte…
                </p>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5 }}
                    className="h-full bg-green-500 rounded-full"
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Choisissez un nouveau mot de passe sécurisé.
                </p>

                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nouveau mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  required
                />

                <Input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  required
                />

                <ul className="text-xs text-muted-foreground space-y-0.5 px-1">
                  <li className={password.length >= 8 ? "text-green-600" : ""}>
                    {password.length >= 8 ? "✓" : "·"} 8 caractères minimum
                  </li>
                  <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                    {/[A-Z]/.test(password) ? "✓" : "·"} Une majuscule
                  </li>
                  <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                    {/[0-9]/.test(password) ? "✓" : "·"} Un chiffre
                  </li>
                  <li className={confirm && password === confirm ? "text-green-600" : ""}>
                    {confirm && password === confirm ? "✓" : "·"} Mots de passe identiques
                  </li>
                </ul>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  loading={loading}
                  disabled={!password || !confirm}
                >
                  Réinitialiser le mot de passe
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
