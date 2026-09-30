import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/content/legal";

export const metadata = { title: "Politique de confidentialité — Sokozia" };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" updated={LEGAL.updated}>
      <p>
        Cette politique explique quelles données personnelles nous collectons quand tu utilises {LEGAL.site} (le « Service »), pourquoi, avec qui
        nous les partageons et quels sont tes droits. Elle complète nos <Link href="/cgu" className="underline">Conditions générales</Link>. Elle
        est établie conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>{LEGAL.operator}. Contact pour toute question sur tes données : <a href={`mailto:${LEGAL.email}`} className="underline">{LEGAL.email}</a>.</p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><b>Compte</b> : nom ou nom de boutique, adresse e-mail, mot de passe (stocké chiffré, jamais lisible par nous), pays.</li>
        <li><b>Paiement</b> : numéro Mobile Money, opérateur, montant, devise, date et statut des paiements. Nous ne recevons ni ne stockons ton code secret Mobile Money.</li>
        <li><b>Projets</b> : informations sur tes produits, photos que tu envoies, messages échangés avec l&apos;assistante, choix et validations à chaque étape, scripts, images et vidéos générées.</li>
        <li><b>Données techniques</b> : adresse IP, type d&apos;appareil et de navigateur, dates de connexion et journaux techniques nécessaires à la sécurité.</li>
      </ul>
      <p>
        N&apos;envoie pas de données sensibles (santé, opinions, pièces d&apos;identité…) ni de photos de personnes réelles sans leur accord : le Service n&apos;en a
        pas besoin.
      </p>

      <h2>3. Pourquoi nous les utilisons</h2>
      <ul>
        <li><b>Fournir le Service</b> (exécution du contrat) : créer ton compte, générer tes contenus, gérer tes packs, te donner accès à tes vidéos.</li>
        <li><b>Paiements</b> (exécution du contrat et obligations légales) : encaisser, vérifier les paiements, traiter les réclamations, tenir notre comptabilité.</li>
        <li><b>Sécurité et prévention des abus</b> (intérêt légitime) : lutter contre la fraude, les contenus interdits et les usages abusifs.</li>
        <li><b>Amélioration du Service</b> (intérêt légitime) : analyser les usages, améliorer nos consignes de création et la qualité des vidéos.</li>
        <li><b>Communication</b> : t&apos;envoyer des messages liés à ton compte ; des offres commerciales seulement si tu l&apos;as accepté, avec possibilité de te désinscrire à tout moment.</li>
      </ul>

      <h2>4. Destinataires</h2>
      <p>Tes données ne sont <b>jamais vendues</b>. Elles sont accessibles à l&apos;équipe Sokozia habilitée et transmises uniquement à nos prestataires, dans la limite de ce dont ils ont besoin :</p>
      <ul>
        <li>hébergement, base de données et stockage des fichiers ;</li>
        <li>prestataires d&apos;intelligence artificielle, qui reçoivent tes descriptions, photos et scripts pour générer les contenus ;</li>
        <li>notre prestataire de paiement (pawaPay) et les opérateurs Mobile Money ;</li>
        <li>services d&apos;envoi d&apos;e-mails ;</li>
        <li>les autorités, lorsque la loi nous y oblige.</li>
      </ul>

      <h2>5. Transferts hors de Côte d&apos;Ivoire</h2>
      <p>
        Certains prestataires sont situés hors de Côte d&apos;Ivoire, notamment dans l&apos;Union européenne et aux États-Unis. Ces transferts sont nécessaires
        au fonctionnement du Service. Nous choisissons des prestataires qui offrent des garanties de sécurité et de confidentialité adaptées, et nous
        effectuons les formalités requises auprès de l&apos;autorité de protection (ARTCI).
      </p>

      <h2>6. Durée de conservation</h2>
      <ul>
        <li>Données de compte et de projets : tant que ton compte est actif, puis 1 an après sa fermeture.</li>
        <li>Données de paiement : 10 ans, pour nos obligations comptables et fiscales.</li>
        <li>Journaux techniques : 12 mois.</li>
        <li>Les contenus générés, propriété de Sokozia (voir nos Conditions générales), peuvent être conservés au-delà. Sur demande, nous retirons de toute diffusion publique ceux qui contiennent ta marque ou ton logo.</li>
      </ul>

      <h2>7. Sécurité</h2>
      <p>
        Connexion chiffrée (HTTPS), mots de passe chiffrés, accès aux données limités par des règles strictes, clés d&apos;accès aux prestataires
        conservées uniquement sur nos serveurs. Aucun système n&apos;étant infaillible, nous t&apos;informerons en cas de violation de données présentant un
        risque pour toi, comme le prévoit la loi.
      </p>

      <h2>8. Tes droits</h2>
      <p>
        Tu peux demander l&apos;accès à tes données, leur rectification, leur suppression, t&apos;opposer à certains traitements (notamment la prospection) ou
        en demander la limitation. Écris-nous à <a href={`mailto:${LEGAL.email}`} className="underline">{LEGAL.email}</a> depuis l&apos;adresse de ton compte ;
        nous répondons dans un délai d&apos;un mois. Nous pouvons conserver certaines données lorsque la loi l&apos;impose (paiements) ou pour nous défendre en cas
        de litige. Tu peux aussi saisir l&apos;ARTCI (Autorité de Régulation des Télécommunications/TIC de Côte d&apos;Ivoire).
      </p>

      <h2>9. Cookies</h2>
      <p>
        Nous utilisons uniquement les cookies nécessaires au fonctionnement du Service, en particulier pour garder ta session connectée. Aucun cookie
        publicitaire ni de suivi par des tiers n&apos;est déposé.
      </p>

      <h2>10. Mineurs</h2>
      <p>Le Service est réservé aux personnes de 18 ans et plus. Nous supprimons tout compte dont nous apprenons qu&apos;il appartient à un mineur.</p>

      <h2>11. Modifications</h2>
      <p>
        Nous pouvons mettre à jour cette politique. La date en haut de la page indique la dernière version. En cas de changement important, nous
        t&apos;en informerons par e-mail ou sur le site.
      </p>
    </LegalPage>
  );
}
