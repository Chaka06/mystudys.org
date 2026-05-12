import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Créez votre compte STUDY'S gratuitement et rejoignez la plus grande communauté d'étudiants ivoiriens. Partagez cours, sujets d'examens et ressources académiques.",
  openGraph: {
    title: "Rejoindre STUDY'S — Inscription gratuite",
    description: "Créez votre compte et connectez-vous avec des milliers d'étudiants ivoiriens.",
    images: ["https://mystudys.org/og-image.jpg"],
  },
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50/30 px-4 py-12">
      <div className="w-full max-w-lg">
        <RegisterForm />
      </div>
    </div>
  );
}
