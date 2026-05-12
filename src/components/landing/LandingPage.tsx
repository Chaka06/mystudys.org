"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, Users, Calendar, MessageCircle,
  Bell, Star, ArrowRight, CheckCircle, Smartphone,
  GraduationCap, TrendingUp, Zap, Shield, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Données ─────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: BookOpen,
    gradient: "from-orange-50 to-orange-100",
    iconBg: "bg-orange-500",
    title: "Sujets d'examens",
    desc: "Accédez à des milliers d'anciens sujets triés par matière, professeur et niveau — du Bac au Doctorat.",
  },
  {
    icon: FileText,
    gradient: "from-green-50 to-green-100",
    iconBg: "bg-green-600",
    title: "Documents de cours",
    desc: "Partagez et téléchargez des résumés de cours, fiches de révision et supports pédagogiques.",
  },
  {
    icon: Users,
    gradient: "from-blue-50 to-blue-100",
    iconBg: "bg-blue-500",
    title: "Réseau étudiant",
    desc: "Connectez-vous avec des étudiants de votre filière, votre établissement et vos niveaux.",
  },
  {
    icon: Calendar,
    gradient: "from-purple-50 to-purple-100",
    iconBg: "bg-purple-500",
    title: "Événements & Soutenances",
    desc: "Suivez les conférences, soutenances et événements académiques près de chez vous.",
  },
  {
    icon: MessageCircle,
    gradient: "from-pink-50 to-pink-100",
    iconBg: "bg-pink-500",
    title: "Messagerie privée",
    desc: "Échangez en temps réel. Aucune obligation d'être amis pour initier une conversation.",
  },
  {
    icon: Bell,
    gradient: "from-amber-50 to-amber-100",
    iconBg: "bg-amber-500",
    title: "Alertes temps réel",
    desc: "Notifications instantanées pour les nouvelles publications, commentaires et demandes d'amitié.",
  },
];

const STATS = [
  { value: "10 000+", label: "Étudiants actifs", icon: Users },
  { value: "50 000+", label: "Ressources partagées", icon: FileText },
  { value: "200+", label: "Établissements", icon: GraduationCap },
  { value: "4.9 ★", label: "Note moyenne", icon: Star },
];

const TESTIMONIALS = [
  {
    name: "Aïcha Konaté",
    role: "Licence 3 – UVCI",
    avatar: "AK",
    color: "bg-orange-500",
    text: "Grâce à STUDY'S, j'ai trouvé les sujets des 5 dernières années de mes examens en moins de 10 minutes. Incroyable !",
  },
  {
    name: "Serge Bogui",
    role: "Master 1 – INPHB",
    avatar: "SB",
    color: "bg-green-600",
    text: "Le fil d'actualité me suggère exactement les ressources dont j'ai besoin selon ma filière. C'est comme LinkedIn mais pour les étudiants ivoiriens.",
  },
  {
    name: "Mariam Sanogo",
    role: "BTS 2 – PIGIER",
    avatar: "MS",
    color: "bg-blue-500",
    text: "J'ai rencontré des étudiants de ma filière que je ne connaissais pas. On révise ensemble maintenant. STUDY'S change vraiment la vie !",
  },
];

