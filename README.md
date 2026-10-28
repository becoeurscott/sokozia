# Sokozia

Studio de vidéos pub UGC par IA, pour les commerces d'Afrique francophone.
Chat-style studio (une seule boîte de prompt, "Créer la vidéo"), 16 créateurs
africains. Claude est la directrice de création (script + mise en scène),
Seedance 2.0 tourne la vidéo, en 15 ou 30 s. Paiement à la vidéo par Mobile
Money : pas de pack, pas d'abonnement, pas de solde.

- **Front / API** : Next.js 15 (App Router), Tailwind 4, lucide-react
- **Auth, base, fichiers** : [InsForge](https://insforge.dev) (`@insforge/sdk`)
- **Directrice de création** : Claude (`@anthropic-ai/sdk`, `claude-opus-5-5`)
- **Vidéo** : [Higgsfield API](https://docs.higgsfield.ai), Seedance 2.0 reference-to-video
- **Assemblage 30 s** : ffmpeg (`ffmpeg-static`)
- **Paiement** : [pawaPay](https://docs.pawapay.io) v2, page de paiement hébergée
- **Hébergement** : Hostinger (Node.js web app)

## Démarrer en local (sans aucune clé)

```bash
cp .env.example .env     # MOCK_PROVIDERS=1 par défaut
npm install
npm run dev
```

Ouvre http://localhost:3000/studio. Sans InsForge configuré, les données vont
dans `.data/db.json` et les fichiers dans `.data/files/`. Le paiement passe par
un simulateur (`/paiement/simulateur`) et la vidéo est un extrait de démo
rendu en ~10 s. Tout le parcours (inscription → brief → paiement → vidéo →
bibliothèque) fonctionne ainsi. Écris « échec » dans le prompt pour tester une
vidéo qui échoue et sa relance gratuite.

## InsForge (en place)

Le projet InsForge **sokozia** (`h8fj6hqu`, eu-central) est **partagé** avec
l'app précédente, qui y garde ses propres tables (`profiles`, `messages`,
`videos`, `wallets`…). Pour ne jamais les toucher, toutes les tables de cette
app sont préfixées `sz_` et ses buckets `sz-` :

- tables : `sz_threads`, `sz_messages`, `sz_generations`, `sz_orders`,
  `sz_uploads`, `sz_webhook_events` (migration
  `migrations/20261028141856_sz-studio-init.sql`, déjà appliquée) ;
- buckets publics : `sz-uploads`, `sz-outputs` ;
- le préfixe est ajouté dans `lib/db/insforge.ts` et `lib/storage.ts`
  (`INSFORGE_TABLE_PREFIX`, `INSFORGE_BUCKET_PREFIX` pour changer).

L'auth est commune aux deux apps : un compte créé ici fonctionne là-bas et
inversement. L'inscription envoie un **code** par email (réglage du projet) ;
le formulaire demande ce code puis connecte la personne.

Mise en place sur une nouvelle machine :

1. `npx -y @insforge/cli link --project-id 32123d64-d2dc-4255-9d8d-3130974f7004 --org-id 44e0f37f-c05d-46d2-a799-42532ebf19bf`
2. Renseigne dans `.env` : `NEXT_PUBLIC_INSFORGE_URL`,
   `NEXT_PUBLIC_INSFORGE_ANON_KEY` (`secrets get ANON_KEY`) et
   `INSFORGE_API_KEY` (clé admin, côté serveur uniquement).
3. Vérifie : `node --env-file=.env scripts/check-insforge.mjs` (écrit, lit et
   supprime une ligne dans chaque table `sz_`, sans rien laisser).
4. Nouvelle migration : `npx -y @insforge/cli db migrations new <nom>` puis
   `db migrations up <fichier>` (toujours un fichier précis, jamais `--all`,
   pour ne pas rejouer les migrations de l'autre app).

`insforge/migrations/0001_init.sql` reste le schéma sans préfixe d'un projet
InsForge dédié. Optionnel : `INSFORGE_SCRIPT_MODEL`, le modèle Claude du
gateway InsForge, utilisé pour Awa seulement si `ANTHROPIC_API_KEY` est absente.

## Mettre en place Higgsfield (vidéo)

1. Crée une clé dans console.higgsfield.ai → `HF_API_KEY_ID`, `HF_API_KEY_SECRET`.
2. Les 16 créateurs sont dans `public/creators/<dossier>/` : `portrait.jpg`
   (cartes), `intro.mp4` (présentation avec voix) et `sheet.jpg`, la fiche
   personnage envoyée à Seedance comme référence d'identité à chaque vidéo.
   Ne les régénère pas : changer une fiche change le visage du créateur.
   En local (http), la fiche est lue sur le site en ligne pour que Higgsfield
   puisse la télécharger (`actorSheetUrl` dans `lib/actors.ts`).
3. `MOCK_PROVIDERS=0` et `NEXT_PUBLIC_APP_URL=https://sokozia.com`.
   Les webhooks arrivent sur `https://sokozia.com/api/webhooks/higgsfield`
   (passé en `?hf_webhook=` à chaque requête) ; le client sonde aussi
   `/api/generations/:id` toutes les 2,5 s en secours.

Modèle, durées et prix : `lib/models.ts` (`MODEL`). Seedance 2.0 rend 15 s au
maximum par requête : une pub de 30 s = deux clips de 15 s lancés en même temps
(même créateur, même décor, chacun avec sa moitié du script et son plan écrit
par Claude), puis assemblés avec ffmpeg (`lib/video/concat.ts`) et copiés dans
le bucket `outputs`. Sur Hostinger, `ffmpeg-static` télécharge le binaire à
l'installation ; sinon renseigne `FFMPEG_PATH`.

## Mettre en place Claude (directrice de création)

1. Crée une clé sur console.anthropic.com → `ANTHROPIC_API_KEY`.
2. Awa (`lib/agent/brief.ts`) appelle `claude-opus-5-5` (effort `low` pour
   rester rapide, sortie JSON structurée) et écrit : le script en français
   parlé, le lieu, et un plan caméra par clip de 15 s. `ANTHROPIC_DIRECTOR_MODEL`
   permet de changer de modèle.
3. Sans clé : gateway InsForge si configuré, sinon un script modèle.

## Mettre en place pawaPay (Mobile Money)

1. Token API dans le dashboard pawaPay → `PAWAPAY_API_TOKEN`, `PAWAPAY_ENV=sandbox` puis `production`.
2. Dans le dashboard, configure l'URL de callback : `https://sokozia.com/api/webhooks/pawapay`.
3. Test sandbox : numéro `237653456789` (MTN Cameroun) → COMPLETED,
   `237653456039` → PAYMENT_NOT_APPROVED (voir docs "test numbers").

Flux : `POST /v2/checkouts` → redirection vers la page pawaPay → retour sur
`/paiement/retour?order=…` qui sonde `/api/orders/:id` ; le callback et la
sonde sont tous deux idempotents (table `webhook_events`). Seule la première
transition vers `completed` lance la vidéo. Une vidéo payée qui échoue peut
être relancée sans frais sur la même commande (`/api/generations/:id/retry`).

Prix : `lib/models.ts` (`MODEL.prices`) : 2 540 FCFA les 15 s, 5 080 FCFA les 30 s
(2× le coût Higgsfield au prix catalogue, arrondi à un nombre pair). Conversion par pays : `lib/pricing.ts` (XAF/XOF à
parité, table fixe pour KES, NGN, CDF, GHS).

## Déployer sur Hostinger

1. Pousse le repo sur GitHub.
2. hPanel → Sites web → Ajouter → **Application Node.js** → Importer depuis GitHub.
   Framework détecté : Next.js. Node 22. Build `npm run build`, start `npm start`.
3. Variables d'environnement : copie celles de `.env` (avec `MOCK_PROVIDERS=0`,
   `NEXT_PUBLIC_APP_URL=https://sokozia.com`, `SESSION_SECRET` aléatoire).
4. Rattache le domaine sokozia.com, puis enregistre les deux URLs de webhook
   ci-dessus chez pawaPay (Higgsfield n'a rien à configurer).

## Arborescence

```
app/(marketing)      landing, /tarifs
app/(studio)/studio  shell chat (Nouvel agent, conversation, modèles)
app/api              auth, threads, generations, orders, uploads, webhooks
components/studio    Sidebar, Composer, BriefCard, VideoCard, dialogs…
lib/models.ts        Seedance 2.0, durées 15/30 s, prix
lib/pricing.ts       devises pawaPay par pays
lib/actors.ts        16 créateurs
lib/agent/brief.ts   Awa (Claude) : brief, script, plans par clip
lib/video/concat.ts  assemblage des clips (30 s)
lib/providers/*      higgsfield.ts, pawapay.ts, mock.ts
lib/services/*       generations, orders
lib/db/*             InsForge ou store JSON local
insforge/migrations  schéma SQL
public/creators      16 créateurs : portrait, intro vidéo, fiche personnage
```
