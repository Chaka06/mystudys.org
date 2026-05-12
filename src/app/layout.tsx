import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const BASE_URL = "https://mystudys.org";
const OG_IMAGE = `${BASE_URL}/og-image.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    template: "%s | STUDY'S",
    default: "STUDY'S — Le réseau social étudiant ivoirien",
  },

  description:
    "STUDY'S est le premier réseau social étudiant de Côte d'Ivoire. Partagez vos sujets d'examens, cours, ressources académiques et connectez-vous avec des étudiants de l'UVCI, INPHB, UFHB et de toutes les universités ivoiriennes.",

  // meta keywords : Google l'ignore depuis 2016 — supprimé volontairement

  authors: [{ name: "STUDY'S", url: BASE_URL }],
  creator: "STUDY'S",
  publisher: "STUDY'S",

  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-16x16.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "STUDY'S",
    startupImage: "/icons/icon-512x512.png",
  },

  openGraph: {
    type: "website",
    url: BASE_URL,
    locale: "fr_CI",
    alternateLocale: "fr_FR",
    siteName: "STUDY'S",
    title: "STUDY'S — Le réseau social étudiant ivoirien",
    description:
      "Le premier réseau social étudiant de Côte d'Ivoire. Partagez cours, sujets d'examens et connectez-vous avec des milliers d'étudiants ivoiriens.",
    images: [
      {
        url: OG_IMAGE,
        width: 1280,
        height: 720,
        alt: "STUDY'S — Réseau social étudiant ivoirien",
        type: "image/jpeg",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@studysci",
    creator: "@studysci",
    title: "STUDY'S — Le réseau social étudiant ivoirien",
    description:
      "Partagez vos cours, sujets d'examens et connectez-vous avec des étudiants ivoiriens.",
    images: [OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // hreflang : ciblage Côte d'Ivoire + fallback x-default requis par Google
  alternates: {
    canonical: BASE_URL,
    languages: {
      "fr-CI": BASE_URL,
      "fr": BASE_URL,
      "x-default": BASE_URL,
    },
  },

  category: "education",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F97316" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    // Identité de l'organisation
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "STUDY'S",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        "@id": `${BASE_URL}/#logo`,
        url: `${BASE_URL}/logostudys.png`,
        width: 512,
        height: 512,
        caption: "STUDY'S",
      },
      description:
        "Premier réseau social étudiant de Côte d'Ivoire — partage de cours, sujets d'examens et ressources académiques.",
      foundingDate: "2026",
      foundingLocation: {
        "@type": "Place",
        name: "Abidjan, Côte d'Ivoire",
        address: {
          "@type": "PostalAddress",
          addressCountry: "CI",
          addressLocality: "Abidjan",
        },
      },
      areaServed: {
        "@type": "Country",
        name: "Côte d'Ivoire",
        sameAs: "https://www.wikidata.org/wiki/Q1008",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "contact@mystudys.org",
        availableLanguage: "French",
      },
    },

    // Site web avec SearchAction — Google peut afficher un champ de recherche dans les SERP
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "STUDY'S",
      inLanguage: "fr-CI",
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },

    // Application web — catégorie éducation, gratuit
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#app`,
      name: "STUDY'S",
      operatingSystem: "Web, Android, iOS",
      applicationCategory: "EducationApplication",
      url: BASE_URL,
      author: { "@id": `${BASE_URL}/#organization` },
      description:
        "Application web de réseau social pour les étudiants ivoiriens — partage de cours, sujets d'examens, messagerie en temps réel.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "XOF",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        reviewCount: "1",
        bestRating: "5",
        worstRating: "1",
      },
    },

    // FAQ — boost rich results dans les SERP (réponses directes visibles sur Google)
    {
      "@type": "FAQPage",
      "@id": `${BASE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Qu'est-ce que STUDY'S ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "STUDY'S est le premier réseau social étudiant de Côte d'Ivoire. Il permet aux étudiants ivoiriens de partager des cours, des sujets d'examens, des ressources académiques et de se connecter entre eux.",
          },
        },
        {
          "@type": "Question",
          name: "STUDY'S est-il gratuit ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui, STUDY'S est entièrement gratuit. L'inscription, le partage de ressources et la messagerie sont accessibles sans frais pour tous les étudiants.",
          },
        },
        {
          "@type": "Question",
          name: "Quelles universités sont sur STUDY'S ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "STUDY'S accueille des étudiants de toutes les universités et grandes écoles ivoiriennes : UVCI, INPHB, UFHB, Université de Bouaké, ESATIC, PIGIER, et bien d'autres.",
          },
        },
        {
          "@type": "Question",
          name: "Comment trouver des sujets d'examens sur STUDY'S ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Après votre inscription, utilisez la fonction Recherche pour filtrer les publications par type 'Sujet d'examen', par filière ou par niveau académique (BTS, Licence, Master).",
          },
        },
        {
          "@type": "Question",
          name: "STUDY'S est-il disponible sur mobile ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui, STUDY'S est une application web progressive (PWA) optimisée pour mobile. Vous pouvez l'ajouter à l'écran d'accueil de votre téléphone depuis votre navigateur pour un accès rapide.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* JSON-LD côté serveur — obligatoire pour que Google le lise avant rendu JS */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Geo targeting Côte d'Ivoire / Abidjan */}
        <meta name="geo.region" content="CI" />
        <meta name="geo.placename" content="Abidjan, Côte d'Ivoire" />
        <meta name="geo.position" content="5.3600;-4.0083" />
        <meta name="ICBM" content="5.3600, -4.0083" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: { borderRadius: "12px", fontSize: "14px" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
