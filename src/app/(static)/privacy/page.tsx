import type { Metadata } from "next";
import { Lock, Eye, Database, Shield, UserX, Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité de STUDY'S — comment nous collectons, utilisons et protégeons vos données personnelles.",
  robots: { index: true, follow: false },
};

const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
      <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
        <Icon className="h-4 w-4 text-orange-600" />
      </div>
      <h2 className="font-bold text-xl text-gray-900">{title}</h2>
    </div>
    <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      <div className="space-y-3">
        <h1 className="text-3xl font-black text-gray-900">Politique de confidentialité</h1>
        <p className="text-gray-500 text-sm">
          Dernière mise à jour : mai 2025 · STUDY'S s'engage à protéger vos données personnelles.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <strong>Notre engagement :</strong> Vos données personnelles ne sont jamais vendues,
          louées ou partagées à des fins commerciales avec des tiers.
        </div>
      </div>

      <Section title="1. Données collectées" icon={Database}>
        <p>
          Lors de votre inscription et utilisation de STUDY'S, nous collectons les données suivantes :
        </p>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-800 mb-2">Données d'identité</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Photo de profil (facultative)</li>
              <li>Nom d'utilisateur choisi</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-800 mb-2">Données académiques</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Niveau académique (Terminale, BTS, Licence, Master, Doctorat)</li>
              <li>Filière d'études</li>
              <li>Établissement scolaire ou universitaire</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-800 mb-2">Données d'activité</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Publications, commentaires, likes et sauvegardes</li>
              <li>Messages privés (chiffrés en transit)</li>
              <li>Relations d'amitié sur la plateforme</li>
              <li>Documents et images partagés</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-800 mb-2">Données techniques</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Adresse IP et type d'appareil</li>
              <li>Navigateur et système d'exploitation</li>
              <li>Données de session et cookies d'authentification</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="2. Utilisation de vos données" icon={Eye}>
        <p>Vos données sont utilisées exclusivement pour :</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Vous fournir l'accès au service STUDY'S et maintenir votre compte</li>
          <li>Personnaliser votre fil d'actualité selon votre filière et votre établissement</li>
          <li>Vous suggérer des contacts et des ressources académiques pertinentes</li>
          <li>Vous envoyer des notifications relatives à votre activité sur la plateforme</li>
          <li>Assurer la sécurité et l'intégrité de la plateforme</li>
          <li>Améliorer nos services et développer de nouvelles fonctionnalités</li>
          <li>Appliquer nos Conditions Générales d'Utilisation en cas de violation</li>
        </ul>
      </Section>

      <Section title="3. Partage et visibilité des données" icon={Bell}>
        <p>
          Selon vos paramètres de confidentialité, certaines informations sont visibles
          par les autres utilisateurs de STUDY'S :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 rounded-tl-lg">Donnée</th>
                <th className="text-left p-3">Profil public</th>
                <th className="text-left p-3 rounded-tr-lg">Profil privé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["Nom et photo", "✅ Visible", "✅ Visible"],
                ["Établissement et filière", "✅ Visible", "✅ Visible"],
                ["Publications", "✅ Visible par tous", "👤 Amis seulement"],
                ["Liste d'amis", "✅ Visible", "🔒 Privée"],
                ["Email et téléphone", "🔒 Jamais visible", "🔒 Jamais visible"],
                ["Messages privés", "🔒 Jamais visible", "🔒 Jamais visible"],
              ].map(([data, pub, priv]) => (
                <tr key={data} className="bg-white">
                  <td className="p-3 font-medium text-gray-700">{data}</td>
                  <td className="p-3 text-gray-600">{pub}</td>
                  <td className="p-3 text-gray-600">{priv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          Vous pouvez modifier la visibilité de votre profil à tout moment dans{" "}
          <strong>Paramètres → Confidentialité</strong>.
        </p>
      </Section>

      <Section title="4. Données de modération et comptes bannis" icon={UserX}>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-semibold text-amber-800 mb-2">
            Cas particulier : conservation pour les comptes bannis
          </p>
          <p className="text-amber-700 text-sm">
            Conformément à nos CGU, les informations des comptes bannis définitivement
            (email, numéro de téléphone, nom d'utilisateur) sont conservées <strong>indéfiniment</strong>{" "}
            dans notre liste noire. Cette conservation a pour unique but d'empêcher la
            recréation d'un compte et de protéger la communauté. Ces données ne sont
            jamais partagées et servent exclusivement à cette fin de sécurité.
          </p>
        </div>
        <p>
          En dehors de ce cas particulier, vos données sont conservées tant que votre
          compte est actif. Vous pouvez demander la suppression complète de votre compte
          et de toutes vos données à tout moment à <strong>privacy@mystudys.org</strong>.
        </p>
      </Section>

      <Section title="5. Sécurité des données" icon={Shield}>
        <p>Vos données sont protégées par plusieurs couches de sécurité :</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Hébergement via <strong>Supabase</strong> (infrastructure PostgreSQL avec chiffrement au repos)</li>
          <li>Mots de passe hachés avec <strong>bcrypt</strong> — jamais stockés en clair</li>
          <li>Communications sécurisées via <strong>HTTPS/TLS</strong></li>
          <li>Politiques d'accès Row Level Security (RLS) sur toutes les tables</li>
          <li>Authentification à deux facteurs (OTP par email) disponible</li>
          <li>Journalisation des accès suspects et alertes automatiques</li>
        </ul>
        <p className="text-sm text-gray-500">
          En cas de violation de données détectée, les utilisateurs concernés seront
          informés dans les 72 heures conformément aux bonnes pratiques en vigueur.
        </p>
      </Section>

      <Section title="6. Cookies" icon={Lock}>
        <p>
          STUDY'S utilise uniquement des cookies strictement nécessaires au fonctionnement :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Cookie de session</strong> : maintient votre connexion sécurisée</li>
          <li><strong>Cookie de préférences</strong> : mémorise votre thème (clair/sombre)</li>
        </ul>
        <p>
          <strong>Aucun cookie publicitaire, aucun cookie de tracking tiers</strong> n'est
          utilisé sur STUDY'S. Votre navigation n'est pas revendue à des régies publicitaires.
        </p>
      </Section>

      <Section title="7. Vos droits" icon={Eye}>
        <p>Conformément aux lois applicables, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles</li>
          <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
          <li><strong>Droit à l'effacement</strong> : supprimer votre compte et vos données</li>
          <li><strong>Droit à la portabilité</strong> : exporter vos données dans un format lisible</li>
          <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements de données</li>
        </ul>
        <p>
          Pour exercer ces droits : <strong>privacy@mystudys.org</strong>
          <br />
          <span className="text-sm text-gray-500">Nous répondons dans un délai maximum de 30 jours.</span>
        </p>
      </Section>

      <Section title="8. Contact" icon={Lock}>
        <p>
          Pour toute question relative à cette politique de confidentialité :
        </p>
        <ul className="list-none space-y-1">
          <li>📧 <strong>privacy@mystudys.org</strong></li>
          <li>📍 STUDY'S — Abidjan, Côte d'Ivoire</li>
        </ul>
      </Section>

      <div className="bg-gray-50 rounded-2xl p-6 text-center text-sm text-gray-500">
        <p>© 2026 STUDY'S · Abidjan, Côte d'Ivoire 🇨🇮</p>
        <p className="mt-1">Votre vie privée est notre priorité.</p>
      </div>
    </div>
  );
}