/* ─── Animations ─────────────────────────────────────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

/* ─── Composant ─────────────────────────────────────────────────────── */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logostudys.png"
              alt="STUDY'S"
              width={40}
              height={40}
              style={{ width: "auto", height: "40px" }}
              className="object-contain"
              priority
            />
            <span className="font-bold text-xl tracking-tight">
              <span className="text-orange-500">STUDY</span>
              <span className="text-green-600">'S</span>
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-orange-500 transition-colors">Fonctionnalités</Link>
            <Link href="#how" className="hover:text-orange-500 transition-colors">Comment ça marche</Link>
            <Link href="#testimonials" className="hover:text-orange-500 transition-colors">Témoignages</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-orange-500 transition-colors hidden sm:block">
              Connexion
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-200 active:scale-95"
            >
              Rejoindre <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/60 via-white to-white pt-16 pb-24">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-100 rounded-full blur-3xl opacity-40 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Tag */}
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 text-sm font-medium text-orange-600 mb-6">
              🇨🇮 &nbsp;Premier réseau social étudiant ivoirien
            </div>

            {/* Titre */}
            <h1 className="font-display text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] text-gray-900 mb-6">
              Partagez vos cours.
              <br />
              <span className="gradient-text">Réussissez ensemble.</span>
            </h1>

            {/* Sous-titre */}
            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              STUDY'S connecte les étudiants ivoiriens. Partagez vos sujets d'examens, cours et ressources — et trouvez tout ce dont vous avez besoin pour exceller.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-8 py-4 rounded-2xl transition-all shadow-xl shadow-orange-200 hover:shadow-2xl hover:shadow-orange-200 hover:-translate-y-0.5 active:scale-95"
              >
                Créer un compte gratuit
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-bold text-base px-8 py-4 rounded-2xl border-2 border-gray-200 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Se connecter
              </Link>
            </div>

            <p className="text-xs text-gray-400 mb-16">Gratuit · Aucune carte bancaire · 100% ivoirien</p>
          </motion.div>

          {/* ── App mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mx-auto max-w-3xl"
          >
            {/* Main card */}
            <div className="rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/80 overflow-hidden">
              {/* Browser chrome */}
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-gray-400 text-center border border-gray-200 max-w-48 mx-auto">
                  studys.ci/feed
                </div>
              </div>
              {/* Navbar mockup */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-display font-bold text-sm">
                    <span className="text-orange-500">STUDY</span><span className="text-green-600">'S</span>
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="h-7 w-24 bg-gray-100 rounded-lg" />
                  <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-500 text-xs font-bold">KA</span>
                  </div>
                </div>
              </div>
              {/* Feed mockup */}
              <div className="p-4 space-y-3 bg-gray-50/50">
                {[
                  { type: "Sujet d'examen", color: "bg-orange-100 text-orange-600", name: "Konan Aya", school: "UVCI", likes: "47", comments: "12", content: "Sujet de Bases de Données — Master 1 · Prof. Kobenan · 2024" },
                  { type: "Document de cours", color: "bg-green-100 text-green-700", name: "Aminata C.", school: "FUPA", likes: "89", comments: "23", content: "Résumé complet du cours de Droit des Contrats — Licence 3" },
                  { type: "Événement", color: "bg-blue-100 text-blue-600", name: "Yao Koffi", school: "UFHB", likes: "156", comments: "34", content: "🎓 Conférence IA en Afrique — 15 juin à l'UVCI. Inscription gratuite !" },
                ].map((post, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          i === 0 ? "bg-orange-500" : i === 1 ? "bg-green-600" : "bg-blue-500"
                        }`}>
                          {post.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-gray-900">{post.name}</p>
                          <p className="text-xs text-gray-400">{post.school}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${post.color}`}>{post.type}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3 leading-relaxed">{post.content}</p>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">❤️ {post.likes}</span>
                      <span className="flex items-center gap-1">💬 {post.comments}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 hidden sm:flex items-center gap-2.5 bg-white rounded-2xl border border-gray-100 shadow-lg px-4 py-3"
            >
              <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">+2 500 ressources</p>
                <p className="text-[10px] text-gray-400">cette semaine</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [6, -6, 6] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-4 hidden sm:flex items-center gap-2.5 bg-white rounded-2xl border border-gray-100 shadow-lg px-4 py-3"
            >
              <div className="flex -space-x-2">
                {["bg-orange-400", "bg-green-500", "bg-blue-400"].map((c, i) => (
                  <div key={i} className={`h-7 w-7 rounded-full ${c} ring-2 ring-white`} />
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">10 000+ étudiants</p>
                <p className="text-[10px] text-gray-400">en ligne maintenant</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div key={s.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="text-center">
                <p className="font-display text-3xl sm:text-4xl font-black text-orange-500 mb-1">{s.value}</p>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-900 mb-4">
              Tout ce qu'il vous faut pour<br />
              <span className="gradient-text">briller dans vos études</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Une plateforme pensée par et pour les étudiants ivoiriens, avec des outils qui font vraiment la différence.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.07 }}
                className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`h-12 w-12 rounded-2xl ${f.iconBg} flex items-center justify-center mb-5 shadow-sm`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 mb-2 group-hover:text-orange-500 transition-colors">
                  {f.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────────── */}
      <section id="how" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-3">Simple & rapide</p>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-900 mb-4">
              Prêt en <span className="text-orange-500">2 minutes</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Créez votre profil", desc: "Renseignez votre filière, établissement et niveau. STUDY'S personnalise votre expérience.", icon: GraduationCap, color: "text-orange-500", bg: "bg-orange-50" },
              { step: "02", title: "Explorez & partagez", desc: "Publiez vos sujets d'examens et cours. Découvrez les ressources de milliers d'autres étudiants.", icon: FileText, color: "text-green-600", bg: "bg-green-50" },
              { step: "03", title: "Progressez ensemble", desc: "Ajoutez des amis, échangez en messages et réussissez vos examens avec la communauté.", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
            ].map((item, i) => (
              <motion.div key={item.step} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="text-center">
                <div className={`h-16 w-16 rounded-2xl ${item.bg} flex items-center justify-center mx-auto mb-5`}>
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                </div>
                <div className={`font-display text-5xl font-black ${item.color} opacity-20 -mb-6 select-none`}>{item.step}</div>
                <h3 className="font-display font-bold text-xl text-gray-900 mb-2 mt-4">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PWA SECTION ──────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-green-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div {...fadeUp}>
              <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">Application mobile</p>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-gray-900 mb-5">
                Installez STUDY'S<br />
                <span className="text-orange-500">directement sur votre téléphone</span>
              </h2>
              <p className="text-gray-500 mb-7 leading-relaxed">
                STUDY'S est une Progressive Web App. Ajoutez-la sur votre écran d'accueil depuis votre navigateur — sans passer par le Play Store ni l'App Store.
              </p>
              <div className="space-y-3 mb-8">
                {["Installation en un clic sur Android & iPhone", "Fonctionne même hors connexion", "Notifications push comme une vraie app", "Expérience plein écran fluide"].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
              >
                <Smartphone className="h-5 w-5" /> Essayer maintenant
              </Link>
            </motion.div>

            {/* Phone mockup */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="flex justify-center">
              <div className="relative w-60 h-[480px]">
                {/* Shadow */}
                <div className="absolute inset-4 bg-orange-200 rounded-[44px] blur-2xl opacity-30 translate-y-4" />
                {/* Phone */}
                <div className="relative w-60 h-[480px] bg-white rounded-[40px] border-4 border-gray-200 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-100 rounded-b-2xl z-10" />
                  {/* Status bar */}
                  <div className="bg-orange-500 h-1.5 w-full" />
                  {/* Content */}
                  <div className="p-3 mt-6 space-y-2.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-7 w-7 rounded-full ${i === 0 ? "bg-orange-400" : i === 1 ? "bg-green-500" : "bg-blue-400"}`} />
                          <div className="space-y-1">
                            <div className="h-2 w-14 bg-gray-200 rounded-full" />
                            <div className="h-1.5 w-10 bg-gray-100 rounded-full" />
                          </div>
                          <div className={`ml-auto h-4 w-16 rounded-full ${i === 0 ? "bg-orange-100" : i === 1 ? "bg-green-100" : "bg-blue-100"}`} />
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 bg-gray-200 rounded-full w-full" />
                          <div className="h-2 bg-gray-100 rounded-full w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom nav */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-gray-100 bg-white flex items-center justify-around px-4">
                    {[BookOpen, Users, MessageCircle, Bell].map((Icon, i) => (
                      <div key={i} className={`p-2 rounded-xl ${i === 0 ? "bg-orange-50" : ""}`}>
                        <Icon className={`h-5 w-5 ${i === 0 ? "text-orange-500" : "text-gray-300"}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ──────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">Témoignages</p>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-900">
              Ils font confiance à STUDY'S
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-gray-100 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-xl ${t.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">"{t.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(22,163,74,0.3),transparent_60%)]" />

        <motion.div {...fadeUp} className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
          <p className="text-orange-200 text-sm font-semibold uppercase tracking-widest mb-4">Rejoignez la communauté</p>
          <h2 className="font-display text-4xl sm:text-6xl font-black text-white mb-5">
            Commencez à briller<br />dès aujourd'hui
          </h2>
          <p className="text-orange-100 text-lg mb-10 max-w-lg mx-auto">
            Des milliers d'étudiants partagent déjà leurs ressources. Rejoignez-les maintenant — c'est gratuit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-orange-500 font-bold text-base px-8 py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:scale-95"
            >
              <Zap className="h-5 w-5" /> Créer mon compte gratuit
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-base px-8 py-4 rounded-2xl border-2 border-white/30 transition-all hover:-translate-y-0.5"
            >
              Se connecter
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-base">
              <span className="text-orange-400">STUDY</span>
              <span className="text-green-400">'S</span>
            </span>
            <span className="text-gray-600 text-sm">© 2026</span>
          </Link>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {[
              { label: "À propos",         href: "/about"   },
              { label: "Confidentialité",  href: "/privacy" },
              { label: "CGU",              href: "/terms"   },
              { label: "Contact",          href: "/contact" },
            ].map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <p className="text-xs text-gray-600 flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" /> Abidjan, Côte d'Ivoire 🇨🇮
          </p>
        </div>
      </footer>
    </div>
  );
}
