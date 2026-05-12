"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, User, Phone, BookOpen, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { ACADEMIC_LEVEL_LABELS } from "@/types/database.types";
import { toast } from "sonner";

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const watchedLevel = watch("academic_level");

  const handleNextStep = async () => {
    const valid = await trigger(["first_name", "last_name", "email", "phone"]);
    if (valid) setStep(2);
  };

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          full_name: `${data.first_name} ${data.last_name}`,
          phone: data.phone,
          academic_level: data.academic_level,
          field_of_study: data.field_of_study,
          institution: data.institution,
        },
        emailRedirectTo: `${window.location.origin}/verify-otp`,
      },
    });

    if (error) {
      toast.error(
        error.message.includes("already")
          ? "Cet email est déjà utilisé"
          : "Erreur lors de l'inscription"
      );
      setLoading(false);
      return;
    }

    router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Logo */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex flex-col items-center gap-2">
          <Image src="/logostudys.png" alt="STUDY'S" width={56} height={56} style={{ width: "auto", height: "56px" }} className="object-contain" />
          <h1 className="text-2xl font-bold">
            <span className="text-brand-orange">STUDY</span>
            <span className="text-brand-green">'S</span>
          </h1>
        </Link>
        <p className="text-muted-foreground text-sm mt-1">Rejoignez la communauté étudiante</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step ? "w-8 bg-brand-orange" : s < step ? "w-4 bg-brand-green" : "w-4 bg-muted"
            }`}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {step === 1 ? "Vos informations" : "Votre parcours académique"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    {...register("first_name")}
                    placeholder="Prénom *"
                    leftIcon={<User className="h-4 w-4" />}
                    error={errors.first_name?.message}
                  />
                  <Input
                    {...register("last_name")}
                    placeholder="Nom *"
                    error={errors.last_name?.message}
                  />
                </div>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="Adresse email *"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                />
                <Input
                  {...register("phone")}
                  type="tel"
                  placeholder="Téléphone (+225 07...)"
                  leftIcon={<Phone className="h-4 w-4" />}
                  error={errors.phone?.message}
                />
                <Button type="button" className="w-full" onClick={handleNextStep}>
                  Continuer
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <Select
                  value={watchedLevel}
                  onValueChange={(v) => setValue("academic_level", v as RegisterInput["academic_level"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Niveau académique *" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACADEMIC_LEVEL_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.academic_level && (
                  <p className="text-xs text-red-500">{errors.academic_level.message}</p>
                )}

                <Input
                  {...register("field_of_study")}
                  placeholder="Filière (ex: Informatique, Droit...) *"
                  leftIcon={<BookOpen className="h-4 w-4" />}
                  error={errors.field_of_study?.message}
                />

                <Input
                  {...register("institution")}
                  placeholder="Établissement (ex: UVCI, INPHB...) *"
                  leftIcon={<Building2 className="h-4 w-4" />}
                  error={errors.institution?.message}
                />

                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe *"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <Input
                  {...register("confirm_password")}
                  type="password"
                  placeholder="Confirmer le mot de passe *"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.confirm_password?.message}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Retour
                  </Button>
                  <Button type="submit" className="flex-1" loading={loading}>
                    Créer mon compte
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  En vous inscrivant, vous acceptez nos{" "}
                  <Link href="/terms" className="text-brand-orange hover:underline">CGU</Link>
                </p>
              </motion.div>
            )}
          </form>

          <div className="mt-4 text-center text-sm">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-brand-orange font-semibold hover:underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
