"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function VerifyOtpContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (newOtp.every((d) => d) && newOtp.join("").length === 6) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (code: string) => {
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });

    if (error) {
      toast.error("Code incorrect ou expiré. Réessayez.");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      setLoading(false);
      return;
    }

    toast.success("Compte vérifié avec succès !");
    router.push("/feed");
  };

  const handleResend = async () => {
    if (countdown > 0 || !email) return;
    setResending(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setCountdown(60);
    toast.success("Code renvoyé !");
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-hero-pattern px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <Image src="/logostudys.png" alt="STUDY'S" width={64} height={64} style={{ width: "auto", height: "64px" }} className="object-contain" />
            <h1 className="text-2xl font-bold">
              <span className="text-brand-orange">STUDY</span>
              <span className="text-brand-green">'S</span>
            </h1>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-2">
              <Mail className="h-6 w-6 text-brand-orange" />
            </div>
            <CardTitle>Vérification du compte</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez le code à 6 chiffres envoyé à<br />
              <span className="font-medium text-foreground">{email || "votre email"}</span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-3 my-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="h-12 w-10 text-center text-lg font-bold rounded-xl border-2 border-input bg-background focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition-all"
                />
              ))}
            </div>

            <Button
              className="w-full"
              onClick={() => verifyOtp(otp.join(""))}
              loading={loading}
              disabled={otp.some((d) => !d)}
            >
              Vérifier
            </Button>

            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                Pas reçu le code ?{" "}
                {countdown > 0 ? (
                  <span className="text-brand-orange">Renvoyer dans {countdown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-brand-orange font-semibold hover:underline"
                  >
                    Renvoyer
                  </button>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
