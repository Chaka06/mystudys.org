import type { Metadata } from "next";
import { Shield, AlertTriangle, Ban, Scale, Users, FileText, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Consultez les Conditions Générales d'Utilisation de STUDY'S, le réseau social étudiant ivoirien.",
  robots: { index: true, follow: false },
};

const Section = ({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) => (
  <section className="space-y-4">
    <div className={`flex items-center gap-3 pb-3 border-b-2 ${color}`}>
      <Icon className="h-5 w-5" />
      <h2 className="font-bold text-xl text-gray-900">{title}</h2>
    </div>
    <div className="space-y-3 text-gray-600 leading-relaxed">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-orange-200">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-gray-900">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-gray-500 text-sm">
          Dernière mise à jour : mai 2025 · Applicables à tous les utilisateurs de la plateforme STUDY'S
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 text-left">
          <strong>Important :</strong> En créant un compte STUDY'S, vous acceptez l'intégralité de ces conditions.
          Lisez-les attentivement avant toute inscription.
        </div>
      </div>

      {/* 1. Présentation */}
      <Section title="1. Présentation de STUDY'S" icon={Users} color="border-orange-300">
        <p>
          STUDY'S est le premier réseau social étudiant ivoirien, conçu exclusivement pour
          la communauté académique de Côte d'Ivoire — lycéens, étudiants, enseignants et
          membres du monde éducatif.
        </p>
        <p>
          La plateforme permet le partage de ressources académiques (sujets d'examens, cours,
          fiches de révision), la mise en relation entre étudiants, la messagerie privée et
          la participation à une communauté d'entraide intellectuelle.
        </p>
        <p>
          STUDY'S est développée et exploitée depuis Abidjan, Côte d'Ivoire. Son utilisation
          est soumise au droit ivoirien.
        </p>
      </Section>

      {/* 2. Éligibilité */}
      <Section title="2. Éligibilité et inscription" icon={Scale} color="border-blue-300">
        <p>
          Pour utiliser STUDY'S, vous devez :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Avoir au moins <strong>15 ans révolus</strong></li>
          <li>Être membre de la communauté académique (lycéen, étudiant, enseignant, chercheur)</li>
          <li>Fournir des informations exactes, complètes et à jour lors de l'inscription</li>
          <li>Être titulaire d'une adresse email valide et active</li>
          <li>Ne pas être sous le coup d'un bannissement antérieur sur STUDY'S</li>
        </ul>
        <p>
          Toute inscription effectuée avec de fausses informations entraîne la suppression
          immédiate du compte et l'impossibilité de recréer un compte sur la plateforme.
        </p>
      </Section>

      {/* 3. Règles de contenu */}
      <Section title="3. Règles de la communauté — Contenus interdits" icon={Shield} color="border-red-300">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
          <p className="font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Les contenus suivants sont strictement prohibés sur STUDY'S et entraînent des
            sanctions immédiates :
          </p>

          <div className="space-y-3">
            {[
              {
                titre: "Propos haineux et discriminatoires",
                desc: "Tout discours raciste, xénophobe, sexiste, homophobe, ou portant atteinte à une personne ou un groupe en raison de son origine, sa religion, son genre, son orientation sexuelle, son handicap ou toute autre caractéristique protégée. STUDY'S est une plateforme ouverte à tous les étudiants ivoiriens, quelle que soit leur origine ou leur croyance.",
              },
              {
                titre: "Incitation à la haine religieuse",
                desc: "Tout contenu dénigrant, moquant ou attaquant une religion, ses fidèles ou ses pratiques. La diversité religieuse est respectée sur STUDY'S. Les débats académiques sur les religions restent autorisés dans le cadre du respect et de la bienséance.",
              },
              {
                titre: "Contenus à caractère pornographique ou sexuel explicite",
                desc: "Toute image, vidéo, texte ou lien à caractère pornographique ou sexuellement explicite est formellement interdit. STUDY'S est une plateforme académique destinée aux jeunes à partir de 15 ans.",
              },
              {
                titre: "Maltraitance animale",
                desc: "Tout contenu représentant, décrivant ou faisant l'apologie de la cruauté envers les animaux, qu'il s'agisse d'images, de vidéos ou de textes.",
              },
              {
                titre: "Exposition et exploitation des enfants",
                desc: "Tout contenu mettant en scène des mineurs de manière inappropriée, sexuelle ou pouvant porter atteinte à leur dignité ou leur sécurité. Ce type de contenu sera immédiatement signalé aux autorités compétentes.",
              },
              {
                titre: "Incitation à la rébellion et aux émeutes",
                desc: "Tout contenu appelant à la violence, à la désobéissance civile violente, à des mouvements insurrectionnels, ou cherchant à galvaniser les foules à des fins de troubles à l'ordre public. STUDY'S se distingue des plateformes politiques et refuse d'être un vecteur de déstabilisation sociale.",
              },
              {
                titre: "Harcèlement, menaces et intimidation",
                desc: "Tout message, commentaire ou publication visant à intimider, menacer, humilier ou harceler un autre utilisateur, qu'il s'agisse de propos publics ou de messages privés.",
              },
              {
                titre: "Désinformation et contenus trompeurs",
                desc: "La diffusion volontaire de fausses informations, de faux sujets d'examens, de documents falsifiés ou de contenus conçus pour induire en erreur la communauté estudiantine.",
              },
              {
                titre: "Spam et contenu commercial non autorisé",
                desc: "La publication répétée de messages identiques, de publicités non autorisées, de liens d'affiliation ou de contenu à des fins purement commerciales sans accord préalable de STUDY'S.",
              },
              {
                titre: "Atteinte aux droits d'auteur",
                desc: "La publication de contenus protégés par le droit d'auteur sans autorisation de leur titulaire, notamment des manuels scolaires complets, des œuvres protégées ou des supports propriétaires.",
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border border-red-100">
                <p className="font-semibold text-gray-900 mb-1">🚫 {item.titre}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 4. Système de sanctions */}
      <Section title="4. Système de modération et sanctions" icon={AlertTriangle} color="border-amber-300">
        <p>
          STUDY'S applique une politique de tolérance zéro envers les comportements toxiques.
          Tout utilisateur qui enfreint les présentes règles est considéré comme un élément
          nuisible à la communauté estudiantine et sera sanctionné selon le système suivant :
        </p>

        <div className="space-y-4">
          {/* Niveau 1 */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-gray-900">1ère infraction — Avertissement officiel</h3>
            </div>
            <p className="text-gray-700 text-sm">
              La publication incriminée est supprimée immédiatement. L'utilisateur reçoit une
              notification d'avertissement officiel sur son compte STUDY'S, l'informant de la
              violation constatée et des conséquences en cas de récidive. Cette sanction est
              enregistrée dans son dossier sur la plateforme.
            </p>
          </div>

          {/* Niveau 2 */}
          <div className="bg-orange-50 border-l-4 border-orange-400 rounded-r-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⛔</span>
              <h3 className="font-bold text-gray-900">2ème infraction — Dernier avertissement</h3>
            </div>
            <p className="text-gray-700 text-sm">
              La publication est supprimée. L'utilisateur reçoit un dernier avertissement solennel
              l'informant que son compte est en grave danger. Il est clairement notifié qu'une
              troisième violation entraînera son bannissement définitif et irrévocable de STUDY'S.
            </p>
          </div>

          {/* Niveau 3 */}
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🚫</span>
              <h3 className="font-bold text-gray-900">3ème infraction — Bannissement définitif</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              Le compte est <strong>banni définitivement et irrévocablement</strong>. Toutes les
              publications de l'utilisateur sont supprimées. Ses informations personnelles
              (nom, email, numéro de téléphone, nom d'utilisateur) sont conservées dans notre
              base de données de comptes bannis afin de lui interdire définitivement tout
              accès à STUDY'S, même sous une nouvelle identité.
            </p>
            <p className="text-sm text-red-700 font-medium">
              ⚠️ Aucun appel ni demande de réactivation ne sera accepté pour les comptes bannis
              suite à la 3ème infraction.
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500 italic">
          STUDY'S se réserve également le droit de bannir immédiatement et sans avertissement
          tout compte dont le contenu constitue une infraction grave à la loi ivoirienne
          (exploitation d'enfants, appel à la violence physique, etc.). Dans de tels cas,
          les informations seront transmises aux autorités compétentes.
        </p>
      </Section>

      {/* 5. Bannissement et données */}
      <Section title="5. Conservation des données des comptes bannis" icon={Ban} color="border-red-400">
        <p>
          Conformément à notre engagement de protéger la communauté estudiantine, les informations
          des comptes bannis (email, numéro de téléphone, identifiants) sont conservées
          <strong> indéfiniment</strong> dans notre système de liste noire.
        </p>
        <p>
          Cette conservation a pour unique but d'empêcher les utilisateurs bannis de recréer
          un compte sous une nouvelle identité et de continuer à nuire à la communauté.
          Ces données ne sont pas utilisées à d'autres fins et ne sont jamais partagées avec
          des tiers.
        </p>
        <p>
          En acceptant les présentes CGU, vous reconnaissez et acceptez ce droit de
          conservation aux fins décrites ci-dessus.
        </p>
      </Section>

      {/* 6. Propriété intellectuelle */}
      <Section title="6. Propriété intellectuelle et contenus partagés" icon={Lock} color="border-green-300">
        <p>
          Les ressources académiques que vous partagez sur STUDY'S (sujets d'examens, cours,
          fiches) restent votre propriété ou celle de leurs auteurs originaux. En les publiant,
          vous accordez à STUDY'S une licence non exclusive et gratuite de diffusion au sein
          de la communauté.
        </p>
        <p>
          Vous garantissez avoir le droit de partager ces ressources. Le partage de documents
          protégés sans autorisation engage votre responsabilité personnelle.
        </p>
        <p>
          Les marques, logos et contenus propres à STUDY'S (interface, algorithme de
          recommandation, design) sont la propriété exclusive de STUDY'S et ne peuvent
          être reproduits sans autorisation écrite.
        </p>
      </Section>

      {/* 7. Responsabilités */}
      <Section title="7. Responsabilité et garanties" icon={Scale} color="border-gray-300">
        <p>
          STUDY'S met tout en œuvre pour garantir la qualité et la sécurité du service, mais
          ne peut être tenu responsable :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Des contenus publiés par les utilisateurs</li>
          <li>De l'exactitude des sujets d'examens et documents partagés</li>
          <li>Des interruptions temporaires de service</li>
          <li>Des pertes de données consécutives à des événements imprévisibles</li>
        </ul>
        <p>
          Chaque utilisateur est personnellement responsable des contenus qu'il publie
          et des interactions qu'il a sur la plateforme.
        </p>
      </Section>

      {/* 8. Modifications */}
      <Section title="8. Modifications des CGU" icon={FileText} color="border-gray-300">
        <p>
          STUDY'S se réserve le droit de mettre à jour les présentes CGU à tout moment pour
          s'adapter aux évolutions légales, technologiques ou de la communauté. Toute modification
          sera notifiée aux utilisateurs par notification dans l'application et/ou par email.
        </p>
        <p>
          La poursuite de l'utilisation de STUDY'S après notification vaut acceptation
          des nouvelles conditions.
        </p>
      </Section>

      {/* 9. Droit applicable */}
      <Section title="9. Droit applicable et juridiction" icon={Scale} color="border-gray-300">
        <p>
          Les présentes CGU sont régies par le droit ivoirien. Tout litige relatif à leur
          interprétation ou exécution sera soumis à la compétence exclusive des tribunaux
          d'Abidjan, République de Côte d'Ivoire.
        </p>
        <p>
          Pour toute question relative aux CGU : <strong>legal@mystudys.org</strong>
        </p>
      </Section>

      {/* Footer */}
      <div className="bg-gray-900 rounded-2xl p-6 text-center text-gray-400 text-sm">
        <p className="text-white font-bold mb-1">
          <span className="text-orange-400">STUDY</span>'S — Réseau Social Étudiant Ivoirien
        </p>
        <p>© 2026 STUDY'S · Abidjan, Côte d'Ivoire 🇨🇮</p>
        <p className="mt-2 text-xs">
          En utilisant STUDY'S, vous contribuez à construire une communauté estudiantine
          saine, bienveillante et tournée vers la réussite académique.
        </p>
      </div>
    </div>
  );
}
