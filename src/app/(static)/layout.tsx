import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: { icon: "/logostudys.png" },
};

export default function StaticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logostudys.png" alt="STUDY'S" width={36} height={36} style={{ width: "auto", height: "36px" }} className="object-contain" />
            <span className="font-bold text-lg">
              <span className="text-orange-500">STUDY</span><span className="text-green-600">'S</span>
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400 space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 justify-center">
          <Image
            src="/logostudys.png"
            alt="STUDY'S"
            width={28}
            height={28}
            style={{ width: "auto", height: "28px" }}
            className="object-contain"
          />
          <span className="font-bold text-base">
            <span className="text-orange-500">STUDY</span>
            <span className="text-green-600">'S</span>
          </span>
        </Link>
        <p>© 2025 STUDY'S · Abidjan, Côte d'Ivoire 🇨🇮</p>
        <div className="flex justify-center gap-4 text-xs">
          <Link href="/about"   className="hover:text-orange-500 transition-colors">À propos</Link>
          <Link href="/privacy" className="hover:text-orange-500 transition-colors">Confidentialité</Link>
          <Link href="/terms"   className="hover:text-orange-500 transition-colors">CGU</Link>
          <Link href="/contact" className="hover:text-orange-500 transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
