import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-hero-pattern px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gradient-orange flex items-center justify-center shadow-lg mb-6">
        <BookOpen className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-6xl font-black text-brand-orange mb-2">404</h1>
      <h2 className="text-2xl font-bold mb-3">Page introuvable</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Cette page n'existe pas ou a été déplacée. Retournez sur le fil d'actualité.
      </p>
      <Button asChild>
        <Link href="/feed">
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </Button>
    </div>
  );
}
