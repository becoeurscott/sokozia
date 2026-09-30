import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/content/legal";

export const metadata = { title: "Conditions générales — Sokozia" };

export default function Page() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente" updated={LEGAL.updated}>
      <p>
        Les présentes conditions générales (les « Conditions ») régissent l&apos;accès et l&apos;utilisation du site {LEGAL.site} et du
        service de création de vidéos publicitaires par intelligence artificielle (le « Service ») proposé par {LEGAL.operator} (« Sokozia »,
        « nous »). En créant un compte, en cochant la case d&apos;acceptation ou en utilisant le Service, tu acceptes sans réserve les présentes
        Conditions et notre <Link href="/confidentialite" className="underline">Politique de confidentialité</Link>. Si tu n&apos;es pas d&apos;accord,
        n&apos;utilise pas le Service.
      </p>

      <h2>1. Le Service</h2>
      <p>
        Sokozia permet de créer des vidéos publicitaires de type UGC (« contenu créé par les utilisateurs ») à partir des informations et photos
        que tu fournis. Une assistante de création automatisée t&apos;accompagne en plusieurs étapes (fiche produit, créateur, lieu, script,
        vidéo). Les images, scripts et vidéos sont générés par des systèmes d&apos;intelligence artificielle fournis par des prestataires
        techniques.
      </p>
      <p>
        Les personnes, voix, lieux et situations présents dans les vidéos sont <b>entièrement générés par intelligence artificielle</b>. Ils ne
        représentent aucune personne réelle et ne constituent pas le témoignage d&apos;un vrai client.
      </p>

      <h2>2. Compte</h2>
      <ul>
        <li>Tu dois avoir au moins 18 ans et la capacité de conclure un contrat. Si tu agis pour une entreprise, tu déclares avoir le pouvoir de l&apos;engager.</li>
        <li>Les informations de ton compte doivent être exactes et à jour. Tu es responsable de la confidentialité de ton mot de passe et de toute activité réalisée depuis ton compte.</li>
        <li>Préviens-nous immédiatement à {LEGAL.email} en cas d&apos;utilisation non autorisée de ton compte.</li>
      </ul>

      <h2>3. Nature des contenus générés</h2>
      <ul>
        <li>L&apos;intelligence artificielle peut produire des résultats imparfaits, inexacts ou différents de ce qui était attendu (par exemple un texte d&apos;étiquette mal reproduit, un geste peu naturel, une prononciation approximative). Le Service est fourni « en l&apos;état », sans garantie que les résultats répondent à un besoin particulier.</li>
        <li>Chaque étape doit être <b>relue et validée par toi</b> avant de passer à la suivante. En validant une étape ou en lançant une vidéo, tu confirmes que le contenu te convient.</li>
        <li>Tu es seul responsable de vérifier la conformité d&apos;une vidéo avant de la publier, notamment l&apos;exactitude des promesses faites sur ton produit.</li>
      </ul>

      <h2>4. Propriété intellectuelle</h2>
      <h3>4.1 Contenus générés</h3>
      <p>
        Tous les contenus générés via le Service (images, fiches produit, fiches personnage, photos de lieux, scripts, vidéos, sons, ainsi que les
        prompts et paramètres de création) sont et restent la <b>propriété exclusive de Sokozia</b>, dans toute la mesure permise par la loi.
        Sokozia peut librement les conserver, reproduire, modifier, adapter, diffuser, réutiliser et exploiter, pour tout usage et sur tout support,
        notamment à des fins de démonstration, de promotion, d&apos;amélioration du Service ou de création d&apos;autres contenus, sans rémunération.
      </p>
      <p>
        Lorsqu&apos;un contenu reproduit ton produit, ta marque ou ton logo, Sokozia ne le diffusera pas d&apos;une manière qui laisserait croire à un
        partenariat officiel avec toi sans ton accord, et retirera d&apos;une diffusion publique tout contenu contenant ta marque sur simple demande à
        {" "}{LEGAL.email}.
      </p>
      <h3>4.2 Licence qui t&apos;est accordée</h3>
      <p>
        Pour chaque vidéo que tu as payée (ou obtenue via un pack), Sokozia t&apos;accorde une licence <b>non exclusive, mondiale, pour toute la durée
        des droits</b>, de l&apos;utiliser, la reproduire et la diffuser pour la promotion de tes produits et services (réseaux sociaux, publicités,
        site internet, messageries, points de vente). Tu peux la couper, la sous-titrer ou la recadrer. Tu ne peux pas la revendre, la céder, la
        proposer dans une banque de contenus ni l&apos;utiliser pour entraîner un système d&apos;intelligence artificielle.
      </p>
      <h3>4.3 Contenus que tu fournis</h3>
      <p>
        Tu conserves tes droits sur les photos, logos, noms de marque et textes que tu fournis (« Contenus fournis »). Tu accordes à Sokozia une
        licence non exclusive, mondiale et gratuite pour les utiliser, les transmettre à nos prestataires techniques et les intégrer dans les
        contenus générés, dans la mesure nécessaire au fonctionnement, à la sécurité et à l&apos;amélioration du Service, ainsi qu&apos;à l&apos;exploitation
        des contenus générés prévue à l&apos;article 4.1.
      </p>
      <h3>4.4 Le site</h3>
      <p>Le site, sa marque « Sokozia », son design, ses textes et son code sont protégés. Toute reproduction non autorisée est interdite.</p>

      <h2>5. Tes engagements</h2>
      <p>Tu garantis que :</p>
      <ul>
        <li>tu détiens tous les droits nécessaires sur les Contenus fournis (photos, marques, logos, textes) ou l&apos;autorisation de leurs titulaires ;</li>
        <li>ton produit ou service est licite dans les pays où tu le vends et le promeus ;</li>
        <li>les informations sur ton produit sont exactes, et tu ne feras pas dire à une vidéo des promesses fausses, trompeuses ou interdites (par exemple guérir une maladie, garantir un gain d&apos;argent) ;</li>
        <li>tu respecteras les règles publicitaires applicables (santé, cosmétiques, alimentation, alcool, jeux, finance…) et les conditions des plateformes sur lesquelles tu publies, y compris leurs règles d&apos;indication des contenus générés par IA.</li>
      </ul>

      <h2>6. Utilisations interdites</h2>
      <p>Il est interdit d&apos;utiliser le Service pour créer ou tenter de créer des contenus :</p>
      <ul>
        <li>imitant ou représentant une personne réelle identifiable (célébrité, personnalité politique, particulier) sans son accord écrit, ou faisant croire qu&apos;une vraie personne recommande un produit ;</li>
        <li>à caractère sexuel, impliquant des mineurs de quelque façon que ce soit, violents, haineux, discriminatoires, diffamatoires ou harcelants ;</li>
        <li>promouvant des produits ou activités illégaux, dangereux ou réglementés sans autorisation (médicaments, armes, drogues, contrefaçons, faux diplômes, arnaques, pyramides financières…) ;</li>
        <li>trompeurs, notamment de faux témoignages présentés comme réels, de fausses informations ou de la désinformation politique ;</li>
        <li>portant atteinte aux droits d&apos;un tiers (marque, droit d&apos;auteur, image, vie privée).</li>
      </ul>
      <p>
        Il est aussi interdit de contourner les limites du Service, d&apos;automatiser son utilisation, de tenter d&apos;accéder aux systèmes ou aux modèles
        utilisés, ou de revendre le Service. Sokozia peut refuser une demande, supprimer un contenu, suspendre ou fermer un compte en cas de
        manquement ou de risque, sans préavis ni remboursement des sommes déjà consommées.
      </p>

      <h2>7. Prix et paiement</h2>
      <ul>
        <li>Le prix d&apos;une pub dépend du style et de la durée choisis. Il est affiché en toutes lettres avant chaque paiement, en monnaie locale.</li>
        <li>Offres : <b>1 pub</b>, <b>pack de 5 pubs</b> ou <b>abonnement mensuel</b>. Un pack ou un abonnement donne droit à un nombre de pubs d&apos;un style et d&apos;une durée précis. L&apos;abonnement mensuel est valable 30 jours à compter du paiement ; les pubs non utilisées à la fin de cette période sont perdues. Il n&apos;est <b>pas renouvelé automatiquement</b>.</li>
        <li>Le paiement se fait par Mobile Money via notre prestataire de paiement pawaPay. Tu dois utiliser un compte Mobile Money dont tu es titulaire ou que tu es autorisé à utiliser. Les éventuels frais de ton opérateur restent à ta charge.</li>
        <li>L&apos;achat est définitif dès confirmation du paiement par l&apos;opérateur. Pour « 1 pub » lancée depuis le studio, la création démarre automatiquement après confirmation.</li>
        <li>Chaque projet inclut un nombre limité de nouvelles versions par étape (actuellement 3). Au-delà, l&apos;étape doit être validée en l&apos;état.</li>
        <li>Nous pouvons modifier nos prix à tout moment ; les achats déjà confirmés ne sont pas affectés.</li>
      </ul>

      <h2>8. Remboursements et réclamations</h2>
      <ul>
        <li>Le Service est un contenu numérique fourni immédiatement à ta demande. En lançant une création, tu demandes son exécution immédiate et reconnais que les sommes correspondantes ne sont <b>pas remboursables</b>, sauf disposition légale impérative contraire.</li>
        <li>Si la création d&apos;une vidéo échoue pour une raison technique, la pub <b>n&apos;est pas décomptée</b> : elle est automatiquement rendue à ton pack ou peut être relancée gratuitement.</li>
        <li>Si tu as été débité sans recevoir ton achat, écris-nous à {LEGAL.email} dans les 30 jours avec la date, le montant et le numéro utilisé. Après vérification auprès de notre prestataire de paiement, nous activons ton achat ou te remboursons sur le même compte Mobile Money.</li>
        <li>Une vidéo générée ne peut pas être contestée au seul motif qu&apos;elle ne correspond pas à tes goûts, puisque chaque étape a été validée par toi.</li>
      </ul>

      <h2>9. Disponibilité du Service</h2>
      <p>
        Nous faisons nos meilleurs efforts pour que le Service soit accessible, sans garantie de disponibilité continue. Il dépend de prestataires
        techniques (hébergement, intelligence artificielle, paiement, opérateurs) et peut être interrompu pour maintenance, panne ou raison de
        sécurité. Nous pouvons faire évoluer, remplacer ou arrêter tout ou partie des fonctionnalités, styles ou technologies utilisés. En cas
        d&apos;arrêt définitif du Service, les pubs payées et non utilisées seront remboursées au prorata.
      </p>

      <h2>10. Responsabilité</h2>
      <ul>
        <li>Tu es seul responsable de l&apos;usage et de la diffusion des vidéos, de ton produit, de tes Contenus fournis et des promesses faites dans tes publicités.</li>
        <li>Sokozia n&apos;est pas responsable des dommages indirects, tels que perte de chiffre d&apos;affaires, de clients, de données ou d&apos;image, ni des décisions des plateformes (refus ou suppression d&apos;une publicité, suspension d&apos;un compte).</li>
        <li>Dans tous les cas, la responsabilité totale de Sokozia au titre du Service est <b>limitée aux sommes que tu as payées au cours des 3 mois précédant le fait générateur</b>.</li>
        <li>Ces limites ne s&apos;appliquent pas en cas de faute lourde ou intentionnelle, ni lorsque la loi l&apos;interdit.</li>
      </ul>

      <h2>11. Garantie</h2>
      <p>
        Tu t&apos;engages à indemniser et défendre Sokozia contre toute réclamation, action ou sanction d&apos;un tiers ou d&apos;une autorité (y compris les frais
        d&apos;avocat raisonnables) liée à tes Contenus fournis, à ton produit, à la diffusion que tu fais des vidéos ou au non-respect des présentes
        Conditions.
      </p>

      <h2>12. Durée et résiliation</h2>
      <p>
        Tu peux fermer ton compte à tout moment en écrivant à {LEGAL.email}. Les pubs restantes dans un pack sont alors perdues. Les articles 4
        (propriété), 8, 10, 11 et 14 restent applicables après la fermeture du compte. La licence sur les vidéos déjà obtenues (article 4.2) est
        maintenue, sauf fermeture pour manquement grave.
      </p>

      <h2>13. Modifications</h2>
      <p>
        Nous pouvons modifier les présentes Conditions. La version en vigueur est celle publiée sur le site, avec sa date de mise à jour. En cas de
        changement important, nous t&apos;en informerons par e-mail ou sur le site. Continuer à utiliser le Service après cette information vaut
        acceptation des nouvelles Conditions.
      </p>

      <h2>14. Droit applicable et litiges</h2>
      <p>
        Les présentes Conditions sont régies par le droit ivoirien et les Actes uniformes de l&apos;OHADA. En cas de différend, tu t&apos;engages à nous
        écrire d&apos;abord à {LEGAL.email} afin de rechercher une solution amiable dans un délai de 30 jours. À défaut d&apos;accord, le litige sera porté
        devant les juridictions compétentes d&apos;{LEGAL.city} ({LEGAL.country}), sous réserve des règles impératives protégeant les consommateurs.
      </p>
      <p>
        Si une clause est jugée invalide, les autres restent applicables. Le fait de ne pas exercer un droit ne vaut pas renonciation. En cas de
        traduction, la version française fait foi.
      </p>

      <h2>15. Contact</h2>
      <p>Pour toute question, réclamation ou demande : <a href={`mailto:${LEGAL.email}`} className="underline">{LEGAL.email}</a></p>
    </LegalPage>
  );
}
