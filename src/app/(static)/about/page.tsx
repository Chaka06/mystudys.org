import type { Metadata } from "next";
import Image from "next/image";
import { BookOpen, Users, GraduationCap, Heart, Target, Shield, Star, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos",
  description: "Découvrez STUDY'S, le premier réseau social étudiant de Côte d'Ivoire fondé à Abidjan. Notre mission : démocratiser l'accès aux ressources académiques pour tous les étudiants ivoiriens.",
  openGraph: {
    title: "À propos de STUDY'S",
    description: "Le premier réseau social étudiant ivoirien — fondé à Abidjan pour les étudiants de toute la Côte d'Ivoire.",
    images: ["https://mystudys.org/og-image.jpg"],
  },
};

export default function AboutPage() {
  return (
    <div className="space-y-14 max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center space-y-5">
        <Image
          src="/logostudys.png"
          alt="STUDY'S"
          width={80}
          height={80}
          style={{ width: "auto", height: "80px" }}
          className="object-contain mx-auto"
          priority
        />
        <h1 className="text-4xl font-black text-gray-900">
          À propos de{" "}
          <span className="text-orange-500">STUDY</span>
          <span className="text-green-600">'S</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Le premier réseau social étudiant ivoirien — conçu pour connecter, partager
          et réussir ensemble. Une plateforme née en Côte d'Ivoire, pour les étudiants
          ivoiriens.
        </p>
      </div>

      {/* Mission */}
      <div className="bg-gradient-to-br from-orange-50 to-green-50/40 rounded-3xl p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Notre mission</h2>
        </div>
        <p className="text-gray-600 leading-relaxed text-lg">
          STUDY'S est née d'un constat simple : les étudiants ivoiriens manquent d'une
          plateforme centralisée, sécurisée et dédiée au partage de leurs ressources
          académiques. Sujets d'examens, cours, fiches de révision, annonces d'événements —
          tout se disperse dans des groupes WhatsApp désorganisés.
        </p>
        <p className="text-gray-600 leading-relaxed text-lg">
          Notre mission : être la référence du partage académique en Côte d'Ivoire,
          de la Terminale au Doctorat, dans un environnement bienveillant, sécurisé
          et propice à la réussite collective.
        </p>
      </div>

      {/* Ce que nous offrons */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ce que STUDY'S vous offre</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            {
              icon: BookOpen,
              color: "bg-orange-50 text-orange-600",
              title: "Ressources académiques",
              desc: "Accédez à des milliers de sujets d'examens, cours, fiches de révision et documents pédagogiques partagés par vos pairs.",
            },
            {
              icon: Users,
              color: "bg-blue-50 text-blue-600",
              title: "Réseau étudiant",
              desc: "Connectez-vous avec des étudiants de votre filière, votre établissement ou de tout le pays. L'entraide au cœur de chaque interaction.",
            },
            {
              icon: GraduationCap,
              color: "bg-green-50 text-green-600",
              title: "Recommandations intelligentes",
              desc: "Un fil d'actualité personnalisé selon votre niveau, votre filière et votre établissement. Le contenu qui vous correspond.",
            },
            {
              icon: Shield,
              color: "bg-purple-50 text-purple-600",
              title: "Communauté protégée",
              desc: "Une modération rigoureuse pour garantir un espace bienveillant, respectueux et exempt de tout contenu nocif ou haineux.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Valeurs */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nos valeurs fondamentales</h2>
        <div className="space-y-4">
          {[
            {
              icon: Heart,
              title: "Bienveillance",
              desc: "STUDY'S est un espace d'entraide et de respect mutuel. Chaque étudiant, quelle que soit son origine, sa filière ou son niveau, y est accueilli avec bienveillance.",
            },
            {
              icon: Star,
              title: "Excellence académique",
              desc: "Nous voulons contribuer à la réussite de chaque étudiant ivoirien. La qualité des ressources partagées et la rigueur académique sont au cœur de notre engagement.",
            },
            {
              icon: Shield,
              title: "Sécurité et respect",
              desc: "Tolérance zéro envers les propos haineux, discriminatoires ou toxiques. STUDY'S est une plateforme sûre, régie par des règles claires appliquées par une équipe de modération active.",
            },
            {
              icon: Globe,
              title: "Accessibilité",
              desc: "STUDY'S est gratuit, accessible depuis n'importe quel appareil (téléphone, tablette, ordinateur) et disponible partout en Côte d'Ivoire.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 p-5 bg-gray-50 rounded-2xl">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chiffres */}
      <div className="bg-gray-900 rounded-3xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-8 text-center">STUDY'S en chiffres</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "10 000+", label: "Étudiants" },
            { value: "50 000+", label: "Ressources partagées" },
            { value: "200+", label: "Établissements" },
            { value: "2025", label: "Année de création" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-black text-orange-400">{s.value}</p>
              <p className="text-gray-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fait en CI */}
      <div className="border border-orange-200 rounded-2xl p-6 bg-orange-50/50">
        <div className="flex items-start gap-4">
          <span className="text-4xl">🇨🇮</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Fièrement made in Côte d'Ivoire
            </h2>
            <p className="text-gray-600 leading-relaxed">
              STUDY'S est développée par une équipe passionnée d'Abidjan, convaincue que
              la technologie peut transformer l'éducation en Afrique. Nous sommes une
              startup technologique ivoirienne fière de servir la communauté estudiantine
              locale et de contribuer à l'émergence d'une génération de jeunes Ivoiriens
              connectés, informés et excellents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
